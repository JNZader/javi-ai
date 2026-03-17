---
name: complexity-router
description: >
  Classifies task complexity (Small/Medium/Large) and routes to specialized agents with fresh context per phase.
  Trigger: When receiving a new task, feature request, or bug report that needs complexity assessment before implementation.
metadata:
  author: javi-ai
  version: "1.0"
  tags: [routing, orchestration, planning, agents]
  category: orchestration
allowed-tools: Read, Bash, Glob, Grep, Task
---

## Purpose

Prevent quality degradation on long tasks by classifying complexity upfront, routing to the right execution strategy, and using fresh agent contexts per phase.

---

## When to Activate

- New feature request or task description received
- Bug report that needs investigation
- Refactoring request
- Any task where scope is ambiguous
- User asks "how complex is this?" or "how should we approach this?"

---

## Complexity Classification

### Step 1: Analyze the Request

Evaluate these signals:

| Signal | Small | Medium | Large |
|--------|-------|--------|-------|
| Files affected | 1-2 | 3-5 | 6+ |
| New APIs/interfaces | 0 | 1-2 | 3+ |
| Cross-module changes | No | 1 boundary | Multiple |
| Database changes | No | Schema only | Schema + migration |
| Test impact | Update existing | New test file | New test suite |
| External dependencies | None | Config only | New packages |
| Reversibility | Easy revert | Partial revert | Hard to revert |

### Step 2: Classify

- **Small** — Can be done in a single pass. Direct implementation.
- **Medium** — Needs a brief design doc before coding. 2-3 phases.
- **Large** — Needs full SDD cycle (proposal -> spec -> design -> tasks).

### Step 3: Report Classification

```
## Complexity Assessment: [task name]

**Classification**: Medium (3-5 files, 1 API boundary)

**Signals**:
- Files: src/auth/jwt.ts, src/auth/middleware.ts, src/types/auth.ts, tests/auth/
- New API: refreshToken endpoint
- Cross-module: auth -> routes boundary
- Tests: new test file needed

**Recommended approach**: Design doc + 2-phase implementation
```

---

## Routing Strategies

### Small Tasks — Direct Implementation

```
1. Read the relevant file(s)
2. Make the change
3. Verify (run tests, type check)
4. Done
```

No planning phase needed. Single agent context.

### Medium Tasks — Design + Implement

```
Phase 1: Design (fresh context)
  - Read affected files
  - Write a brief design doc (inline, not a file)
  - Identify the implementation order
  - List edge cases

Phase 2: Implement (fresh context)
  - Read the design doc + affected files only
  - Implement changes in order
  - Write/update tests
  - Verify
```

Each phase runs in a **fresh agent context** to prevent context degradation.

### Large Tasks — Full SDD Cycle

```
Phase 1: Propose (fresh context)
  - Analyze scope, risks, dependencies
  - Write proposal with acceptance criteria

Phase 2: Spec + Design (fresh context)
  - Detailed requirements and scenarios
  - Architecture decisions and patterns

Phase 3: Tasks (fresh context)
  - Break into numbered work items
  - Estimate effort per task
  - Identify dependencies

Phase 4+: Apply (fresh context per task)
  - One work item per agent invocation
  - Verify after each task
  - Commit atomically
```

---

## Fullstack Routing

For tasks that span frontend and backend:

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
3. **Re-read the spec before each phase** — prevents drift from the plan
4. **Never skip the design phase for Medium+ tasks** — the 5 minutes saved costs 30 minutes debugging

---

## Rules

1. **Always classify before implementing** — even if it seems "obviously small"
2. **Fresh context per phase** — use the Task tool to spawn new agent contexts
3. **Show the classification to the user** — they may disagree and that's valuable
4. **Default to one size up** — if uncertain between Small and Medium, choose Medium
5. **Log the routing decision** — save to Engram for future reference
