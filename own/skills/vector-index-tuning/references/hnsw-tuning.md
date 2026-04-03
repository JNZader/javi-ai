# HNSW Tuning — Implementation Reference

## Qdrant HNSW Configuration

```python
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

## Benchmarking HNSW Parameters

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
# ef=256 �� recall=0.99, p95=10ms  ← when recall is critical
# ef=512 → recall=0.995, p95=20ms ← diminishing returns
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
