# Prompt Engineering — Code Examples

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
