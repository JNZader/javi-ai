---
name: session-audit-trail
description: >
  Audit trail protocol for SDD workflow executions — run tracking, append-only event logs, replay, and engram integration.
  Trigger: When tracking SDD apply runs, reviewing past executions, debugging failed applies, or user mentions audit trail, run history, execution log.
metadata:
  author: javi-ai
  version: "1.0"
  tags: [audit, observability, SDD, run-tracking, engram]
  category: observability
allowed-tools: Read, Bash, mem_save, mem_search, mem_get_observation, mem_update
---

## Purpose

SDD workflows produce zero audit trail by default. When `/sdd-apply` runs, there is no record of what happened: which files changed, which tests ran, how long it took, or what failed. This skill defines the protocol for tracking SDD runs as auditable, replayable events stored in engram.

---

## 1. Core Concepts

```
Run        = One execution of /sdd-apply (or any SDD phase)
Event      = A single significant action within a run
Trail      = The complete ordered sequence of events for a run
Replay     = Reconstructing what happened by reading a trail
```

Each run gets a unique `run-id`: `{change-name}-{ISO-timestamp}` (e.g., `add-dark-mode-2026-03-31T10:00:00Z`).

---

## 2. Event Schema

### Run Record

```typescript
interface AuditRun {
  version: 1;
  run_id: string;           // {change-name}-{ISO-timestamp}
  change_name: string;
  project: string;
  started_at: string;       // ISO 8601
  ended_at?: string;
  status: 'running' | 'completed' | 'failed' | 'killed';
  tasks_completed: string[];
  files_changed: FileChange[];
  tests_run: { passed: number; failed: number; skipped: number };
  events: AuditEvent[];
}

interface FileChange {
  path: string;
  action: 'created' | 'modified' | 'deleted';
}
```

### Event Types

| Type | Payload | When |
|------|---------|------|
| `run_started` | `{ change: string }` | Apply begins |
| `task_started` | `{ id: string; description: string }` | Each task begins |
| `task_completed` | `{ id: string }` | Task finishes successfully |
| `task_failed` | `{ id: string; reason: string }` | Task fails |
| `test_passed` | `{ id: string; file: string }` | Test suite passes for task |
| `test_failed` | `{ id: string; file: string; error: string }` | Test suite fails |
| `file_created` | `{ path: string }` | New file written |
| `file_modified` | `{ path: string }` | Existing file edited |
| `file_deleted` | `{ path: string }` | File removed |
| `error` | `{ message: string; recoverable: boolean }` | Non-task error |
| `run_completed` | `{ duration_ms: number }` | Apply finishes successfully |
| `run_failed` | `{ reason: string }` | Apply fails |

Each event: `{ ts: string; type: EventType; detail: Payload }`

---

## 3. Engram Storage Convention

### Topic Key Format

```
audit/{project}/{run-id}        # Full run record + events
audit/{project}/index           # Optional: list of all run-ids
```

### Save a Run

```
mem_save(
  title: "audit/{project}/{run-id}",
  topic_key: "audit/{project}/{run-id}",
  type: "architecture",
  project: "{project}",
  content: "{JSON-serialized AuditRun}"
)
```

### Update During Execution

As events occur during a run, update the existing observation:

```
mem_update(
  id: {observation-id},
  content: "{updated JSON with new events appended}"
)
```

### Search Past Runs

```
mem_search(query: "audit/{project}", project: "{project}")
```

### Replay a Run

```
1. mem_search(query: "audit/{project}/{run-id}") → get observation ID
2. mem_get_observation(id: {id}) → full AuditRun JSON
3. Parse events array, display chronologically
```

---

## 4. Protocol: Emitting Events

### When to Emit

The orchestrator or sub-agent follows this protocol during `/sdd-apply`:

