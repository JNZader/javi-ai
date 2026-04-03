# Quantization & Monitoring — Implementation Reference

## Scalar Quantization (INT8)

Simplest: map each float32 to int8. ~4x memory reduction, minimal recall loss.

```python
from qdrant_client import QdrantClient, models

client = QdrantClient(url="http://localhost:6333")

# Qdrant scalar quantization
client.create_collection(
    collection_name="documents",
    vectors_config=models.VectorParams(
        size=1024,
        distance=models.Distance.COSINE,
    ),
    quantization_config=models.ScalarQuantization(
        scalar=models.ScalarQuantizationConfig(
            type=models.ScalarType.INT8,
            quantile=0.99,        # Clip outliers beyond 99th percentile
            always_ram=True,      # Keep quantized vectors in RAM for speed
        ),
    ),
)

# Search with oversampling to recover recall lost to quantization
results = client.query_points(
    collection_name="documents",
    query=query_vector,
    limit=10,
    search_params=models.SearchParams(
        quantization=models.QuantizationSearchParams(
            rescore=True,       # Re-score with original vectors
            oversampling=2.0,   # Fetch 2x candidates, then re-rank
        ),
    ),
)
```

## Product Quantization (PQ)

Aggressive compression: ~32x memory reduction, larger recall loss. Use for very large datasets.

```python
client.create_collection(
    collection_name="documents_pq",
    vectors_config=models.VectorParams(
        size=1024,
        distance=models.Distance.COSINE,
    ),
    quantization_config=models.ProductQuantization(
        product=models.ProductQuantizationConfig(
            compression=models.CompressionRatio.X16,  # or X32, X64
            always_ram=True,
        ),
    ),
)
```

## Binary Quantization

Extreme compression: each dimension to 1 bit. ~32x reduction. Only works well with some embedding models (OpenAI, Cohere).

```python
client.create_collection(
    collection_name="documents_binary",
    vectors_config=models.VectorParams(
        size=1536,  # Works best with higher-dim models
        distance=models.Distance.COSINE,
    ),
    quantization_config=models.BinaryQuantization(
        binary=models.BinaryQuantizationConfig(
            always_ram=True,
        ),
    ),
)

# MUST use oversampling with binary quantization
results = client.query_points(
    collection_name="documents_binary",
    query=query_vector,
    limit=10,
    search_params=models.SearchParams(
        quantization=models.QuantizationSearchParams(
            rescore=True,
            oversampling=3.0,  # Higher oversampling needed for binary
        ),
    ),
)
```

## Memory Estimation

```python
def estimate_memory(
    num_vectors: int,
    dimensions: int,
    quantization: str = "none",
    hnsw_m: int = 16,
) -> dict:
    """Estimate memory usage for a vector index. Returns memory estimates in MB."""
    bytes_per_dim = {
        "none": 4,        # float32
        "int8": 1,        # scalar quantization
        "pq_x16": 0.25,   # product quantization 16x
        "pq_x32": 0.125,  # product quantization 32x
        "binary": 0.125,  # 1 bit per dim
    }

    bpd = bytes_per_dim.get(quantization, 4)

    # Vector storage
    vector_bytes = num_vectors * dimensions * bpd

    # HNSW graph overhead: each node stores ~2*M edges as 32-bit integers
    graph_bytes = num_vectors * 2 * hnsw_m * 4

    # Payload/metadata overhead (estimate 200 bytes per vector)
    payload_bytes = num_vectors * 200

    # Original vectors kept on disk for rescoring (if quantized)
    original_bytes = num_vectors * dimensions * 4 if quantization != "none" else 0

    total_ram = vector_bytes + graph_bytes + payload_bytes
    total_disk = original_bytes

    return {
        "vectors_ram_mb": vector_bytes / 1e6,
        "graph_ram_mb": graph_bytes / 1e6,
        "payload_ram_mb": payload_bytes / 1e6,
        "total_ram_mb": total_ram / 1e6,
        "original_disk_mb": total_disk / 1e6,
        "total_storage_mb": (total_ram + total_disk) / 1e6,
    }


# Examples:
# 1M vectors, 1024 dims, no quant:  ~4.2 GB RAM
# 1M vectors, 1024 dims, INT8:      ~1.3 GB RAM + 4 GB disk
# 10M vectors, 1024 dims, INT8:     ~13 GB RAM + 40 GB disk
# 10M vectors, 1024 dims, PQ x16:   ~3.8 GB RAM + 40 GB disk
```

