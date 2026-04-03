---
name: embedding-strategies
description: >
  Embedding model selection, optimization, and evaluation for search and RAG systems.
  Trigger: When choosing embedding models, optimizing embedding pipelines, or evaluating retrieval quality.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.1"
---

## Core Principle

The embedding model is the most impactful single decision in any RAG or search system. A better embedding model improves every downstream component — retrieval, reranking, and generation quality all follow.

## Model Comparison

| Model | Dims | Max Tokens | Strengths | Best For |
|-------|------|------------|-----------|----------|
| Voyage AI 3 | 1024 | 32K | Best overall for code + text | Claude apps, code search |
| Voyage AI 3 Lite | 512 | 32K | Fast, good quality/cost ratio | High-volume, cost-sensitive |
| OpenAI text-embedding-3-large | 3072* | 8191 | Matryoshka (variable dims) | Flexible dimension needs |
| OpenAI text-embedding-3-small | 1536* | 8191 | Good balance, low cost | General purpose |
| BGE-large-en-v1.5 | 1024 | 512 | Strong open-source | Self-hosted, privacy |
| E5-large-v2 | 1024 | 512 | Good at instruction-following | Query-doc asymmetric |
| all-MiniLM-L6-v2 | 384 | 256 | Tiny, fast | Edge/mobile, prototyping |
| Nomic Embed v1.5 | 768 | 8192 | Long context, open-source | Long documents, self-hosted |

*Matryoshka: can truncate to fewer dimensions with minimal quality loss.

## When to Reduce Dimensions (Matryoshka)

- **Storage constrained**: millions of embeddings, need to fit in RAM
- **Latency sensitive**: smaller vectors = faster distance computation
- **Cost sensitive**: less storage in vector DB = lower hosting cost
- **Never reduce for**: small datasets (<100K docs), when recall is critical

## Chunking Strategy Selection

| Document Type | Strategy | Chunk Size | Overlap |
|--------------|----------|------------|---------|
| Prose/articles | Token or sentence-based | 500-1500 tokens | 10-20% |
| Code | Language-aware (tree-sitter) | function/class | 0 |
| Markdown docs | Header-based | by section | 0 |
| Legal/contracts | Semantic | varies | 100 |
| FAQ/Q&A pairs | By question | per Q&A | 0 |

## Implementation References

- **Model-specific code** (Voyage AI, OpenAI, sentence-transformers, E5): `references/model-implementations.md`
- **Chunking implementations** (token, sentence, semantic, tree-sitter): `references/chunking-and-evaluation.md`
- **Evaluation framework** (precision@k, recall@k, MRR, NDCG): `references/chunking-and-evaluation.md`
- **Caching strategies** (disk-based embedding cache): `references/chunking-and-evaluation.md`

## Best Practices

1. **Match your embedding model to your data domain** — code-specific models for code, multilingual for multi-language
2. **Always normalize embeddings** before storing — cosine similarity requires unit vectors
3. **Use asymmetric models correctly** — queries and documents need different prefixes (E5, BGE)
4. **Batch embedding calls** — single-text API calls are 10-50x slower than batched
5. **Cache aggressively** — embeddings are deterministic; never recompute the same text twice
6. **Evaluate on YOUR data** — MTEB benchmarks are useful but your domain may differ significantly
7. **Consider Matryoshka models** when you need flexibility — start with more dims, reduce later
8. **Keep embedding model and vector index in sync** — changing the model requires re-indexing everything
9. **Log embedding latency and costs** — embedding is often the hidden bottleneck in RAG pipelines
10. **Prefer Voyage AI for Claude applications** — Anthropic-recommended, best code embeddings

## Critical Rules

1. ALWAYS specify input_type when using asymmetric models (Voyage AI, E5, BGE) — query vs document embeddings are different
2. NEVER change embedding models without re-indexing ALL existing vectors
3. Load reference files on-demand when you need implementation details — do not bloat context with code you will not use

## Keywords

embeddings, voyage ai, openai embeddings, sentence-transformers, chunking, vector search, bge, e5, matryoshka, code embeddings, retrieval evaluation
