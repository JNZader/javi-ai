---
name: rag-advanced
description: >
  Advanced RAG patterns beyond basic retrieval — HyDE, reranking, hybrid search, and production strategies.
  Trigger: When building production RAG pipelines, improving retrieval quality, or evaluating RAG systems.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Core Principle

Basic RAG (embed → retrieve → generate) gets you to 60% quality. The patterns below get you to 90%+. Always measure retrieval quality separately from generation quality.

## HyDE (Hypothetical Document Embeddings)

Generate a hypothetical answer first, embed it, then search. Works because the hypothetical answer is closer in embedding space to real answers than the question is.

```python
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

llm = ChatAnthropic(model="claude-sonnet-4-20250514")

# Step 1: Generate hypothetical document
hyde_prompt = ChatPromptTemplate.from_template(
    """Write a short, factual paragraph that would answer this question.
Do not say "I don't know". Write as if you know the answer, even if you have to guess.

Question: {question}
Hypothetical answer:"""
)

hyde_chain = hyde_prompt | llm | StrOutputParser()


def hyde_retriever(vectorstore, question: str, k: int = 5):
    """Retrieve using HyDE — embed a hypothetical answer instead of the question."""
    hypothetical_doc = hyde_chain.invoke({"question": question})
    # Embed the hypothetical answer and search for similar real documents
    results = vectorstore.similarity_search(hypothetical_doc, k=k)
    return results


# Full HyDE RAG chain with LangChain
def build_hyde_chain(vectorstore, llm):
    """Build a complete HyDE RAG chain."""
    retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

    hyde_retrieval = (
        hyde_prompt
        | llm
        | StrOutputParser()
        | retriever  # Search using hypothetical doc
    )

    answer_prompt = ChatPromptTemplate.from_template(
        """Answer the question based only on the following context.
If the context doesn't contain enough information, say so.

Context: {context}
Question: {question}
Answer:"""
    )

    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    chain = (
        {"context": hyde_retrieval | format_docs, "question": RunnablePassthrough()}
        | answer_prompt
        | llm
        | StrOutputParser()
    )
    return chain
```

### When to Use HyDE

- Question and answer are in different "language" (e.g., colloquial question, technical docs)
- Direct embedding of short queries gives poor results
- **Do NOT use** when: documents are very short, or queries are already well-formed keyword searches

## Parent Document Retriever

Retrieve small chunks for precision, return large chunks for context. Solves the fundamental chunk-size tradeoff.

```python
from langchain.retrievers import ParentDocumentRetriever
from langchain.storage import InMemoryStore
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings

# Small chunks for retrieval (precise matching)
child_splitter = RecursiveCharacterTextSplitter(
    chunk_size=200,
    chunk_overlap=50,
)

# Large chunks for context (full information)
parent_splitter = RecursiveCharacterTextSplitter(
    chunk_size=2000,
    chunk_overlap=200,
)

vectorstore = Chroma(
    collection_name="child_chunks",
    embedding_function=OpenAIEmbeddings(model="text-embedding-3-small"),
)
docstore = InMemoryStore()  # Stores parent documents; use Redis/DB in production

retriever = ParentDocumentRetriever(
    vectorstore=vectorstore,
    docstore=docstore,
    child_splitter=child_splitter,
    parent_splitter=parent_splitter,
)

# Index documents
retriever.add_documents(documents)

# Retrieval: searches child chunks, returns parent chunks
results = retriever.invoke("What is the refund policy?")
# Each result is a large parent chunk that contains the matching small chunk
```

## Multi-Query Retrieval

Generate multiple reformulations of the query to improve recall.

```python
from langchain.retrievers import MultiQueryRetriever

llm = ChatAnthropic(model="claude-sonnet-4-20250514")

base_retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

multi_query_retriever = MultiQueryRetriever.from_llm(
    retriever=base_retriever,
    llm=llm,
)
# Internally generates 3+ query variants and deduplicates results

results = multi_query_retriever.invoke("How do I handle authentication errors?")
# Might generate: "authentication error handling", "auth failure troubleshooting",
# "what to do when login fails" — then union the results
```

### Custom Multi-Query

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import LineListOutputParser

query_gen_prompt = ChatPromptTemplate.from_template(
    """Generate 3 different versions of the given question to retrieve relevant documents.
Each version should approach the question from a different angle.
Return one question per line, nothing else.

Original question: {question}"""
)

query_gen_chain = query_gen_prompt | llm | StrOutputParser() | LineListOutputParser()


def multi_query_retrieve(vectorstore, question: str, k: int = 5) -> list:
    """Generate query variants and retrieve unique documents."""
    queries = query_gen_chain.invoke({"question": question})
    queries.append(question)  # Include original

    all_docs = {}
    for query in queries:
        for doc in vectorstore.similarity_search(query.strip(), k=k):
            # Deduplicate by content hash
            doc_hash = hash(doc.page_content)
            if doc_hash not in all_docs:
                all_docs[doc_hash] = doc

    return list(all_docs.values())
