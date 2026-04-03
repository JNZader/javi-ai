---
name: rag-advanced
description: >
  Advanced RAG patterns beyond basic retrieval — HyDE, reranking, hybrid search, and production strategies.
  Trigger: When building production RAG pipelines, improving retrieval quality, or evaluating RAG systems.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.1"
---

## Core Principle

Basic RAG (embed, retrieve, generate) gets you to 60% quality. The patterns below get you to 90%+. Always measure retrieval quality separately from generation quality.

## Available Patterns

### HyDE (Hypothetical Document Embeddings)

Generate a hypothetical answer first, embed it, then search. The hypothetical answer is closer in embedding space to real answers than the question is.

- **Use when**: question and answer are in different "language" (colloquial question, technical docs); direct embedding of short queries gives poor results
- **Do NOT use when**: documents are very short, or queries are already well-formed keyword searches
- **Reference**: `references/hyde-pattern.md`

### Parent Document Retriever

Retrieve small chunks for precision, return large chunks for context. Solves the fundamental chunk-size tradeoff.

- **Reference**: `references/retrieval-patterns.md`

### Multi-Query Retrieval

Generate multiple reformulations of the query to improve recall. Internally generates 3+ query variants and deduplicates results.

- **Reference**: `references/retrieval-patterns.md`

### Contextual Compression

Filter and compress retrieved documents to remove irrelevant parts before sending to LLM. Use a cheap model (Haiku) for compression.

- **Reference**: `references/retrieval-patterns.md`

### Hybrid Search with RRF (Reciprocal Rank Fusion)

Combine dense (semantic) and sparse (keyword) search. Dense misses keywords, sparse misses semantics; RRF gets both.

- **Reference**: `references/hybrid-search-reranking.md`

### Cross-Encoder Reranking

Two-stage retrieval: fast first-stage (bi-encoder), precise second-stage (cross-encoder). 20 candidates reranked to top 5 consistently beats retrieving top 5 directly.

- Options: Cohere Reranker (hosted), local cross-encoder (free, private)
- **Reference**: `references/hybrid-search-reranking.md`

### Document Chunking Strategies

Choose strategy based on document type: recursive for prose, header-based for markdown, semantic for legal/contracts, tree-sitter for code.

- **Reference**: `references/chunking-evaluation.md`

### RAG Evaluation

Evaluate retrieval (precision, recall) separately from generation (LLM-as-judge). See `references/chunking-evaluation.md`.

## Best Practices for Production RAG

1. **Separate retrieval from generation evaluation** — a perfect generator cannot fix bad retrieval
2. **Always rerank** — 20 candidates reranked to top 5 consistently beats retrieving top 5 directly
3. **Use hybrid search** — dense misses keywords, sparse misses semantics; RRF gets both
4. **Chunk with overlap** — 10-20% overlap prevents information loss at chunk boundaries
5. **Store metadata generously** — source, section, page, date, author. You will need it for filtering
6. **Add a "no context" detection step** — if no retrieved doc scores above a threshold, say "I don't know" instead of hallucinating
7. **Monitor retrieval quality in production** — log queries with no good matches for iterative improvement
8. **Keep chunks small for retrieval, large for context** — Parent Document Retriever pattern
9. **Pre-filter before vector search** when possible — metadata filters reduce the search space and improve precision
10. **Update your index incrementally** — do not rebuild from scratch on every document change

## Critical Rules

1. NEVER skip reranking in production — it is the single biggest quality win after choosing the right embedding model
2. ALWAYS evaluate retrieval and generation SEPARATELY — conflating them hides root causes
3. Load reference files on-demand when you need implementation details — do not bloat context with code you will not use

## Keywords

rag, retrieval augmented generation, hyde, parent document retriever, multi-query, reranking, hybrid search, rrf, chunking, langchain, vector search
