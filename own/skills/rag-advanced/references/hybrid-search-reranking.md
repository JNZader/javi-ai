# Hybrid Search & Reranking — Implementation Reference

## Reciprocal Rank Fusion (RRF)

Combine dense (semantic) and sparse (keyword) search for best results.

```python
def reciprocal_rank_fusion(
    result_lists: list[list[str]],
    k: int = 60,
) -> list[tuple[str, float]]:
    """Combine multiple ranked lists using RRF.

    Args:
        result_lists: List of ranked document ID lists.
        k: RRF constant (default 60, standard in literature).

    Returns:
        Sorted list of (doc_id, rrf_score) tuples.
    """
    scores: dict[str, float] = {}
    for result_list in result_lists:
        for rank, doc_id in enumerate(result_list):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank + 1)

    return sorted(scores.items(), key=lambda x: x[1], reverse=True)


# Full hybrid search implementation
class HybridRetriever:
    """Combine semantic search with BM25 keyword search using RRF."""

    def __init__(self, vectorstore, bm25_retriever, rrf_k: int = 60):
        self.vectorstore = vectorstore
        self.bm25 = bm25_retriever
        self.rrf_k = rrf_k

    def retrieve(self, query: str, k: int = 10) -> list:
        # Dense (semantic) search
        dense_results = self.vectorstore.similarity_search(query, k=k * 2)
        dense_ids = [doc.metadata.get("id", doc.page_content[:50]) for doc in dense_results]

        # Sparse (BM25) search
        sparse_results = self.bm25.get_relevant_documents(query)[:k * 2]
        sparse_ids = [doc.metadata.get("id", doc.page_content[:50]) for doc in sparse_results]

        # Fuse rankings
        fused = reciprocal_rank_fusion([dense_ids, sparse_ids], k=self.rrf_k)
        top_ids = {doc_id for doc_id, _ in fused[:k]}

        # Return documents in fused order
        all_docs = {
            doc.metadata.get("id", doc.page_content[:50]): doc
            for doc in dense_results + sparse_results
        }
        return [all_docs[doc_id] for doc_id, _ in fused[:k] if doc_id in all_docs]
```

### Qdrant Hybrid Search (Built-in)

```python
from qdrant_client import QdrantClient, models

client = QdrantClient(url="http://localhost:6333")

# Qdrant supports hybrid search natively with sparse + dense vectors
results = client.query_points(
    collection_name="documents",
    prefetch=[
        # Dense vector search
        models.Prefetch(
            query=dense_embedding,
            using="dense",
            limit=20,
        ),
        # Sparse vector search (BM25-like)
        models.Prefetch(
            query=models.SparseVector(indices=sparse_indices, values=sparse_values),
            using="sparse",
            limit=20,
        ),
    ],
    query=models.FusionQuery(fusion=models.Fusion.RRF),  # Built-in RRF
    limit=10,
)
```

## Cross-Encoder Reranking

Two-stage retrieval: fast first-stage retrieval (bi-encoder), precise second-stage reranking (cross-encoder).

```python
# Option 1: Cohere Reranker (hosted, easy)
import cohere

co = cohere.Client()

def rerank_cohere(query: str, documents: list[str], top_n: int = 5) -> list[dict]:
    """Rerank documents using Cohere's cross-encoder."""
    response = co.rerank(
        model="rerank-english-v3.0",
        query=query,
        documents=documents,
        top_n=top_n,
    )
    return [
        {"text": documents[r.index], "score": r.relevance_score}
        for r in response.results
    ]


# Option 2: Local cross-encoder (free, private)
from sentence_transformers import CrossEncoder

reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-12-v2")

def rerank_local(query: str, documents: list[str], top_n: int = 5) -> list[dict]:
    """Rerank documents using a local cross-encoder model."""
    pairs = [(query, doc) for doc in documents]
    scores = reranker.predict(pairs)

    ranked = sorted(zip(documents, scores), key=lambda x: x[1], reverse=True)
    return [{"text": doc, "score": float(score)} for doc, score in ranked[:top_n]]
```

### Integration into RAG Pipeline

```python
def rag_with_reranking(
    question: str,
    vectorstore,
    rerank_fn,
    llm,
    initial_k: int = 20,
    final_k: int = 5,
) -> str:
    """Two-stage RAG: retrieve broadly, rerank precisely."""
    # Stage 1: Fast retrieval (over-fetch)
    candidates = vectorstore.similarity_search(question, k=initial_k)
    candidate_texts = [doc.page_content for doc in candidates]

    # Stage 2: Precise reranking
    reranked = rerank_fn(question, candidate_texts, top_n=final_k)
    context = "\n\n---\n\n".join(r["text"] for r in reranked)

    # Stage 3: Generate
    prompt = f"""Answer based only on the provided context.

Context:
{context}

Question: {question}
Answer:"""

    response = llm.invoke(prompt)
    return response.content
```
