---
name: complexity-router
description: >
  Labels task width (loose / tracked / specified) from size and reversibility
  signals. Does not choose the development method. OpenSpec/SDD is Specified only.
  Trigger: When receiving a new task, feature request, or bug report that needs
  a width label before implementation.
metadata:
  author: javi-ai
  version: "1.2"
  tags: [routing, orchestration, planning, agents]
  category: orchestration
allowed-tools: Read, Bash, Glob, Grep, Task
---

## Purpose

Prevent quality degradation on long tasks by labeling **width** upfront.
This skill is a **labeler**, not a method router. The owned table is javi-platform
ADR-013 / `DEV-METHOD-WIDTHS.md`. ODD is the spine on every width.

Do **not** map Large → full SDD. Do **not** start OpenSpec because of file count.

---

## When to Activate

- New feature request or task description received
- Bug report that needs investigation
- Refactoring request
- Any task where scope is ambiguous
- User asks "how complex is this?" or "how should we approach this?"

---

## Width classification

### Step 1: Analyze the request

Evaluate these signals (they inform Loose vs Tracked and whether to delegate).
They do **not** select OpenSpec.

| Signal | Loose | Tracked | Specified (only with triggers below) |
|--------|-------|---------|--------------------------------------|
| Files affected | 1-2 | 3+ | not sufficient alone |
| New APIs/interfaces | 0 | 1-2 | public or cross-package contract |
| Cross-module changes | No | 1 boundary | shared meaning across packages |
| Database changes | No | Schema only | hard-to-revert data / migration |
| Test impact | Update existing | New test file | — |
| External dependencies | None | Config only | — |
| Reversibility | Easy revert | Partial revert | Hard to revert |

### Step 2: Classify **one** width

- **Loose** — 1–2 files, reversible, no new contract. Inline. No durable task file.
- **Tracked** — several files, one boundary, must survive a session cut. Track
  before the first source write (`odd/tasks/<feature>.md` or project equivalent)
  plus a design beat (chat or a short design note — **not** OpenSpec).
- **Specified** — durable spec required. Enter **only** if one of these is true:
  - public or cross-package contract, API, or shared meaning
  - auth, tenant, RLS, or other security boundary
  - hard-to-revert data or migration
  - the user asked for spec / `/opsx:propose` / equivalent

Never enter Specified because of file count, “it is a feature”, or a multi-file
refactor.

### Step 3: Report classification

```
## Width: [task name]

**Width**: Tracked (3-5 files, 1 API boundary, reversible)

**Signals**:
- Files: ...
- New API: ...
- Cross-module: ...
- Tests: ...

**Method**: ODD loop. Artifact = odd/tasks + design beat. Not OpenSpec.
```

---

## Execution after the label (still ODD)

### Loose

1. Read the relevant file(s)
2. Make the change
3. Verify (tests, typecheck)
4. Done

Single agent context. No OpenSpec.

### Tracked

1. Design beat (inline or a short note — not `openspec/`)
2. Track the feature before the first source write
3. One writer. If 4+ files to understand or 2+ non-trivial writes, delegate
   **one** writer (fresh context is execution, not a method switch)
4. Tests/docs with the behavior

### Specified

Same ODD loop. Tracking lives in `openspec/changes/<name>/`. Engine is
OpenSpec OPSX (`/opsx:propose`, `/opsx:apply`, `/opsx:update`, `/opsx:archive`),
not Gentle `/sdd-*`. Do not dual-run both.

---

## Fullstack routing

For tasks that span frontend and backend (after width is set):

### Detection Rules

| Pattern | Route to |
|---------|----------|
| `src/components/`, `src/pages/`, `*.tsx`, `*.vue`, `*.svelte` | Frontend executor |
| `src/api/`, `src/routes/`, `src/services/`, `*.go`, `*.py` (API) | Backend executor |
| `src/types/`, `src/shared/`, `*.proto` | Shared — both executors |
| `migrations/`, `prisma/`, `*.sql` | Database — backend executor |
| `tests/e2e/`, `playwright/`, `cypress/` | E2E — dedicated executor |

### Cross-boundary Tasks

When a task crosses frontend/backend:

1. Implement backend first (API contract)
2. Then frontend (consuming the API)
3. Then E2E tests (verifying integration)
4. Each phase in a fresh context

---

## Anti-Fatigue Rules

Long sessions degrade quality. Enforce these guardrails:

1. **Max 3 file changes per agent context** — if more are needed, spawn a new context
2. **Verify after each change** — run tests, don't batch verifications
3. **Re-read the width/spec before each phase** — prevents drift from the plan
4. **Never skip the design beat for Tracked or Specified** — the 5 minutes saved costs 30 minutes debugging

---

## Rules

1. **Always label width before implementing** — even if it seems "obviously small"
2. **Fresh context is delegation, not a method** — do not start OpenSpec because you spawned a writer
3. **Show the width to the user** — they may disagree and that's valuable
4. **If uncertain between Loose and Tracked, choose Tracked** — not Specified
5. **If uncertain whether Specified triggers apply, ask** — do not default to OpenSpec
6. **Log the width** — save to Engram for future reference