## Performance Monitoring

```python
import time
from dataclasses import dataclass, field
from collections import defaultdict
import numpy as np


@dataclass
class SearchMetrics:
    """Track search performance metrics over time."""
    latencies: list[float] = field(default_factory=list)
    recalls: list[float] = field(default_factory=list)

    def record(self, latency_ms: float, recall: float | None = None):
        self.latencies.append(latency_ms)
        if recall is not None:
            self.recalls.append(recall)

    def summary(self) -> dict:
        lats = np.array(self.latencies) if self.latencies else np.array([0])
        return {
            "count": len(self.latencies),
            "p50_ms": float(np.percentile(lats, 50)),
            "p95_ms": float(np.percentile(lats, 95)),
            "p99_ms": float(np.percentile(lats, 99)),
            "mean_ms": float(np.mean(lats)),
            "mean_recall": float(np.mean(self.recalls)) if self.recalls else None,
        }


class SearchMonitor:
    """Monitor search quality across collections and time windows."""

    def __init__(self):
        self.metrics: dict[str, SearchMetrics] = defaultdict(SearchMetrics)

    def timed_search(self, search_fn, collection: str, **kwargs):
        """Execute a search and record latency."""
        start = time.perf_counter()
        results = search_fn(**kwargs)
        latency = (time.perf_counter() - start) * 1000
        self.metrics[collection].record(latency)
        return results

    def report(self) -> dict:
        return {name: metrics.summary() for name, metrics in self.metrics.items()}

    def alert_check(self, collection: str, p95_threshold_ms: float = 50) -> str | None:
        """Return an alert message if P95 latency exceeds threshold."""
        summary = self.metrics[collection].summary()
        if summary["p95_ms"] > p95_threshold_ms:
            return (
                f"ALERT: {collection} P95 latency {summary['p95_ms']:.1f}ms "
                f"exceeds threshold {p95_threshold_ms}ms"
            )
        return None
```

## Zero-Downtime Re-indexing (Blue-Green Collections)

```python
def zero_downtime_reindex(
    client: QdrantClient,
    old_collection: str,
    new_collection: str,
    alias: str,
    documents: list,
    embed_fn,
    batch_size: int = 100,
):
    """Re-index into a new collection, then swap the alias atomically.

    Applications should query the alias, not the collection name directly.
    """
    # 1. Create new collection with updated config
    client.create_collection(
        collection_name=new_collection,
        vectors_config=models.VectorParams(size=1024, distance=models.Distance.COSINE),
        hnsw_config=models.HnswConfigDiff(m=16, ef_construct=200),
    )

    # 2. Index all documents into new collection
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i + batch_size]
        embeddings = embed_fn([doc["text"] for doc in batch])
        points = [
            models.PointStruct(id=doc["id"], vector=emb, payload=doc)
            for doc, emb in zip(batch, embeddings)
        ]
        client.upsert(collection_name=new_collection, points=points)

    # 3. Verify new collection (spot check recall)
    # ... run verification queries ...

    # 4. Swap alias atomically
    client.update_collection_aliases(
        change_aliases_operations=[
            models.DeleteAliasOperation(
                delete_alias=models.DeleteAlias(alias_name=alias),
            ),
            models.CreateAliasOperation(
                create_alias=models.CreateAlias(
                    collection_name=new_collection,
                    alias_name=alias,
                ),
            ),
        ],
    )

    # 5. Delete old collection after confirmation
    # client.delete_collection(old_collection)  # Uncomment after verification
```
