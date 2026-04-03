# Retrieval Patterns — Implementation Reference

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