```
BEFORE any task work:
  1. Generate run-id: {change-name}-{new Date().toISOString()}
  2. Create AuditRun with status: 'running', empty events
  3. Append event: run_started
  4. mem_save the initial run record → save observation ID

FOR EACH task:
  5. Append event: task_started
  6. Execute the task
  7. On file operations: append file_created/modified/deleted events
  8. On test execution: append test_passed or test_failed
  9. Append event: task_completed or task_failed
  10. mem_update with new events

AFTER all tasks:
  11. Set ended_at, compute duration_ms
  12. Set status: completed (or failed)
  13. Append event: run_completed (or run_failed)
  14. Final mem_update

ON UNEXPECTED ERROR:
  15. Append event: error
  16. If unrecoverable: set status: failed, append run_failed
  17. mem_update
```

### Event Ordering

Events MUST be appended in chronological order. Events MUST NOT be modified or removed after creation (append-only).

---

## 5. Commands

| Command | Action |
|---------|--------|
| `audit start {change-name}` | Create a new run, emit `run_started` |
| `audit event {type} {detail}` | Append an event to the active run |
| `audit end {status}` | Close the active run |
| `audit replay {run-id}` | Display the full event timeline for a past run |
| `audit list {project}` | Search engram for all runs in a project |
| `audit summary {run-id}` | Show summary: duration, files changed, tests, status |

---

## 6. Replay Output Format

```markdown
## Audit Trail: {run-id}

**Change**: {change_name}
**Project**: {project}
**Status**: {status}
**Duration**: {duration}
**Started**: {started_at}
**Ended**: {ended_at}

### Files Changed
| File | Action |
|------|--------|
| `src/auth/middleware.ts` | created |
| `src/config/index.ts` | modified |

### Test Results
| Passed | Failed | Skipped |
|:------:|:------:|:-------:|
| 5 | 0 | 1 |

### Event Timeline
| Time | Event | Detail |
|------|-------|--------|
| 10:00:00 | run_started | add-dark-mode |
| 10:00:05 | task_started | 1.1 Create middleware |
| 10:00:12 | file_created | src/auth/middleware.ts |
| 10:00:15 | test_passed | 1.1 — auth.test.ts |
| 10:00:15 | task_completed | 1.1 |
| ... | ... | ... |
| 10:02:30 | run_completed | duration: 150000ms |
```

---

## 7. Relationship to Other Skills

| Skill | Relationship |
|-------|-------------|
| **subagent-observability** | Observability tracks token/cost metrics per agent; audit trail tracks workflow events per run |
| **cost-tracking** | Cost-tracking monitors budget; audit trail records what happened |
| **circuit-breaker** | Circuit-breaker kills runaway agents (produces `killed` status); audit trail records the kill event |
| **session-memory** | Session memory stores decisions; audit trail stores execution history |
| **sdd-apply** | Apply phase is the primary producer of audit events |

---

## 8. Anti-Patterns

1. **Emit without saving** — Events only in memory are lost on crash. Save to engram after each task batch.
2. **Store file contents in events** — Events track paths and actions, NOT file diffs. Keep events compact.
3. **Modify past events** — Append-only. If a correction is needed, append a new `error` event.
4. **One engram observation per event** — Creates hundreds of entries. Use one observation per run, update with `mem_update`.
5. **Skip error events** — Errors are the MOST valuable audit data. Always capture them.
6. **Hardcode run-id format** — Use `{change-name}-{ISO-timestamp}` consistently. Do not invent custom formats.

---

## 9. Configuration

```yaml
# Optional: in openspec/config.yaml or .ai-config/audit.yaml
audit:
  enabled: true               # Enable/disable audit trail
  auto_start: true            # Auto-create run on /sdd-apply
  save_interval: per_task     # per_task | per_phase | on_complete
  index_enabled: true         # Maintain audit/{project}/index
  retention_days: 90          # Prune runs older than this
```

---

## Quick Reference

| Item | Value |
|------|-------|
| Run ID format | `{change-name}-{ISO-timestamp}` |
| Engram topic key | `audit/{project}/{run-id}` |
| Event count per run | Typically 10-50 |
| Storage per run | ~2-5KB JSON |
| Replay command | `audit replay {run-id}` |

> @reference references/code-examples.md -- Load when implementing audit trail emission, replay parsing, or integrating with SDD apply workflow
