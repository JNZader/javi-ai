---
name: ralph-loop
description: >
  Fresh context per iteration for long SDD sessions. State persists in engram, agent context resets between iterations. Prevents context rot in multi-hour sessions.
  Trigger: When running multi-phase SDD apply, long task lists, or user says "ralph loop", "fresh context loop", "context reset loop".
metadata:
  author: javi-ai
  version: "1.0"
  tags: [orchestration, context-management, iteration, engram, sdd]
  category: orchestration
  inspired-by: https://github.com/anthropics/claude-swarm
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
---

## Purpose

Long SDD sessions accumulate stale context — hallucinated file contents, outdated variable names, forgotten decisions. This is **context rot**. The longer an agent runs, the worse its output gets.

The Ralph Loop solves this by enforcing a hard context reset between iterations. State lives in engram (external memory), not in the agent's context window. Each iteration starts fresh: load state, execute one batch, save state, terminate. The orchestrator spawns a new agent for the next batch.

Named after the pattern from claude-swarm: the agent "dies" after each iteration and is "reborn" with only the persisted state.

```
Orchestrator
    |
    +---> Agent (iter 1): load state -> execute batch -> save state -> exit
    |
    +---> Agent (iter 2): load state -> execute batch -> save state -> exit
    |
    +---> Agent (iter N): load state -> execute batch -> save state -> DONE
```

---

## When to Activate

- SDD apply phase with 3+ phases of tasks
- Any task list where total execution exceeds ~50K tokens
- User explicitly requests: "ralph loop", "fresh context loop", "iterate with fresh context"
- Orchestrator detects context usage > 60% with remaining tasks

**Do NOT activate for:**
- Small tasks (1-2 phases, < 5 tasks total)
- Single-file changes
- Tasks that need cross-file awareness within a single iteration (use auto-continuation instead)

---

## Ralph Loop Protocol

### Step 1: Initialize Loop (Orchestrator)

The orchestrator creates the initial state and launches iteration 1.

```
1. Define loop-name (usually the SDD change-name)
2. Build initial state document with full task list
3. Save initial state:
   mem_save(
     title: "ralph/{loop-name}/state",
     topic_key: "ralph/{loop-name}/state",
     type: "architecture",
     project: "{project}",
     content: "{initial state document}"
   )
4. Spawn iteration 1 agent via Task tool
```

### Step 2: Load State (Iteration Agent)

Every iteration agent starts by loading persisted state. This is the ONLY source of truth — do NOT rely on the orchestrator prompt for task status.

```
1. mem_search(query: "ralph/{loop-name}/state", project: "{project}")
   -> Extract observation ID from results
2. mem_get_observation(id: {state-id})
   -> Full state document with completed/remaining tasks
3. Parse: which tasks are done, which are assigned to this iteration
```

If no state is found (should not happen after Step 1), report error and terminate.

### Step 3: Execute Task Batch (Iteration Agent)

Execute ONLY the tasks assigned to this iteration. Do not look ahead.

```
1. Read the spec and design from engram (same two-step: search -> get)
2. Read the actual source files needed for the assigned tasks
3. Implement each task in the batch
4. For each completed task: note files changed and decisions made
```

Follow all existing coding skills (TypeScript, React, testing patterns, etc.) as you normally would. The ralph loop does not change HOW you code — only how context is managed.

### Step 4: Save State (Iteration Agent)

After completing (or partially completing) the batch, persist updated state.

```
mem_save(
  title: "ralph/{loop-name}/state",
  topic_key: "ralph/{loop-name}/state",
  type: "architecture",
  project: "{project}",
  content: "{updated state document}"
)
```

The `topic_key` ensures upsert — the old state is replaced, not duplicated.

### Step 5: Return to Orchestrator (Iteration Agent)

Return a structured completion signal:

```markdown
## Ralph Loop Iteration Complete

**Loop**: {loop-name}
**Iteration**: {N}
**Status**: {complete | in-progress | blocked}

### Completed This Iteration
- [x] {task} -- {files changed}

### Remaining
- [ ] {next task}

### Decisions Made
- {decision and rationale}

### Blockers
- {blocker, or "None"}
```

### Step 6: Continue or Terminate (Orchestrator)

The orchestrator checks the iteration result:

```
IF status == "complete" AND no remaining tasks:
  -> Loop finished. Report to user.

IF status == "in-progress" AND remaining tasks exist:
  -> Spawn fresh agent for iteration N+1 via Task tool.
  -> Pass: loop-name, iteration number, assigned batch.

IF status == "blocked":
  -> Report blocker to user. Do NOT auto-retry.

IF iteration >= max_iterations (default: 10):
  -> Stop. Report partial progress to user.
```

