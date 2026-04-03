# Embedding Model Implementations — Reference

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

## Instruction-Tuned Embeddings for Asymmetric Search

```python
# E5 models use instruction prefixes to distinguish query vs document
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("intfloat/e5-large-v2")

# Queries get "query: " prefix
query_emb = model.encode("query: how to handle exceptions in Python")

# Documents get "passage: " prefix
doc_emb = model.encode("passage: Python uses try/except blocks for exception handling...")
```
