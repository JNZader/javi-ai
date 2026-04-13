---
name: sdd-kanban
description: >
  Renders SDD task lists as a text-based Kanban board with TODO, IN PROGRESS, and DONE columns.
  Reads task state from tasks.md (openspec) or engram and presents a visual board in the terminal.
  Trigger: When user says "kanban", "board", "task board", "show board", or "/sdd-kanban".
metadata:
  author: javi-ai
  version: "1.0"
  tags: [sdd, kanban, tasks, visualization]
  category: workflow
allowed-tools: Read, Glob, Grep, mcp__plugin_engram_engram__mem_search, mcp__plugin_engram_engram__mem_get_observation
---

## Purpose

Provide a text-based Kanban board view of SDD tasks. Instead of reading a flat checklist in tasks.md, see tasks organized into columns that show workflow state at a glance. This is a READ-ONLY visualization — it does not modify task state.

---

## What You Receive

The orchestrator will give you:
- A change name (required)
- Artifact store mode (`engram | openspec | hybrid | none`)
- Optional: filter by phase (e.g., "Phase 1 only")

---

## Steps

### Step 1: Load Task Data

**From engram** (preferred):
```
mem_search(query: "sdd/{change-name}/tasks", project: "{project}")
mem_get_observation(id: {result})
```

**From openspec** (fallback):
Read `openspec/changes/{change-name}/tasks.md`

**From inline** (last resort):
If the orchestrator passed task data in the prompt, use that.

### Step 2: Parse Task States

Scan the task list for checkbox markers and status annotations:

| Marker | State |
|--------|-------|
| `- [ ]` | TODO |
| `- [~]` or `- [ ] <!-- in-progress -->` or tasks listed in apply-progress as "current" | IN PROGRESS |
| `- [x]` | DONE |

Also check for apply-progress artifact to detect tasks currently being worked on:
```
mem_search(query: "sdd/{change-name}/apply-progress", project: "{project}")
```
Tasks listed as "in progress" or "current batch" in apply-progress override their checkbox state.

### Step 3: Load Phase Structure

Tasks are typically organized by phases in tasks.md:
```markdown
## Phase 1: Core Setup
- [x] 1.1 Create base types
- [~] 1.2 Add validation layer
- [ ] 1.3 Wire up events

## Phase 2: Integration
- [ ] 2.1 Connect to API
- [ ] 2.2 Add error handling
```

Preserve the phase grouping in the board output.

### Step 4: Render Kanban Board

Output the board in this exact format:

```
=================================================================
  KANBAN: {change-name}
  Updated: {current timestamp}
=================================================================

  TODO                | IN PROGRESS         | DONE
  ------------------- | ------------------- | -------------------
  [Phase 1]           |                     |
                      | 1.2 Validation      | 1.1 Base types
  1.3 Wire events     |                     |
  ------------------- | ------------------- | -------------------
  [Phase 2]           |                     |
  2.1 Connect API     |                     |
  2.2 Error handling   |                     |
  ------------------- | ------------------- | -------------------

  Summary: 3 TODO | 1 IN PROGRESS | 1 DONE (20% complete)
=================================================================
```

**Rendering rules**:
- Column width: 20 characters per column (truncate task names with `...` if needed)
- Phase headers appear in the TODO column as section markers `[Phase N]`
- Tasks flow into their respective columns based on state
- Empty cells get blank padding to maintain alignment
- Summary line shows counts and completion percentage

### Step 5: Optional WIP Limit Warning

If more than 3 tasks are IN PROGRESS simultaneously, append a warning:

```
  WARNING: WIP limit exceeded (3+ tasks in progress)
  Consider completing current work before starting new tasks.
```

### Step 6: Return to Orchestrator

Return structured output:
```json
{
  "status": "success",
  "board": "{rendered board text}",
  "summary": {
    "todo": N,
    "in_progress": N,
    "done": N,
    "total": N,
    "completion_pct": N
  },
  "wip_warning": true/false,
  "phases": [
    { "name": "Phase 1", "todo": N, "in_progress": N, "done": N }
  ]
}
```

---

## Rules

1. This skill is READ-ONLY — never modify tasks.md or any artifacts
2. If no tasks are found, return an empty board with a clear message
3. Task names in the board should be concise — use task ID + short description
4. Always show the summary line with counts and percentage
5. Support both engram and openspec as data sources
6. If a task has subtasks, show only the parent task in the board (not subtasks)
