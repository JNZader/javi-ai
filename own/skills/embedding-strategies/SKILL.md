---
name: embedding-strategies
description: >
  Embedding model selection, optimization, and evaluation for search and RAG systems.
  Trigger: When choosing embedding models, optimizing embedding pipelines, or evaluating retrieval quality.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
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

## Voyage AI Embeddings (Recommended for Claude)

Anthropic recommends Voyage AI for Claude-based applications. Best-in-class for code.

```python
import voyageai

vo = voyageai.Client()  # Uses VOYAGE_API_KEY env var

# Single text embedding
result = vo.embed(["What is the refund policy?"], model="voyage-3", input_type="query")
query_embedding = result.embeddings[0]  # list[float], 1024 dims

# Batch document embeddings (up to 128 texts per call)
doc_texts = ["Refunds are processed within 5 days...", "Our return policy covers..."]
result = vo.embed(doc_texts, model="voyage-3", input_type="document")
doc_embeddings = result.embeddings  # list[list[float]]

# Code embeddings (use voyage-code-3 for code-specific tasks)
code_result = vo.embed(
    ["def fibonacci(n): return n if n < 2 else fibonacci(n-1) + fibonacci(n-2)"],
    model="voyage-code-3",
    input_type="document",
)
```

### Input Types Matter

```python
# Always specify input_type — it changes the embedding
query_emb = vo.embed(["How to sort a list?"], model="voyage-3", input_type="query")
doc_emb = vo.embed(["Use sorted() for..."], model="voyage-3", input_type="document")

# input_type="query"    → optimized for short search queries
# input_type="document" → optimized for longer passages to be searched
```

## OpenAI Embeddings with Matryoshka Reduction

```python
from openai import OpenAI

oai = OpenAI()

def embed_with_dimensions(texts: list[str], dimensions: int = 1536) -> list[list[float]]:
    """Embed with OpenAI, optionally reducing dimensions via Matryoshka.

    text-embedding-3-large supports: 256, 512, 1024, 1536, 3072
    text-embedding-3-small supports: 512, 1536
    """
    response = oai.embeddings.create(
        model="text-embedding-3-large",
        input=texts,
        dimensions=dimensions,  # Matryoshka truncation
    )
    return [item.embedding for item in response.data]


# Dimension vs. quality tradeoff (approximate for text-embedding-3-large)
# 3072 dims → 100% quality (baseline)
# 1536 dims →  98% quality, 50% storage
# 1024 dims →  96% quality, 33% storage
#  512 dims →  93% quality, 17% storage
#  256 dims →  88% quality,  8% storage
```

### When to Reduce Dimensions

- **Storage constrained**: millions of embeddings, need to fit in RAM
- **Latency sensitive**: smaller vectors = faster distance computation
- **Cost sensitive**: less storage in vector DB = lower hosting cost
- **Never reduce for**: small datasets (<100K docs), when recall is critical

## Local Embeddings with sentence-transformers

```python
from sentence_transformers import SentenceTransformer
import numpy as np

# Load model (downloads on first run, ~400MB for BGE-large)
model = SentenceTransformer("BAAI/bge-large-en-v1.5")

# Embed queries (BGE models need "Represent this sentence:" prefix for queries)
query_embedding = model.encode(
    "Represent this sentence: What is the return policy?",
    normalize_embeddings=True,
)

# Embed documents (no prefix needed)
doc_embeddings = model.encode(
    ["Refunds are processed within 5 days...", "Our return policy covers..."],
    normalize_embeddings=True,  # Required for cosine similarity
    batch_size=32,  # Control memory usage
    show_progress_bar=True,
)

# Compute similarity
similarities = np.dot(doc_embeddings, query_embedding)
```

### GPU Acceleration

