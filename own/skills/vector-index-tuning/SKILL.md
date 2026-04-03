---
name: vector-index-tuning
description: >
  Vector index optimization — HNSW tuning, quantization, and performance monitoring for production search.
  Trigger: When tuning vector database performance, choosing index types, or optimizing search latency and recall.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.1"
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
+-- Yes -> Dataset < 10K? -> Flat index (exact search)
|         +-- No -> HNSW (best recall/latency tradeoff)
+-- No  -> Need < 50ms latency? -> IVF + Scalar Quantization
          +-- No -> IVF + Product Quantization or DiskANN
```

## HNSW Parameter Reference

| Parameter | What It Controls | Range | Default | Higher Value Effect |
|-----------|-----------------|-------|---------|-------------------|
| `M` | Max connections per node | 8-64 | 16 | Better recall, more memory, slower build |
| `efConstruction` | Build-time search width | 64-512 | 200 | Better graph quality, slower build |
| `efSearch` | Query-time search width | 16-512 | 128 | Better recall, higher latency |

### Tuning Strategy

1. Start with defaults (M=16, efConstruction=200, efSearch=128)
2. Measure recall@10 and P95 latency on a test set
3. If recall < target: increase efSearch first (cheapest change, query-time only)
4. If still not enough: increase M (requires rebuild)
5. If build is too slow: decrease efConstruction (last resort)

- **Reference**: `references/hnsw-tuning.md` (Qdrant config, benchmarking code, optimization profiles, pgvector tuning)

## Quantization Strategies

| Method | Memory Reduction | Recall Impact | Best For |
|--------|-----------------|---------------|----------|
| None (float32) | 1x (baseline) | 100% | < 1M vectors |
| Scalar INT8 | ~4x | 98-99% | 1M-10M vectors |
| Product Quantization | ~16-32x | 90-95% | 10M+ vectors |
| Binary | ~32x | 85-95%* | High-dim embeddings |

*Binary quantization recall varies significantly by embedding model.

Key rules:
- Always use `rescore=True` with quantization to recover recall
- Use `oversampling=2.0` for INT8, `oversampling=3.0` for binary
- Binary quantization only works well with OpenAI/Cohere models

- **Reference**: `references/quantization-monitoring.md` (Qdrant quantization config, memory estimation, monitoring, re-indexing)

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

## Critical Rules

1. NEVER change HNSW M parameter without a full index rebuild — it corrupts the graph
2. ALWAYS use oversampling + rescoring when quantization is enabled — without it, recall drops significantly
3. Load reference files on-demand when you need implementation details — do not bloat context with code you will not use

## Keywords

vector index, hnsw, ivf, quantization, qdrant, pgvector, performance tuning, recall, latency, reindexing, product quantization
