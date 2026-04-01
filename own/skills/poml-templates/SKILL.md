---
name: poml-templates
description: >
  POML (Prompt Orchestration Markup Language) conventions for structured, composable, testable prompts.
  Trigger: When writing structured prompts with semantic sections, composing prompt fragments, or using variable substitution in templates.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Core Principle

Prompts are **structured documents**, not raw strings. POML uses HTML-like semantic tags to
define clear sections in prompts. Each section has a single responsibility, can be tested
independently, and can be composed from reusable fragments.

POML is a **convention**, not a runtime library. The "parser" is the AI agent itself — LLMs
understand HTML-like markup natively because they were trained on billions of HTML documents.

### When to Use POML

- Multi-section system prompts (role + task + constraints + examples)
- Prompt templates with dynamic content (variables, conditionals)
- Shared prompt fragments across multiple agents or skills
- Prompts that need section-level testing

### When NOT to Use POML

- Simple one-liner prompts ("Summarize this text")
- User messages (POML is for system/template prompts, not conversation turns)
- When the prompt is already under 100 tokens — structure adds overhead

---

## Core Tag Vocabulary

| Tag | Purpose | Required |
|-----|---------|----------|
| `<role>` | Who the AI is — identity, expertise, personality | Recommended |
| `<task>` | What to do — the primary instruction | Yes |
| `<context>` | Background info — data, state, environment | When needed |
| `<example>` | Few-shot examples — input/output pairs | When needed |
| `<constraints>` | Boundaries — what NOT to do, format rules, limits | Recommended |
| `<output>` | Expected output format — JSON schema, markdown structure | When structured |

### Tag Rules

1. Tags are **lowercase** and **self-closing when empty** (`<context />`)
2. Custom tags are allowed if lowercase and hyphenated (e.g., `<chain-of-thought>`)
3. Tags can have attributes: `<example format="json">`, `<context source="database">`
4. Nesting is allowed: `<task>` can contain `<constraints>`
5. Order matters: `<role>` first, `<output>` last (instructions before data)

### Basic Example

```xml
<role>
You are a senior code reviewer specializing in TypeScript.
Focus on correctness, security, and maintainability.
</role>

<task>
Review the following pull request diff and provide actionable feedback.
</task>

<constraints>
- Reference specific line numbers
- Suggest fixes, not just problems
- Do NOT praise good code — only flag issues
- Maximum 10 issues per review
</constraints>

<context>
Project: {{project_name}}
Framework: {{framework}}
Test coverage: {{coverage_percent}}%
</context>

<output>
Return a JSON array:
[{"file": "...", "line": N, "severity": "critical|warning|info", "message": "...", "suggestion": "..."}]
</output>
```

---

## Variable Substitution

Use `{{variable}}` for dynamic content injection into templates.

### Syntax

```
{{variable}}              — required variable (error if missing)
{{variable|default}}      — with fallback value
{{variable|}}             — optional, renders empty if missing
```

### Example

```xml
<role>
You are a {{role_title|technical writer}} for {{company}} documentation.
Target audience: {{audience|intermediate developers}}.
</role>

<task>
Write documentation for the {{component}} module.
{{#if api_reference}}
Include API reference from: {{api_reference}}
{{/if}}
</task>
```

### Variable Naming Conventions

| Convention | Example | Use For |
|-----------|---------|---------|
| `snake_case` | `{{user_name}}` | All variables |
| `UPPER_CASE` | `{{MAX_TOKENS}}` | Constants/config |
| Dotted path | `{{user.role}}` | Nested objects |

---

## Conditional Blocks

Use `<if>` blocks to include or exclude prompt sections based on context.

### Syntax

```xml
<if condition="has_examples">
  <example>
  Input: "hello world"
  Output: "HELLO WORLD"
  </example>
</if>

<!-- Shorthand for boolean flags -->
<if verbose>
  Think through your reasoning step by step before answering.
</if>

<!-- Negation -->
<if not="streaming">
  Return the complete response at once.
</if>
```

### Practical Example

```xml
<role>
You are a {{model_role|assistant}}.
</role>

<task>
{{task_description}}
</task>

<if condition="few_shot_examples">
<example>
{{#each few_shot_examples}}
Input: {{this.input}}
Output: {{this.output}}
{{/each}}
</example>
</if>

<if condition="output_schema">
<output>
Return valid JSON matching this schema:
{{output_schema}}
</output>
</if>

<if not="allow_refusal">
<constraints>
You MUST provide an answer. Do not refuse or say you cannot help.
</constraints>
</if>
```

---

## Composability via Include

Use `<include>` to compose prompts from reusable fragments.

### Syntax

