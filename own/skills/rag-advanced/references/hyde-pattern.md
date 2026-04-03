# HyDE (Hypothetical Document Embeddings) — Implementation Reference

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
