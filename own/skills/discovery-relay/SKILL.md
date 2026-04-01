---
name: discovery-relay
description: >
  Cross-wave discovery relay for SDD parallel apply — sub-agents save runtime discoveries to engram, orchestrator collects and injects them into the next wave's prompts.
  Trigger: When running SDD parallel apply with worktrees, when sub-agents need to share discoveries across waves, or when configuring wave-to-wave context passing.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

# Discovery Relay

Cross-wave knowledge transfer for SDD parallel apply. Wave N sub-agents save discoveries to engram; the orchestrator collects them and injects into wave N+1 prompts.

---

## 1. Core Principle

Parallel apply isolates sub-agents in worktrees — they cannot see each other's work. When wave 1 discovers a runtime constraint (API quirk, pattern requirement, config gotcha), wave 2 agents repeat the same mistakes or miss optimizations. Discovery relay bridges this gap through engram.

```
Wave 1: Agent A discovers "config loader is sync-only"
         │
         └── mem_save → Engram (scoped to change + wave + task)
                              │
Orchestrator: mem_search → collect all wave 1 discoveries
         │
         └── inject into wave 2 prompts
                              │
Wave 2: Agent B reads discovery → avoids async config call
```

---

## 2. Protocol

### Sub-Agent: Save Discovery

After completing a task, if the sub-agent encountered a non-obvious insight, it saves a discovery:

```
mem_save(
  title: "sdd/{change}/discoveries/wave-{N}/task-{id}",
  topic_key: "sdd/{change}/discoveries/wave-{N}/task-{id}",
  type: "discovery",
  project: "{project}",
  content: "**What**: {concise insight}
**Why**: {context that led to discovery}
**Where**: {affected files/modules}
**Impact**: {who needs this — which future tasks or areas}"
)
```

**When to save**: API constraints, unexpected type requirements, initialization order dependencies, performance gotchas, pattern deviations from design.

**When NOT to save**: Obvious patterns already in specs/design, personal preferences, general knowledge.

### Orchestrator: Collect Discoveries

Between waves, the orchestrator queries engram:

```
1. mem_search(query: "sdd/{change}/discoveries/wave-{N}", project: "{project}", limit: 10)
2. For each result: mem_get_observation(id: {id}) → full content
3. Aggregate into DISCOVERIES block
```

**Cap**: Maximum 10 discoveries per wave. If more found, take the 10 most recent and warn.

### Orchestrator: Inject Into Next Wave

Append collected discoveries to each wave N+1 sub-agent prompt:

```
DISCOVERIES FROM PREVIOUS WAVES:
(These are runtime insights from completed tasks. Use them to avoid repeating mistakes.)

- [Task 1.1] Config loader requires synchronous initialization — do not use async import()
- [Task 1.3] AuthService.validate() throws on empty string, not null — guard accordingly
- [Task 2.1] The merger module expects POSIX paths even on Windows — use path.posix
```

---

## 3. Topic Key Convention

```
sdd/{change-name}/discoveries/wave-{N}/task-{id}

Examples:
  sdd/add-auth/discoveries/wave-1/task-1.1
  sdd/add-auth/discoveries/wave-1/task-1.3
  sdd/add-auth/discoveries/wave-2/task-2.1
```

The orchestrator searches by prefix: `sdd/{change}/discoveries/wave-{N}` returns all discoveries for that wave.

---

## 4. Discovery Content Format

Every discovery MUST follow this structure:

| Field | Required | Description |
|-------|----------|-------------|
| **What** | Yes | One-line description of the insight |
| **Why** | Yes | Context: what you were doing when you found it |
| **Where** | Yes | File paths or modules affected |
| **Impact** | Yes | Which tasks or areas need this knowledge |

Keep each discovery under 100 words. Concise > comprehensive.

---

## 5. Integration Points

### With SDD Parallel Apply (CLAUDE.md)

The orchestrator's wave lifecycle gains a collect step between waves:

```
Wave N completes
  → Collect discoveries from engram (NEW)
  → Merge branches
  → Prepare wave N+1 prompts with discoveries injected (NEW)
  → Dispatch wave N+1
```

### With sdd-apply Sub-Agents

Sub-agents gain a save step after task completion:

```
Implement task
  → Mark task complete
  → If discovery found: mem_save discovery (NEW)
  → Return summary to orchestrator
```

---

## 6. Anti-Patterns

1. **Saving everything** — Only non-obvious insights. If it's in the specs or design, don't relay it.
2. **Huge discovery content** — Keep under 100 words. Link to files, don't paste code.
3. **Skipping collection** — Even if wave 1 had no errors, always search. Optimizations count too.
4. **Injecting stale discoveries** — Only inject from the immediately previous wave, not all historical waves.
5. **Blocking on zero discoveries** — No discoveries found is normal. Proceed without error.

> @reference references/prompt-templates.md -- Load when implementing the orchestrator collect/inject logic or adding discovery saves to sub-agent prompts

---

## Quick Reference

| Role | Action | Engram Call |
|------|--------|-------------|
| Sub-agent | Save discovery | `mem_save(topic_key: "sdd/{change}/discoveries/wave-{N}/task-{id}")` |
| Orchestrator | Search wave | `mem_search(query: "sdd/{change}/discoveries/wave-{N}")` |
| Orchestrator | Get full content | `mem_get_observation(id: {id})` |
| Orchestrator | Inject | Append `DISCOVERIES FROM PREVIOUS WAVES` to prompt |

### Decision Matrix

| Scenario | Save Discovery? |
|----------|----------------|
| Found API constraint not in design | Yes |
| Discovered initialization order dependency | Yes |
| Used a pattern already in specs | No |
| Hit a bug in a dependency | Yes |
| Task completed without surprises | No |
| Found performance optimization opportunity | Yes |