```xml
<!-- Include a fragment file -->
<include src="fragments/chain-of-thought" />

<!-- Include with variable override -->
<include src="fragments/output-json" schema="{{response_schema}}" />

<!-- Include from a named collection -->
<include src="roles/senior-reviewer" />
```

### Fragment File Convention

Store fragments as standalone POML files:

```
prompts/
  fragments/
    chain-of-thought.poml     — reusable CoT instructions
    output-json.poml           — JSON output format block
    verification-step.poml     — self-verification instructions
  roles/
    senior-reviewer.poml       — reviewer role definition
    tech-writer.poml           — writer role definition
  templates/
    code-review.poml           — full review template
    documentation.poml         — full docs template
```

### Fragment Example

```xml
<!-- fragments/chain-of-thought.poml -->
<constraints>
Think step by step:
1. Analyze the input carefully
2. Consider edge cases
3. Formulate your response
4. Verify your answer before returning
</constraints>
```

```xml
<!-- templates/code-review.poml -->
<include src="roles/senior-reviewer" />

<task>
Review this code change.
</task>

<include src="fragments/chain-of-thought" />

<context>
{{diff}}
</context>

<output>
Return structured feedback as JSON.
</output>
```

---

## Full End-to-End Example

A complete POML template for a RAG-powered Q&A agent:

```xml
<!-- templates/rag-qa.poml -->
<role>
You are a knowledge base assistant for {{company|Acme Corp}}.
You answer questions using ONLY the provided context documents.
</role>

<task>
Answer the user's question based on the retrieved context below.
If the context does not contain enough information, say so explicitly.
</task>

<constraints>
- ONLY use information from the provided context
- Cite sources using [Doc N] notation
- If uncertain, state your confidence level
- Do NOT hallucinate facts not present in context
- Maximum response length: {{max_tokens|500}} tokens
</constraints>

<if condition="retrieved_documents">
<context source="retrieval">
{{#each retrieved_documents}}
[Doc {{@index}}] (score: {{this.score}})
{{this.content}}
---
{{/each}}
</context>
</if>

<if condition="chat_history">
<context source="conversation">
Previous messages:
{{#each chat_history}}
{{this.role}}: {{this.content}}
{{/each}}
</context>
</if>

<if condition="output_format">
<output>
{{output_format}}
</output>
</if>

<example>
User: What is the refund policy?
Assistant: According to [Doc 2], the refund policy allows returns within 30 days
of purchase for a full refund, provided the item is in original condition.
</example>
```

---

## Testing Strategy

POML's structure enables **section-level testing** — test each tag's content independently.

### 1. Section Isolation Tests

```python
def test_constraints_respected():
    """Test that the <constraints> section produces expected behavior."""
    constraints = extract_section(template, "constraints")
    response = llm.generate(
        system=f"Follow these rules exactly:\n{constraints}",
        user="Tell me about quantum physics",
    )
    assert len(response.split()) <= max_tokens
    assert "I don't know" not in response  # if allow_refusal is false
```

### 2. Variable Substitution Tests

```python
def test_variables_render():
    """Test that all variables are replaced."""
    rendered = render_poml(template, {"company": "Acme", "role_title": "analyst"})
    assert "{{" not in rendered  # No unresolved variables
    assert "Acme" in rendered
```

### 3. Conditional Block Tests

```python
def test_conditional_included():
    """Test <if> block renders when condition is truthy."""
    rendered = render_poml(template, {"has_examples": True, "examples": [...]})
    assert "<example>" not in rendered  # Tags stripped after render
    assert "Input:" in rendered         # Content present

def test_conditional_excluded():
    """Test <if> block omitted when condition is falsy."""
    rendered = render_poml(template, {"has_examples": False})
    assert "Input:" not in rendered
```

### 4. Composition Tests

```python
def test_include_resolves():
    """Test that <include> fragments are inlined."""
    rendered = render_poml(template, {}, fragments_dir="prompts/fragments/")
    assert "<include" not in rendered   # All includes resolved
    assert "Think step by step" in rendered  # Fragment content present
```

---

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Instead |
|-------------|-------------|---------|
| Tags everywhere | Over-structuring a 2-line prompt adds noise | Use POML for prompts > 100 tokens |
| Nested conditionals 3+ deep | Unreadable, untestable | Flatten or split into separate templates |
| Variables without defaults | Breaks when context is incomplete | Use `{{var\|default}}` for optional fields |
| Giant monolithic template | Defeats composability | Split into `<include>` fragments |
| Mixing POML with raw XML instructions | Confuses tag boundaries | Keep POML tags separate from content XML |
| Using POML in user messages | User messages should be natural language | POML is for system/template prompts only |

---

## Keywords

poml, prompt orchestration, markup language, prompt templates, structured prompts, composable prompts, variable substitution, conditional prompts, prompt testing, prompt fragments
