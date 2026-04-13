---
name: sdd-tasks
description: >
  Break down a change into an implementation task checklist.
  Trigger: When the orchestrator launches you to create or update the task breakdown for a change.
license: MIT
metadata:
  author: gentleman-programming
  version: "2.1"
---

## Purpose

You are a sub-agent responsible for creating the TASK BREAKDOWN. You take the proposal, specs, and design, then produce a `tasks.md` with concrete, actionable implementation steps organized by phase.

## What You Receive

From the orchestrator:
- Change name
- Artifact store mode (`engram | openspec | hybrid | none`)

## Execution and Persistence Contract

Read and follow `skills/_shared/persistence-contract.md` for mode resolution rules.

- If mode is `engram`:

  **Read dependencies** (two-step — search returns truncated previews):
  1. `mem_search(query: "sdd/{change-name}/proposal", project: "{project}")` → get ID
  2. `mem_get_observation(id: {id})` → full proposal (REQUIRED)
  3. `mem_search(query: "sdd/{change-name}/spec", project: "{project}")` → get ID
  4. `mem_get_observation(id: {id})` → full spec (REQUIRED)
  5. `mem_search(query: "sdd/{change-name}/design", project: "{project}")` → get ID
  6. `mem_get_observation(id: {id})` → full design (REQUIRED)

  **Save your artifact**:
  ```
  mem_save(
    title: "sdd/{change-name}/tasks",
    topic_key: "sdd/{change-name}/tasks",
    type: "architecture",
    project: "{project}",
    content: "{your full tasks markdown}"
  )
  ```
  `topic_key` enables upserts — saving again updates, not duplicates.

  (See `skills/_shared/engram-convention.md` for full naming conventions.)
- If mode is `openspec`: Read and follow `skills/_shared/openspec-convention.md`.
- If mode is `hybrid`: Follow BOTH conventions — persist to Engram AND write `tasks.md` to filesystem. Retrieve dependencies from Engram (primary) with filesystem fallback.
- If mode is `none`: Return result only. Never create or modify project files.

## What to Do

### Step 1: Load Skill Registry

**Do this FIRST, before any other work.**

1. Try engram first: `mem_search(query: "skill-registry", project: "{project}")` → if found, `mem_get_observation(id)` for the full registry
2. If engram not available or not found: read `.atl/skill-registry.md` from the project root
3. If neither exists: proceed without skills (not an error)

From the registry, identify and read any skills whose triggers match your task. Also read any project convention files listed in the registry.

### Step 2: Analyze the Design

From the design document, identify:
- All files that need to be created/modified/deleted
- The dependency order (what must come first)
- Testing requirements per component

### Step 3: Write tasks.md

Create the task file:

```
openspec/changes/{change-name}/
├── proposal.md
├── specs/
├── design.md
└── tasks.md               ← You create this
```

#### Task File Format

```markdown
# Tasks: {Change Title}

## Action Catalog

> Impact estimates for prioritization. Agents SHOULD work on high-impact tasks first within each phase.

| Task | Impact | Complexity | Dependencies | Priority |
|------|--------|-----------|--------------|----------|
| 1.1 | 🔴 high | M | — | P0 |
| 1.2 | 🔴 high | S | 1.1 | P0 |
| 1.3 | 🟡 medium | M | 1.1 | P1 |
| 2.1 | 🔴 high | L | 1.1, 1.2 | P0 |
| 2.2 | 🟡 medium | M | 2.1 | P1 |
| 2.3 | 🟢 low | S | — | P2 |
| 3.1 | 🟡 medium | M | 2.1 | P1 |
| 4.1 | 🟢 low | S | all | P2 |

### Impact Legend
- 🔴 **high**: Core to the change — without this, the feature does not work
- 🟡 **medium**: Important for completeness — feature works but is incomplete/fragile without it
- 🟢 **low**: Polish, docs, or edge cases — nice to have, not blocking

### Complexity Legend
- **S** (Small): Single file, straightforward change, < 50 lines
- **M** (Medium): 1-3 files, moderate logic, 50-200 lines
- **L** (Large): 3+ files, complex logic or coordination, 200+ lines

### Priority Legend
- **P0**: Must be done first — other tasks depend on this or it delivers the core value
- **P1**: Should be done next — important for feature completeness
- **P2**: Can be deferred — polish, optimization, or nice-to-have

---

## Phase 1: {Phase Name} (e.g., Infrastructure / Foundation)

- [ ] 1.1 {Concrete action — what file, what change} `[impact:high, complexity:M, deps:—]`
- [ ] 1.2 {Concrete action} `[impact:high, complexity:S, deps:1.1]`
- [ ] 1.3 {Concrete action} `[impact:medium, complexity:M, deps:1.1]`

## Phase 2: {Phase Name} (e.g., Core Implementation)

- [ ] 2.1 {Concrete action} `[impact:high, complexity:L, deps:1.1,1.2]`
- [ ] 2.2 {Concrete action} `[impact:medium, complexity:M, deps:2.1]`
- [ ] 2.3 {Concrete action} `[impact:low, complexity:S, deps:—]`
- [ ] 2.4 {Concrete action} `[impact:medium, complexity:M, deps:2.1]`

## Phase 3: {Phase Name} (e.g., Testing / Verification)

- [ ] 3.1 {Write tests for ...} `[impact:medium, complexity:M, deps:2.1]`
- [ ] 3.2 {Write tests for ...} `[impact:medium, complexity:M, deps:2.2]`
- [ ] 3.3 {Verify integration between ...} `[impact:medium, complexity:L, deps:3.1,3.2]`

## Phase 4: {Phase Name} (e.g., Cleanup / Documentation)

- [ ] 4.1 {Update docs/comments} `[impact:low, complexity:S, deps:all]`
- [ ] 4.2 {Remove temporary code} `[impact:low, complexity:S, deps:all]`
```

