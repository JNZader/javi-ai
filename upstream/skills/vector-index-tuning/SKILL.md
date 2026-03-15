---
name: vector-index-tuning
description: >
  Vector index optimization — HNSW tuning, quantization, and performance monitoring for production search.
  Trigger: When tuning vector database performance, choosing index types, or optimizing search latency and recall.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Core Principle

There is no universally optimal index configuration. Every choice is a tradeoff between recall, latency, memory, and build time. Benchmark on your actual data at your actual scale.

## Index Type Selection by Data Size

| Data Size | Recommended Index | Recall | Latency | Memory | Build Time |
|-----------|------------------|--------|---------|--------|------------|
| < 10K vectors | Flat (brute force) | 100% | Low | Low | None |
| 10K - 1M | HNSW | 95-99% | Very low | High | Moderate |
| 1M - 10M | HNSW + Quantization | 93-98% | Low | Medium | Moderate |
| 10M - 100M | IVF + PQ | 85-95% | Low | Low | High |
| 100M+ | DiskANN / IVF+PQ | 90-95% | Medium | Low | Very high |

### Decision Flowchart

```
Can all vectors fit in RAM?
├── Yes → Dataset < 10K? → Flat index (exact search)
│         └── No → HNSW (best recall/latency tradeoff)
└── No  → Need < 50ms latency? → IVF + Scalar Quantization
          └── No → IVF + Product Quantization or DiskANN
```

## HNSW Parameter Tuning

HNSW (Hierarchical Navigable Small Worlds) is the default choice for most workloads. Three key parameters:

### Parameter Reference

| Parameter | What It Controls | Range | Default | Higher Value Effect |
|-----------|-----------------|-------|---------|-------------------|
| `M` | Max connections per node | 8-64 | 16 | Better recall, more memory, slower build |
| `efConstruction` | Build-time search width | 64-512 | 200 | Better graph quality, slower build |
| `efSearch` | Query-time search width | 16-512 | 128 | Better recall, higher latency |

### Tuning Strategy

```python
"""
HNSW tuning workflow:
1. Start with defaults (M=16, efConstruction=200, efSearch=128)
2. Measure recall@10 and P95 latency on a test set
3. If recall < target: increase efSearch first (cheapest change)
4. If still not enough: increase M (requires rebuild)
5. If build is too slow: decrease efConstruction (last resort)
"""

# Qdrant example
from qdrant_client import QdrantClient, models

client = QdrantClient(url="http://localhost:6333")

# Create collection with HNSW params
client.create_collection(
    collection_name="documents",
    vectors_config=models.VectorParams(
        size=1024,          # Must match embedding dimension
        distance=models.Distance.COSINE,
        hnsw_config=models.HnswConfigDiff(
            m=16,                  # Connections per node
            ef_construct=200,      # Build-time search width
            full_scan_threshold=10000,  # Use flat search below this size
        ),
    ),
)
```

### Benchmarking HNSW Parameters

```python
import time
import numpy as np


def benchmark_hnsw(
    client,
    collection_name: str,
    test_queries: list[list[float]],
    ground_truth: list[list[str]],  # True top-k IDs for each query
    ef_search_values: list[int],
    k: int = 10,
) -> list[dict]:
    """Benchmark different efSearch values for recall vs latency tradeoff."""
    results = []

    for ef in ef_search_values:
        # Update search params
        client.update_collection(
            collection_name=collection_name,
            hnsw_config=models.HnswConfigDiff(ef=ef),
        )

        latencies = []
        recalls = []

        for query_vec, true_ids in zip(test_queries, ground_truth):
            start = time.perf_counter()
            hits = client.query_points(
                collection_name=collection_name,
                query=query_vec,
                limit=k,
            ).points
            latency = (time.perf_counter() - start) * 1000  # ms

            retrieved_ids = {h.id for h in hits}
            recall = len(retrieved_ids & set(true_ids[:k])) / k

            latencies.append(latency)
            recalls.append(recall)

        results.append({
            "ef_search": ef,
            "recall@10": np.mean(recalls),
            "p50_latency_ms": np.percentile(latencies, 50),
            "p95_latency_ms": np.percentile(latencies, 95),
            "p99_latency_ms": np.percentile(latencies, 99),
        })

    return results

# Typical results pattern:
# ef=32  → recall=0.91, p95=2ms
# ef=64  → recall=0.95, p95=3ms   ← good default
# ef=128 → recall=0.97, p95=5ms   ← recommended
# ef=256 → recall=0.99, p95=10ms  ← when recall is critical
# ef=512 → recall=0.995, p95=20ms ← diminishing returns
```

## Quantization Strategies

Reduce memory usage by compressing vectors. Three levels of compression:

### Scalar Quantization (INT8)

Simplest: map each float32 to int8. ~4x memory reduction, minimal recall loss.

