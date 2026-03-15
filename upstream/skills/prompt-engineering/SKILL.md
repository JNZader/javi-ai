---
name: prompt-engineering
description: >
  Advanced prompt engineering patterns for production LLM applications.
  Trigger: When designing prompts, system messages, structured output, or optimizing token usage.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Core Principle

A prompt is code. Version it, test it, review it. Never embed raw strings in application logic.

## Structured Output with Pydantic (Anthropic API)

```python
import anthropic
from pydantic import BaseModel, Field

client = anthropic.Anthropic()


class ExtractedEntity(BaseModel):
    name: str = Field(description="Entity name")
    entity_type: str = Field(description="Type: person, org, location, date")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score")


class ExtractionResult(BaseModel):
    entities: list[ExtractedEntity]
    summary: str = Field(description="One-sentence summary of the text")


def extract_entities(text: str) -> ExtractionResult:
    """Extract structured entities using Claude with Pydantic validation."""
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": f"""Extract all named entities from this text.

Text: {text}

Return ONLY valid JSON matching this schema:
{ExtractionResult.model_json_schema()}""",
        }],
    )
    return ExtractionResult.model_validate_json(message.content[0].text)
```

### With Tool Use (Guaranteed Schema)

```python
import json

def extract_entities_tool(text: str) -> ExtractionResult:
    """Use tool_use to guarantee structured output from Claude."""
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": f"Extract all named entities from this text:\n\n{text}",
        }],
        tools=[{
            "name": "extract_entities",
            "description": "Extract named entities from text",
            "input_schema": ExtractionResult.model_json_schema(),
        }],
        tool_choice={"type": "tool", "name": "extract_entities"},
    )

    tool_block = next(b for b in message.content if b.type == "tool_use")
    return ExtractionResult.model_validate(tool_block.input)
```

## Chain-of-Thought with Self-Verification

```python
COT_PROMPT = """Solve this step by step.

Question: {question}

Instructions:
1. Think through each step explicitly in <thinking> tags.
2. After reaching an answer, verify it by checking your work in <verification> tags.
3. If verification fails, redo the calculation.
4. Give your final answer in <answer> tags.

Example:
<thinking>
Step 1: ...
Step 2: ...
</thinking>
<verification>
Let me check: ...
</verification>
<answer>
The answer is ...
</answer>"""


def solve_with_verification(question: str) -> dict:
    """Chain-of-thought with self-verification step."""
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        messages=[{"role": "user", "content": COT_PROMPT.format(question=question)}],
    )
    text = message.content[0].text

    import re
    thinking = re.search(r"<thinking>(.*?)</thinking>", text, re.DOTALL)
    verification = re.search(r"<verification>(.*?)</verification>", text, re.DOTALL)
    answer = re.search(r"<answer>(.*?)</answer>", text, re.DOTALL)

    return {
        "thinking": thinking.group(1).strip() if thinking else "",
        "verification": verification.group(1).strip() if verification else "",
        "answer": answer.group(1).strip() if answer else text.strip(),
        "full_response": text,
    }
```

## Few-Shot with Dynamic Example Selection

```python
import numpy as np


class FewShotSelector:
    """Select the most relevant few-shot examples for a given query."""

    def __init__(self, examples: list[dict], embed_fn):
        """
        Args:
            examples: [{"input": "...", "output": "...", "embedding": [...]}]
            embed_fn: function(text) -> list[float]
        """
        self.examples = examples
        self.embed_fn = embed_fn

        # Pre-compute embeddings if not present
        for ex in self.examples:
            if "embedding" not in ex:
                ex["embedding"] = self.embed_fn(ex["input"])

    def select(self, query: str, k: int = 3) -> list[dict]:
        """Select k most similar examples to the query."""
        query_emb = np.array(self.embed_fn(query))
        scored = []
        for ex in self.examples:
            ex_emb = np.array(ex["embedding"])
            similarity = np.dot(query_emb, ex_emb) / (
                np.linalg.norm(query_emb) * np.linalg.norm(ex_emb) + 1e-9
            )
            scored.append((similarity, ex))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [ex for _, ex in scored[:k]]

    def format_prompt(self, query: str, k: int = 3) -> str:
        """Build a few-shot prompt with dynamically selected examples."""
        selected = self.select(query, k)
        examples_text = "\n\n".join(
            f"Input: {ex['input']}\nOutput: {ex['output']}" for ex in selected
        )
        return f"""Here are some examples:

{examples_text}

Now handle this new input:
Input: {query}
Output:"""
```

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

## Error Recovery and Fallback Patterns