```python
import torch

# Use GPU if available
device = "cuda" if torch.cuda.is_available() else "cpu"
model = SentenceTransformer("BAAI/bge-large-en-v1.5", device=device)

# For large batches, use encode_multi_process for multi-GPU
pool = model.start_multi_process_pool()
embeddings = model.encode_multi_process(texts, pool, batch_size=128)
model.stop_multi_process_pool(pool)
```

## Chunking Strategies

### Token-Based Chunking

```python
import tiktoken

def chunk_by_tokens(text: str, max_tokens: int = 500, overlap_tokens: int = 50) -> list[str]:
    """Split text into chunks with a fixed token budget."""
    enc = tiktoken.encoding_for_model("gpt-4")  # cl100k_base
    tokens = enc.encode(text)

    chunks = []
    start = 0
    while start < len(tokens):
        end = start + max_tokens
        chunk_tokens = tokens[start:end]
        chunks.append(enc.decode(chunk_tokens))
        start = end - overlap_tokens  # Overlap

    return chunks
```

### Sentence-Based Chunking

```python
import re

def chunk_by_sentences(text: str, max_sentences: int = 5, overlap: int = 1) -> list[str]:
    """Split text into chunks of N sentences with overlap."""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    sentences = [s.strip() for s in sentences if s.strip()]

    chunks = []
    for i in range(0, len(sentences), max_sentences - overlap):
        chunk = " ".join(sentences[i:i + max_sentences])
        if chunk:
            chunks.append(chunk)

    return chunks
```

### Semantic Chunking

```python
from sentence_transformers import SentenceTransformer
import numpy as np

def chunk_semantically(
    text: str,
    model: SentenceTransformer,
    similarity_threshold: float = 0.75,
    min_chunk_size: int = 100,
) -> list[str]:
    """Split text at points where semantic similarity drops below threshold."""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    if len(sentences) <= 1:
        return [text]

    embeddings = model.encode(sentences, normalize_embeddings=True)

    # Compute pairwise similarity between adjacent sentences
    chunks = []
    current_chunk = [sentences[0]]

    for i in range(1, len(sentences)):
        sim = np.dot(embeddings[i - 1], embeddings[i])
        if sim < similarity_threshold and len(" ".join(current_chunk)) >= min_chunk_size:
            chunks.append(" ".join(current_chunk))
            current_chunk = [sentences[i]]
        else:
            current_chunk.append(sentences[i])

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks
```

## Domain-Specific Embeddings

### Code Embeddings with tree-sitter

```python
import tree_sitter_python as tspython
from tree_sitter import Language, Parser

PY_LANGUAGE = Language(tspython.language())
parser = Parser(PY_LANGUAGE)


def extract_code_chunks(source_code: str) -> list[dict]:
    """Extract function/class-level chunks from Python code using tree-sitter."""
    tree = parser.parse(bytes(source_code, "utf8"))
    root = tree.root_node
    chunks = []

    for node in root.children:
        if node.type in ("function_definition", "class_definition"):
            chunk_text = source_code[node.start_byte:node.end_byte]
            name_node = node.child_by_field_name("name")
            name = source_code[name_node.start_byte:name_node.end_byte] if name_node else "unknown"

            chunks.append({
                "text": chunk_text,
                "type": node.type,
                "name": name,
                "start_line": node.start_point[0],
                "end_line": node.end_point[0],
            })

    return chunks

# Embed code chunks with a code-specific model
# Voyage Code 3 or CodeBERT work best for code search
```

### Instruction-Tuned Embeddings for Asymmetric Search

```python
# E5 models use instruction prefixes to distinguish query vs document
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("intfloat/e5-large-v2")

# Queries get "query: " prefix
query_emb = model.encode("query: how to handle exceptions in Python")

# Documents get "passage: " prefix
doc_emb = model.encode("passage: Python uses try/except blocks for exception handling...")
```

## Embedding Quality Evaluation

