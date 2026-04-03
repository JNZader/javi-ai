---
name: prompt-engineering
description: >
  Advanced prompt engineering patterns for production LLM applications.
  Trigger: When designing prompts, system messages, structured output, or optimizing token usage.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.1"
---

## Core Principle

A prompt is code. Version it, test it, review it. Never embed raw strings in application logic.

## Key Techniques

### Structured Output with Pydantic

Use `tool_use` for guaranteed schema compliance. Fallback: ask for JSON matching `model_json_schema()` output.

- **Tool Use**: Most reliable — forces output through a defined schema via `tool_choice`
- **JSON mode**: Ask for JSON with schema in prompt — works but needs validation
- Always validate with Pydantic `model_validate_json()` or `model_validate()`

### Chain-of-Thought with Self-Verification

Use XML tags (`<thinking>`, `<verification>`, `<answer>`) for structured reasoning. The verification step catches errors before final output.

### Few-Shot with Dynamic Example Selection

Select examples by embedding similarity to the query, not randomly. Pre-compute embeddings for the example bank. Use cosine similarity to find the k most relevant examples.

### Progressive Disclosure (4 Levels)

Start simple, add complexity only when eval scores demand it:

1. **Zero-shot** — just the task description
2. **Output format** — add category definitions + JSON format
3. **Few-shot** — add relevant examples
4. **Full system prompt** — add CoT + edge cases + role definition

### Error Recovery

Implement retry with feedback loops:
- JSON parse errors → re-prompt with the error message
- Pydantic validation errors → re-prompt with field-level details
- Rate limits → exponential backoff

### Role-Based System Prompts

Define focused system prompts per use case (code reviewer, tech writer, data analyst). Keep them specific, directive, and separate from user messages.

> @reference references/code-examples.md — Load when implementing structured output, CoT, few-shot, error recovery, or role-based prompts

### Anthropic Prompt Caching

Cache static content (system prompts, reference docs) with `cache_control: {"type": "ephemeral"}`. Cost: 1.25x write, 0.1x read. TTL: 5 minutes (refreshed on hit). Minimum: 1024 tokens (Sonnet), 2048 (Haiku).

### Token Optimization

Three strategies:
1. **Compress context** — summarize documents with a cheaper model before the main query
2. **Tiered model routing** — classify complexity first, route to appropriate model tier
3. **Prompt template optimization** — separate system from user prompt, use abbreviations for repeated structures

> @reference references/techniques.md — Load when implementing progressive disclosure, prompt caching, or token optimization patterns

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
