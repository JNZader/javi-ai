# Prompt Engineering — Techniques

## Progressive Disclosure (4 Prompt Levels)

```python
"""
Progressive disclosure: start simple, add complexity only when needed.
Each level adds more context and constraints.
"""

# Level 1: Zero-shot (simplest, try this first)
LEVEL_1 = "Classify this support ticket as: billing, technical, account, or other.\n\nTicket: {ticket}"

# Level 2: With output format
LEVEL_2 = """Classify this support ticket.

Categories:
- billing: payment issues, invoices, refunds
- technical: bugs, errors, performance
- account: login, permissions, profile
- other: anything else

Ticket: {ticket}

Return JSON: {{"category": "<category>", "confidence": <0.0-1.0>}}"""

# Level 3: Few-shot with examples
LEVEL_3 = """Classify this support ticket.

Categories:
- billing: payment issues, invoices, refunds
- technical: bugs, errors, performance
- account: login, permissions, profile
- other: anything else

Examples:
Ticket: "My credit card was charged twice"
{{"category": "billing", "confidence": 0.95}}

Ticket: "The page keeps crashing when I upload files"
{{"category": "technical", "confidence": 0.90}}

Ticket: "I can't log in with my SSO credentials"
{{"category": "account", "confidence": 0.85}}

Now classify:
Ticket: {ticket}"""

# Level 4: Full system prompt + CoT + edge cases
LEVEL_4_SYSTEM = """You are a support ticket classifier for a SaaS platform.

Rules:
1. Always choose exactly one category.
2. If a ticket spans multiple categories, choose the PRIMARY issue.
3. If genuinely ambiguous, choose "other" with low confidence.
4. Think through your reasoning before classifying.

Edge cases:
- "Delete my account" → account (not other)
- "Feature request" → other
- "Slow loading" → technical (performance is technical)"""

LEVEL_4_USER = """Classify this ticket. Think step by step, then return JSON.

Ticket: {ticket}

{{"category": "<category>", "confidence": <0.0-1.0>, "reasoning": "<brief explanation>"}}"""
```

## Anthropic Prompt Caching

```python
def cached_analysis(system_prompt: str, documents: list[str], question: str) -> str:
    """Use Anthropic prompt caching for repeated analysis over the same documents.

    The system prompt + documents are cached. Only the question varies per call.
    Cost: first call caches at 1.25x write price, subsequent calls at 0.1x read price.
    Cache TTL: 5 minutes (refreshed on each hit).
    Minimum cacheable size: 1024 tokens for Claude Sonnet, 2048 for Haiku.
    """
    document_block = "\n\n---\n\n".join(documents)

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=[
            {
                "type": "text",
                "text": system_prompt,
            },
            {
                "type": "text",
                "text": f"Reference Documents:\n\n{document_block}",
                "cache_control": {"type": "ephemeral"},  # <- enables caching
            },
        ],
        messages=[{"role": "user", "content": question}],
    )

    # Check cache performance
    usage = response.usage
    print(f"Input: {usage.input_tokens}, Cache write: {getattr(usage, 'cache_creation_input_tokens', 0)}, "
          f"Cache read: {getattr(usage, 'cache_read_input_tokens', 0)}")

    return response.content[0].text
```

## Token Optimization Strategies

### 1. Compress Context

```python
def compress_context(documents: list[str], question: str, max_tokens: int = 4000) -> str:
    """Summarize documents to fit within a token budget before main query."""
    summary = client.messages.create(
        model="claude-haiku-4-20250514",  # Use cheaper model for compression
        max_tokens=max_tokens,
        messages=[{
            "role": "user",
            "content": f"""Summarize these documents, preserving ALL facts relevant to: "{question}"
Remove filler, redundancy, and irrelevant details. Keep numbers, names, dates exactly.

Documents:
{chr(10).join(documents)}""",
        }],
    )
    return summary.content[0].text
```

### 2. Tiered Model Routing

```python
def smart_route(query: str) -> str:
    """Route queries to appropriate model tier based on complexity."""

    # Step 1: Classify complexity with fast model
    classification = client.messages.create(
        model="claude-haiku-4-20250514",
        max_tokens=50,
        messages=[{
            "role": "user",
            "content": f'Classify this query as "simple", "moderate", or "complex". Return ONE word only.\n\nQuery: {query}',
        }],
    )
    complexity = classification.content[0].text.strip().lower()

    # Step 2: Route to appropriate model
    model_map = {
        "simple": "claude-haiku-4-20250514",
        "moderate": "claude-sonnet-4-20250514",
        "complex": "claude-sonnet-4-20250514",  # or claude-opus-4-20250514 for critical tasks
    }
    model = model_map.get(complexity, "claude-sonnet-4-20250514")

    response = client.messages.create(
        model=model,
        max_tokens=2048,
        messages=[{"role": "user", "content": query}],
    )
    return response.content[0].text
```

### 3. Prompt Template Optimization

```python
# Bad - repeats instructions every call
BAD_PROMPT = """You are a helpful assistant. You should always be polite and professional.
When answering questions, make sure to provide accurate information. If you don't know
something, say so. Always format your responses clearly.

Question: {question}"""

# Good - system prompt separate, user prompt minimal
SYSTEM = "You are a concise technical assistant. State unknowns. Use markdown."
USER = "{question}"

# Good - use abbreviations for repeated structures
EFFICIENT_EXTRACTION = """Extract from text. Return JSON.
Fields: name(str), type(person|org|loc), conf(0-1)
Text: {text}"""
```