```python
import numpy as np
from dataclasses import dataclass


@dataclass
class RetrievalEvalResult:
    precision_at_k: float
    recall_at_k: float
    mrr: float
    ndcg_at_k: float


def evaluate_embeddings(
    queries: list[str],
    corpus: list[str],
    relevance_labels: dict[int, list[int]],  # query_idx -> list of relevant doc indices
    embed_fn,
    k: int = 10,
) -> RetrievalEvalResult:
    """Evaluate embedding quality for retrieval.

    Args:
        queries: List of query strings.
        corpus: List of document strings.
        relevance_labels: Mapping from query index to list of relevant document indices.
        embed_fn: Function that takes list[str] and returns numpy array of embeddings.
        k: Number of results to evaluate at.
    """
    query_embeddings = embed_fn(queries)
    doc_embeddings = embed_fn(corpus)

    # Normalize for cosine similarity
    query_embeddings = query_embeddings / np.linalg.norm(query_embeddings, axis=1, keepdims=True)
    doc_embeddings = doc_embeddings / np.linalg.norm(doc_embeddings, axis=1, keepdims=True)

    # Compute all similarities
    similarities = query_embeddings @ doc_embeddings.T

    precisions, recalls, mrrs, ndcgs = [], [], [], []

    for q_idx, relevant_docs in relevance_labels.items():
        relevant_set = set(relevant_docs)
        ranked_indices = np.argsort(-similarities[q_idx])[:k]

        # Precision@k
        hits = sum(1 for idx in ranked_indices if idx in relevant_set)
        precisions.append(hits / k)

        # Recall@k
        recalls.append(hits / len(relevant_set) if relevant_set else 0)

        # MRR
        mrr = 0.0
        for rank, idx in enumerate(ranked_indices):
            if idx in relevant_set:
                mrr = 1.0 / (rank + 1)
                break
        mrrs.append(mrr)

        # NDCG@k
        import math
        dcg = sum(
            1.0 / math.log2(rank + 2)
            for rank, idx in enumerate(ranked_indices)
            if idx in relevant_set
        )
        ideal_dcg = sum(1.0 / math.log2(i + 2) for i in range(min(len(relevant_set), k)))
        ndcgs.append(dcg / ideal_dcg if ideal_dcg > 0 else 0)

    return RetrievalEvalResult(
        precision_at_k=np.mean(precisions),
        recall_at_k=np.mean(recalls),
        mrr=np.mean(mrrs),
        ndcg_at_k=np.mean(ndcgs),
    )
```

## Caching Strategies

```python
import hashlib
import json
from pathlib import Path
from functools import lru_cache


class EmbeddingCache:
    """Disk-based embedding cache to avoid recomputing embeddings."""

    def __init__(self, cache_dir: str = ".embedding_cache", embed_fn=None):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        self.embed_fn = embed_fn

    def _hash_text(self, text: str, model: str) -> str:
        return hashlib.sha256(f"{model}:{text}".encode()).hexdigest()

    def get_or_compute(self, texts: list[str], model: str = "default") -> list[list[float]]:
        """Return cached embeddings or compute and cache new ones."""
        results = [None] * len(texts)
        to_compute = []
        to_compute_indices = []

        # Check cache
        for i, text in enumerate(texts):
            h = self._hash_text(text, model)
            cache_path = self.cache_dir / f"{h}.json"
            if cache_path.exists():
                results[i] = json.loads(cache_path.read_text())
            else:
                to_compute.append(text)
                to_compute_indices.append(i)

        # Compute missing
        if to_compute:
            new_embeddings = self.embed_fn(to_compute)
            for idx, text, emb in zip(to_compute_indices, to_compute, new_embeddings):
                h = self._hash_text(text, model)
                cache_path = self.cache_dir / f"{h}.json"
                emb_list = emb.tolist() if hasattr(emb, "tolist") else emb
                cache_path.write_text(json.dumps(emb_list))
                results[idx] = emb_list

        return results
```

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

## Keywords
embeddings, voyage ai, openai embeddings, sentence-transformers, chunking, vector search, bge, e5, matryoshka, code embeddings, retrieval evaluation