```

## Contextual Compression

Filter and compress retrieved documents to remove irrelevant parts before sending to LLM.

```python
from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import LLMChainExtractor

base_retriever = vectorstore.as_retriever(search_kwargs={"k": 10})

# LLM-based compression: extracts only relevant sentences
compressor = LLMChainExtractor.from_llm(
    ChatAnthropic(model="claude-haiku-4-20250514")  # Use cheap model for compression
)

compression_retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=base_retriever,
)

results = compression_retriever.invoke("What is the cancellation policy?")
# Returns documents with only the relevant sentences, not full chunks
```

## Hybrid Search with RRF (Reciprocal Rank Fusion)

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

## Document Chunking Strategies

### Recursive Character Splitting (Default)

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,      # characters
    chunk_overlap=200,     # overlap between chunks
    separators=["\n\n", "\n", ". ", " ", ""],  # try these in order
)
```

### Markdown-Aware Splitting

```python
from langchain_text_splitters import MarkdownHeaderTextSplitter

headers_to_split = [
    ("#", "h1"),
    ("##", "h2"),
    ("###", "h3"),
]
splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split)
chunks = splitter.split_text(markdown_text)
# Each chunk includes header metadata for filtering
```

### Semantic Chunking

```python
from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings

splitter = SemanticChunker(
    OpenAIEmbeddings(model="text-embedding-3-small"),
    breakpoint_threshold_type="percentile",
    breakpoint_threshold_amount=90,  # Split when similarity drops below 90th percentile
)
chunks = splitter.split_text(long_document)
# Chunks respect semantic boundaries instead of arbitrary character counts
```

### Chunking Strategy Selection

| Document Type | Strategy | Chunk Size | Overlap |
|--------------|----------|------------|---------|
| Prose/articles | Recursive | 1000-1500 | 200 |
| Code | Language-aware (tree-sitter) | function/class | 0 |
| Markdown docs | Header-based | by section | 0 |
| Legal/contracts | Semantic | varies | 100 |
| FAQ/Q&A pairs | By question | per Q&A | 0 |
| Chat logs | By conversation turn | per message | 1-2 turns |

## RAG Evaluation

```python
def evaluate_rag_pipeline(
    pipeline_fn,
    test_cases: list[dict],
) -> dict:
    """Evaluate a RAG pipeline on test cases.

    test_cases: [{"question": "...", "expected_answer": "...", "relevant_doc_ids": ["..."]}]
    """
    retrieval_scores = []
    generation_scores = []

    for case in test_cases:
        result = pipeline_fn(case["question"])

        # Evaluate retrieval
        if "relevant_doc_ids" in case:
            retrieved_ids = [doc.metadata["id"] for doc in result.get("retrieved_docs", [])]
            relevant_ids = case["relevant_doc_ids"]
            precision = len(set(retrieved_ids) & set(relevant_ids)) / len(retrieved_ids) if retrieved_ids else 0
            recall = len(set(retrieved_ids) & set(relevant_ids)) / len(relevant_ids) if relevant_ids else 0
            retrieval_scores.append({"precision": precision, "recall": recall})

        # Evaluate generation (use LLM-as-judge)
        if "expected_answer" in case:
            # See llm-evaluation skill for judge implementation
            score = llm_judge_single(case["question"], result["answer"])
            generation_scores.append(score)

    return {
        "retrieval": {
            "mean_precision": sum(s["precision"] for s in retrieval_scores) / len(retrieval_scores),
            "mean_recall": sum(s["recall"] for s in retrieval_scores) / len(retrieval_scores),
        } if retrieval_scores else {},
        "generation": generation_scores,
    }
```

## Best Practices for Production RAG

1. **Separate retrieval from generation evaluation** — a perfect generator cannot fix bad retrieval
2. **Always rerank** — 20 candidates → rerank to top 5 consistently beats retrieving top 5 directly
3. **Use hybrid search** — dense misses keywords, sparse misses semantics; RRF gets both
4. **Chunk with overlap** — 10-20% overlap prevents information loss at chunk boundaries
5. **Store metadata generously** — source, section, page, date, author. You will need it for filtering
6. **Add a "no context" detection step** — if no retrieved doc scores above a threshold, say "I don't know" instead of hallucinating
7. **Monitor retrieval quality in production** — log queries with no good matches for iterative improvement
8. **Keep chunks small for retrieval, large for context** — Parent Document Retriever pattern
9. **Pre-filter before vector search** when possible — metadata filters reduce the search space and improve precision
10. **Update your index incrementally** — do not rebuild from scratch on every document change

## Keywords
rag, retrieval augmented generation, hyde, parent document retriever, multi-query, reranking, hybrid search, rrf, chunking, langchain, vector search
