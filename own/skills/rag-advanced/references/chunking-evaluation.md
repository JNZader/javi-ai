# Chunking Strategies & RAG Evaluation — Implementation Reference

## Recursive Character Splitting (Default)

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,      # characters
    chunk_overlap=200,     # overlap between chunks
    separators=["\n\n", "\n", ". ", " ", ""],  # try these in order
)
```

## Markdown-Aware Splitting

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

## Semantic Chunking

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

## Chunking Strategy Selection

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