```python
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

### Product Quantization (PQ)

Aggressive compression: ~32x memory reduction, larger recall loss. Use for very large datasets.

```python
# Qdrant product quantization
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

### Binary Quantization

Extreme compression: each dimension → 1 bit. ~32x reduction. Only works well with some embedding models (OpenAI, Cohere).

```python
# Qdrant binary quantization
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

### Quantization Comparison

| Method | Memory Reduction | Recall Impact | Best For |
|--------|-----------------|---------------|----------|
| None (float32) | 1x (baseline) | 100% | < 1M vectors |
| Scalar INT8 | ~4x | 98-99% | 1M-10M vectors |
| Product Quantization | ~16-32x | 90-95% | 10M+ vectors |
| Binary | ~32x | 85-95%* | High-dim embeddings |

*Binary quantization recall varies significantly by embedding model.

## Memory Estimation

```python
def estimate_memory(
    num_vectors: int,
    dimensions: int,
    quantization: str = "none",
    hnsw_m: int = 16,
) -> dict:
    """Estimate memory usage for a vector index.

    Returns memory estimates in MB.
    """
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

## Qdrant Optimization Profiles

```python
# High Recall Profile (default, recommended for most use cases)
client.create_collection(
    collection_name="high_recall",
    vectors_config=models.VectorParams(size=1024, distance=models.Distance.COSINE),
    hnsw_config=models.HnswConfigDiff(m=16, ef_construct=200),
    optimizer_config=models.OptimizersConfigDiff(
        indexing_threshold=20000,  # Start indexing after 20K points
    ),
)

# Low Latency Profile (sacrifice some recall for speed)
client.create_collection(
    collection_name="low_latency",
    vectors_config=models.VectorParams(size=1024, distance=models.Distance.COSINE),
    hnsw_config=models.HnswConfigDiff(m=12, ef_construct=128),
    quantization_config=models.ScalarQuantization(
        scalar=models.ScalarQuantizationConfig(type=models.ScalarType.INT8, always_ram=True),
    ),
)

# Memory-Optimized Profile (large datasets)
client.create_collection(
    collection_name="memory_opt",
    vectors_config=models.VectorParams(
        size=1024,
        distance=models.Distance.COSINE,
        on_disk=True,  # Store vectors on disk
    ),
    hnsw_config=models.HnswConfigDiff(m=12, ef_construct=128, on_disk=True),
    quantization_config=models.ScalarQuantization(
        scalar=models.ScalarQuantizationConfig(type=models.ScalarType.INT8, always_ram=True),
    ),
)
```

## pgvector HNSW Tuning

```sql
-- Create HNSW index with tuning parameters
CREATE INDEX ON documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 200);

-- Set search-time ef parameter (per session)
SET hnsw.ef_search = 128;  -- Default is 40, increase for better recall

-- Monitor index build progress
SELECT phase, blocks_done, blocks_total
FROM pg_stat_progress_create_index;

-- Check index size
SELECT pg_size_pretty(pg_relation_size('documents_embedding_idx'));

-- Analyze query performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, embedding <=> '[0.1, 0.2, ...]'::vector AS distance
FROM documents
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 10;
```

### pgvector Performance Tips

```sql
-- 1. Increase shared_buffers for better cache hit ratio
-- postgresql.conf: shared_buffers = '4GB'

-- 2. Use parallel workers for index builds
SET max_parallel_maintenance_workers = 4;

-- 3. Increase work_mem for sort operations
SET work_mem = '256MB';

-- 4. Use IVFFlat for datasets > 5M (faster build, lower recall)
CREATE INDEX ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 1000);  -- sqrt(num_rows) is a good starting point

-- Set probe count at query time
SET ivfflat.probes = 20;  -- Higher = better recall, more latency
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

## Re-indexing Strategies for Zero Downtime

### Blue-Green Collections

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

## Best Practices

1. **Start with HNSW** — it is the right choice for 90% of workloads under 10M vectors
2. **Tune efSearch before M** — efSearch is a query-time knob; M requires a full rebuild
3. **Always benchmark on YOUR data** — synthetic benchmarks do not predict real-world performance
4. **Use scalar INT8 quantization first** — 4x memory savings with <2% recall loss in most cases
5. **Monitor P95/P99, not mean latency** — tail latencies matter more than averages for user experience
6. **Use aliases for zero-downtime re-indexing** — never query collection names directly in application code
7. **Pre-filter with metadata** before vector search when possible — reduces search space dramatically
8. **Set `full_scan_threshold`** appropriately — small collections are faster with brute force than HNSW
9. **Keep original vectors for rescoring** when using quantization — the disk cost is worth the recall recovery
10. **Plan for growth** — if you expect 10x data growth, test at 10x now to avoid surprises

## Keywords
vector index, hnsw, ivf, quantization, qdrant, pgvector, performance tuning, recall, latency, reindexing, product quantization
