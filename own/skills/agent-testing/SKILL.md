---
name: agent-testing
description: >
  Testing pyramid for AI agents — unit tests for prompts, scenario tests for workflows, and evaluation suites for quality.
  Trigger: When testing AI agents, validating prompt changes, evaluating LLM output quality, or building CI for AI features.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.1"
---

## Core Principle — The Agent Testing Pyramid

```
        /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
       /    Evaluation     \     ← Expensive, comprehensive, nightly
      /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
     /     Scenarios         \    ← Medium cost, workflow coverage, on PR
    /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
   /      Unit Tests           \   ← Fast, focused, many, every push
  /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
```

| Layer | Tests | Cost | Speed | LLM Calls |
|-------|-------|------|-------|-----------|
| **Unit** | Prompt rendering, output parsing, tool selection, schema validation | Low | Fast | None (mocked) |
| **Scenario** | Conversation replay, state machines, error recovery, handoffs | Medium | Moderate | Cheap model |
| **Evaluation** | Quality scoring, regression detection, A/B comparison, safety | High | Slow | Production model |

**Key rules**:
- Unit tests MUST run WITHOUT calling an LLM (mock the model)
- Scenario tests MAY call an LLM but SHOULD use a cheap/fast model
- Evaluation tests call production model and use LLM-as-Judge
- Push testing DOWN the pyramid

---

## Unit Testing Checklist

| What to Test | How |
|-------------|-----|
| Prompt rendering | Assert variables substituted, no unresolved `{placeholders}` |
| Output parsing | JSON extraction, markdown fence handling, malformed input |
| Template injection | Parametrized payloads (DAN, system override, role escape) |
| Tool selection | Query → tool mapping, max tools, no-tools for simple chat |
| Schema validation | Pydantic/Zod — valid, missing fields, out-of-range values |

---

## Scenario Testing Checklist

| What to Test | How |
|-------------|-----|
| Conversation replay | JSON fixtures with turns, tool call assertions, content checks |
| State machine | Transitions: IDLE → THINKING → TOOL_CALLING → RESPONDING → FALLBACK |
| Error recovery | Retry on failure, graceful degradation, invalid LLM output, context overflow |
| Agent handoffs | Multi-agent orchestration, data passing, rejection → rewrite loops |

---

## Evaluation (LLM-as-Judge)

| What to Test | How |
|-------------|-----|
| Quality | Judge scores responses on accuracy, clarity, completeness, relevance, safety |
| Regression | Compare against known-good baselines, detect >10% score drops |
| A/B testing | Compare prompt versions, new must win/tie >= 60% |
| Safety | Harmful request refusal, PII handling, role-breaking, benign edge cases |

**Judge pattern**: Send query + response + criteria to strong model, get JSON scores (1-5), normalize to 0-1, compare against threshold.

---

## Prompt Versioning

Store prompts as YAML files with metadata (version, author, status, changelog). Use `PromptManager` for loading, rollback, and diffing.

---

## CI/CD Integration

| Job | Trigger | Model | Cost |
|-----|---------|-------|------|
| Unit tests | Every push | None (mocked) | Free |
| Scenario tests | On PR (after unit pass) | gpt-4o-mini | ~$2/PR |
| Evaluation suite | Nightly / manual | gpt-4o | ~$50/night |
| Prompt change detection | On PR | None | Free |

---

## Anti-Patterns

1. **Testing exact strings** — LLMs are non-deterministic. Test semantics and structure.
2. **Skipping eval tests** — "Works on my machine" for AI. Automate quality regression.
3. **Hardcoding outputs** — Test properties, not specific text.
4. **Ignoring cost** — Tier execution: critical cases on PR, full suite nightly.
5. **Testing formatting over substance** — Content matters more than bullet format.

> @reference references/code-examples.md — Load when writing actual test implementations (Python unit/scenario/eval tests, TypeScript Vitest setup, LLM-as-Judge class, CI workflow YAML, prompt versioning system)

---

## Project Structure

```
tests/
├── conftest.py          # Shared config, markers, cost control
├── unit/                # Fast, no LLM
├── scenario/            # Medium cost, fixtures/
│   └── fixtures/*.json  # Recorded conversations
└── evaluation/          # Expensive, nightly
    ├── baselines/       # Known-good scores
    ├── judge.py         # LLM-as-Judge
    └── reporter.py      # Result collection
```

## Commands

```bash
pytest tests/unit/ -v -x                              # Unit (always)
pytest tests/scenario/ -v                              # Scenario (on PR)
RUN_EVAL_TESTS=true pytest tests/evaluation/ -v -m eval  # Eval (nightly)
```