### Task Writing Rules

Each task MUST be:

| Criteria | Example ✅ | Anti-example ❌ |
|----------|-----------|----------------|
| **Specific** | "Create `internal/auth/middleware.go` with JWT validation" | "Add auth" |
| **Actionable** | "Add `ValidateToken()` method to `AuthService`" | "Handle tokens" |
| **Verifiable** | "Test: `POST /login` returns 401 without token" | "Make sure it works" |
| **Small** | One file or one logical unit of work | "Implement the feature" |
| **Impact-tagged** | `[impact:high, complexity:M, deps:1.1]` inline tag | No impact annotation |

### Impact Estimation Guidelines

When assigning impact, ask: **"If this task is NOT done, how broken is the feature?"**

```
Determining impact:
├── HIGH: Feature does not work without this task
│   Examples: core data model, main business logic, critical API endpoint
├── MEDIUM: Feature works but is incomplete, fragile, or hard to use
│   Examples: error handling, validation, secondary flows, integration wiring
└── LOW: Feature works fine, this is polish
    Examples: documentation, logging, optimization, edge case handling

Determining complexity:
├── S (Small): < 50 lines, single file, well-understood pattern
├── M (Medium): 50-200 lines, 1-3 files, some design decisions needed
└── L (Large): 200+ lines, 3+ files, complex coordination or new patterns

Determining priority:
├── P0 = high impact OR is a dependency for other P0 tasks
├── P1 = medium impact AND not blocking other tasks
└── P2 = low impact OR can be safely deferred
```

**Within each phase, order tasks by priority (P0 first, then P1, then P2).** This ensures agents working sequentially tackle the highest-value work first.

### Phase Organization Guidelines

```
Phase 1: Foundation / Infrastructure
  └─ New types, interfaces, database changes, config
  └─ Things other tasks depend on

Phase 2: Core Implementation
  └─ Main logic, business rules, core behavior
  └─ The meat of the change

Phase 3: Integration / Wiring
  └─ Connect components, routes, UI wiring
  └─ Make everything work together

Phase 4: Testing
  └─ Unit tests, integration tests, e2e tests
  └─ Verify against spec scenarios

Phase 5: Cleanup (if needed)
  └─ Documentation, remove dead code, polish
```

### Step 4: Persist Artifact

**This step is MANDATORY — do NOT skip it.**

If mode is `engram`:
```
mem_save(
  title: "sdd/{change-name}/tasks",
  topic_key: "sdd/{change-name}/tasks",
  type: "architecture",
  project: "{project}",
  content: "{your full tasks markdown from Step 3}"
)
```

If mode is `openspec` or `hybrid`: the file was already written in Step 3.

If mode is `hybrid`: also call `mem_save` as above (write to BOTH backends).

If you skip this step, the next phase (sdd-apply) will NOT be able to find your tasks and the pipeline BREAKS.

### Step 5: Return Summary

Return to the orchestrator:

```markdown
## Tasks Created

**Change**: {change-name}
**Location**: openspec/changes/{change-name}/tasks.md

### Breakdown
| Phase | Tasks | Focus |
|-------|-------|-------|
| Phase 1 | {N} | {Phase name} |
| Phase 2 | {N} | {Phase name} |
| Phase 3 | {N} | {Phase name} |
| Total | {N} | |

### Impact Distribution
| Priority | Count | Description |
|----------|-------|-------------|
| P0 (critical) | {N} | Must-do tasks that deliver core value |
| P1 (important) | {N} | Completeness and robustness tasks |
| P2 (deferrable) | {N} | Polish, docs, edge cases |

### Implementation Order
{Brief description of the recommended order and why, referencing priority levels}

### Critical Path
{List the P0 tasks in dependency order — this is the minimum viable implementation path}

### Next Step
Ready for implementation (sdd-apply).
```

## Rules

- ALWAYS reference concrete file paths in tasks
- Tasks MUST be ordered by dependency — Phase 1 tasks shouldn't depend on Phase 2
- Testing tasks should reference specific scenarios from the specs
- Each task should be completable in ONE session (if a task feels too big, split it)
- Use hierarchical numbering: 1.1, 1.2, 2.1, 2.2, etc.
- NEVER include vague tasks like "implement feature" or "add tests"
- EVERY task MUST include an inline impact tag: `[impact:high|medium|low, complexity:S|M|L, deps:...]`
- ALWAYS generate the Action Catalog table at the top of tasks.md — it is the priority map for sdd-apply
- ALWAYS order tasks within each phase by priority (P0 → P1 → P2)
- ALWAYS identify the critical path (P0 dependency chain) in the return summary
- Apply any `rules.tasks` from `openspec/config.yaml`
- If the project uses TDD, integrate test-first tasks: RED task (write failing test) → GREEN task (make it pass) → REFACTOR task (clean up)
- Return a structured envelope with: `status`, `executive_summary`, `detailed_report` (optional), `artifacts`, `next_recommended`, and `risks`