---

## Engram State Schema

The state document follows this format:

```markdown
## Ralph Loop State: {loop-name}

**Iteration**: {N}
**Status**: in-progress | complete | blocked
**Started**: {ISO timestamp}
**Updated**: {ISO timestamp}
**Project**: {project path}

### Completed
- [x] 1.1 {task description} -- {files changed}
- [x] 1.2 {task description} -- {files changed}

### Current Batch
- [ ] 2.1 {task description}
- [ ] 2.2 {task description}

### Remaining
- [ ] 3.1 {task description}
- [ ] 3.2 {task description}

### Decisions Log
- Iteration 1: {decision and rationale}
- Iteration 2: {decision and rationale}

### Files Changed (Cumulative)
| File | Action | Iteration | Description |
|------|--------|-----------|-------------|
| `path/to/file.ts` | Created | 1 | {what it does} |
| `path/to/other.ts` | Modified | 2 | {what changed} |

### Blockers
- {blocker description, or "None"}
```

### Topic Key Convention

| Artifact | Topic Key |
|----------|-----------|
| Loop state | `ralph/{loop-name}/state` |

---

## Orchestrator Integration

### Spawn Pattern

The orchestrator embeds ralph loop instructions in each iteration agent's prompt:

```
Task(
  description: 'ralph-loop iteration {N} for {loop-name}',
  prompt: 'You are a Ralph Loop iteration agent.
  Read the skill at ~/.claude/skills/ralph-loop/SKILL.md FIRST.

  CONTEXT:
  - Loop: {loop-name}
  - Iteration: {N}
  - Project: {project path}
  - Assigned batch: {phase/tasks to execute}

  PROTOCOL:
  1. Load state from engram: ralph/{loop-name}/state
  2. Execute ONLY the assigned batch
  3. Save updated state to engram
  4. Return completion signal

  DO NOT execute tasks outside your assigned batch.
  DO NOT skip the state save step.'
)
```

### SDD Apply Integration

When ralph loop is active during SDD apply:

```
1. Orchestrator reads tasks from engram (sdd/{change}/tasks)
2. Groups tasks by phase (Phase 1, Phase 2, etc.)
3. Each phase becomes one ralph loop iteration
4. Orchestrator spawns one agent per phase with fresh context
5. State accumulates across iterations via engram
```

---

## Configuration

```yaml
# In openspec/config.yaml or passed via orchestrator
ralph-loop:
  enabled: false          # Must be explicitly enabled
  max_iterations: 10      # Hard stop to prevent infinite loops
  batch_strategy: phase   # "phase" = one phase per iteration, "count" = N tasks per iteration
  batch_size: 3           # Only used when batch_strategy is "count"
```

### Defaults (when no config exists)

| Setting | Default | Description |
|---------|---------|-------------|
| `max_iterations` | 10 | Maximum iterations before forced stop |
| `batch_strategy` | phase | Group tasks by SDD phase |
| `batch_size` | 3 | Tasks per batch (only for "count" strategy) |

---

## Relationship to Other Skills

| Skill | Relationship |
|-------|-------------|
| **auto-continuation** | Complementary. Auto-continuation preserves context across spawns. Ralph loop intentionally discards it. Use auto-continuation when cross-file awareness matters within a single unit of work. |
| **circuit-breaker** | Complementary. Circuit-breaker kills runaway agents. Ralph loop prevents the conditions that cause runaways (context rot). |
| **complexity-router** | Upstream. Complexity-router classifies tasks. Large tasks routed to SDD may trigger ralph loop during apply. |
| **sdd-apply** | Integration point. Ralph loop wraps the apply phase, splitting it into fresh-context iterations. |

---

## Critical Rules

1. **State in engram is the ONLY source of truth** -- never rely on orchestrator prompt for task progress after iteration 1
2. **One batch per iteration, no exceptions** -- executing extra tasks defeats the purpose of fresh context
3. **Always save state BEFORE returning** -- if the agent crashes after return but before save, state is lost
4. **Orchestrator controls the loop** -- agents never self-spawn the next iteration
5. **Load full state via two-step retrieval** -- `mem_search` returns truncated previews; always follow with `mem_get_observation`
6. **Never skip state loading on iteration N > 1** -- starting without state means starting blind
7. **Max iterations is a hard limit** -- even if tasks remain, stop at the configured maximum
8. **Decisions log is append-only** -- each iteration adds its decisions; never overwrite previous iterations' entries
9. **Files Changed table is cumulative** -- later iterations add rows, never remove previous ones
10. **Do NOT activate for small tasks** -- ralph loop overhead is only worth it for 3+ phase task lists