```python
import json
import time
from pydantic import BaseModel, ValidationError


def robust_structured_call(
    prompt: str,
    response_model: type[BaseModel],
    max_retries: int = 3,
    model: str = "claude-sonnet-4-20250514",
) -> BaseModel | None:
    """Call Claude with automatic retry and validation.

    Retries on:
    - JSON parse errors (re-prompts with the error)
    - Pydantic validation errors (re-prompts with field-level feedback)
    - API rate limits (exponential backoff)
    """
    messages = [{"role": "user", "content": prompt}]

    for attempt in range(max_retries):
        try:
            response = client.messages.create(
                model=model,
                max_tokens=2048,
                messages=messages,
            )
            text = response.content[0].text

            # Try to extract JSON from response
            json_match = _extract_json(text)
            if json_match is None:
                raise json.JSONDecodeError("No JSON found", text, 0)

            return response_model.model_validate_json(json_match)

        except json.JSONDecodeError as e:
            messages.append({"role": "assistant", "content": text})
            messages.append({
                "role": "user",
                "content": f"Your response was not valid JSON. Error: {e}. Please return ONLY valid JSON matching the schema.",
            })

        except ValidationError as e:
            messages.append({"role": "assistant", "content": text})
            error_details = "; ".join(
                f"{'.'.join(str(x) for x in err['loc'])}: {err['msg']}"
                for err in e.errors()
            )
            messages.append({
                "role": "user",
                "content": f"Validation failed: {error_details}. Fix these fields and return valid JSON.",
            })

        except anthropic.RateLimitError:
            wait = 2 ** attempt
            time.sleep(wait)

    return None  # All retries exhausted


def _extract_json(text: str) -> str | None:
    """Extract JSON from text that may contain markdown code blocks."""
    import re
    # Try code block first
    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    # Try raw JSON
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return match.group(0)
    return None
```

## Role-Based System Prompts

```python
SYSTEM_PROMPTS = {
    "code_reviewer": """You are a senior software engineer conducting code reviews.

Focus on:
- Correctness: logic errors, edge cases, off-by-one errors
- Security: injection, auth bypass, data exposure
- Performance: O(n^2) when O(n) is possible, unnecessary allocations
- Maintainability: naming, complexity, test coverage

Be direct and specific. Reference line numbers. Suggest fixes, not just problems.
Do NOT praise good code — only mention issues.""",

    "tech_writer": """You are a technical writer for developer documentation.

Rules:
- Use active voice and present tense
- Lead with the most important information
- Include code examples for every concept
- Use consistent terminology (define terms on first use)
- Target audience: intermediate developers
- Maximum paragraph length: 3 sentences""",

    "data_analyst": """You are a data analyst helping interpret results.

Rules:
- Always state assumptions explicitly
- Distinguish correlation from causation
- Provide confidence intervals when possible
- Flag small sample sizes
- Suggest follow-up analyses
- Use plain language — avoid jargon without definition""",
}
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
# ❌ Wasteful - repeats instructions every call
BAD_PROMPT = """You are a helpful assistant. You should always be polite and professional.
When answering questions, make sure to provide accurate information. If you don't know
something, say so. Always format your responses clearly.

Question: {question}"""

# ✅ Efficient - system prompt separate, user prompt minimal
SYSTEM = "You are a concise technical assistant. State unknowns. Use markdown."
USER = "{question}"

# ✅ Use abbreviations for repeated structures
EFFICIENT_EXTRACTION = """Extract from text. Return JSON.
Fields: name(str), type(person|org|loc), conf(0-1)
Text: {text}"""
```

## Best Practices

1. **Start with the simplest prompt that works** — add complexity only when eval scores demand it
2. **Put instructions before data** — models attend more strongly to the beginning
3. **Use XML tags** (`<context>`, `<instructions>`) for clear section boundaries with Claude
4. **Specify output format explicitly** — "Return ONLY valid JSON" prevents markdown wrapping
5. **Use tool_use for guaranteed structured output** — more reliable than asking for JSON in text
6. **Cache static content** — system prompts, reference docs, few-shot examples
7. **Test with adversarial inputs** — empty strings, unicode, injection attempts, very long inputs
8. **Version prompts alongside code** — store templates in files, not inline strings
9. **Measure before optimizing** — token counts, latency, cost per request

## Anti-Patterns

- **Prompt stuffing**: cramming every possible instruction into one prompt. Split into focused steps.
- **Vague output instructions**: "format nicely" vs. "return JSON with keys: name, score, reasoning"
- **No error handling**: assuming the model always returns valid JSON. It will not.
- **Hardcoded examples**: using the same few-shot examples regardless of query type.
- **Ignoring model strengths**: asking Claude to do math it should delegate to code execution.
- **System prompt as conversation**: putting user-specific data in system prompts (use messages instead).

## Keywords
prompt engineering, structured output, chain of thought, few-shot, system prompt, prompt caching, token optimization, pydantic, anthropic
