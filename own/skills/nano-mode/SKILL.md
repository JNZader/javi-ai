---
name: nano-mode
description: >
  SDD-lite for small changes. Fast-track: challenge, plan, build, review — all inline, no sub-agents.
  Triggered by `/nano <description>`. Skips the full SDD pipeline when a change is too small to justify it.
license: MIT
metadata:
  author: JNZader
  version: "1.0"
---

## Purpose

Nano mode is an inline, single-agent workflow for changes that are too small for the full SDD pipeline but still benefit from structured thinking. It replaces the 8-phase SDD flow with 4 fast steps: **Challenge, Plan, Build, Review**.

## When to Use

- Single-file changes or small multi-file edits (< 5 files)
- Bug fixes with clear scope
- Adding a new function, endpoint, or component
- Config changes, refactors under 100 LOC
- Anything where spinning up sub-agents would cost more than the change itself

## When NOT to Use (Escalate to Full SDD)

- Multi-domain changes touching > 5 files
- New architectural patterns or abstractions
- Breaking changes to public APIs
- Changes requiring design decisions with tradeoffs
- Anything where "I need to think about this" applies

## Trigger

```
/nano <one-line description of the change>
```

## Workflow

### Phase 1: Challenge (30 seconds)

Before writing ANY code, answer these questions inline:

```markdown
## Challenge
- **What**: {one-line description}
- **Why**: {what problem does this solve?}
- **Where**: {which files are affected?}
- **Risk**: {Low | Medium — if High, escalate to /sdd-new}
- **Test**: {how will we verify this works?}
```

If Risk is High, STOP and recommend `/sdd-new` instead.

### Phase 2: Plan (60 seconds)

Write a mini task list — 3-7 concrete steps:

```markdown
## Plan
1. {specific action with file path}
2. {specific action with file path}
3. {write/update test for X}
```

Rules:
- Every plan MUST include at least one test step
- Each step references a concrete file path
- If the plan exceeds 7 steps, escalate to `/sdd-new`

### Phase 3: Build (implementation)

Execute the plan sequentially:
- Follow existing code patterns and conventions
- Run tests after implementation
- Commit atomically per logical unit (not per file)

### Phase 4: Review (30 seconds)

Self-review checklist:

```markdown
## Review
- [ ] All plan steps completed
- [ ] Tests pass
- [ ] No unintended side effects
- [ ] Code matches project conventions
- [ ] Changes are minimal — no scope creep
```

If any item fails, fix it before reporting done.

## Output Format

Return a structured summary:

```markdown
## Nano Complete

**Change**: {description}
**Files**: {N} modified, {M} created
**Tests**: {pass/fail} ({N} assertions)
**Commits**: {list of commit SHAs with messages}
**Duration**: {challenge + plan + build + review}
```

## Engram Integration

If engram is available, save a lightweight record:

```
mem_save(
  title: "nano/{short-slug}",
  topic_key: "nano/{short-slug}",
  type: "architecture",
  project: "{project}",
  content: "{challenge + plan summary + files changed + test results}"
)
```

## Critical Rules

1. NEVER skip the Challenge phase — it catches scope creep before it starts
2. NEVER exceed 7 plan steps — if you need more, escalate to full SDD
3. ALWAYS include at least one test step in the plan
4. ALWAYS run tests before declaring done
5. Keep the entire nano flow inline — no sub-agents, no file artifacts (except code)
6. If you discover the change is bigger than expected during Build, STOP and escalate
7. Commit messages use conventional commits format
8. The whole flow should complete in under 5 minutes for a typical change
