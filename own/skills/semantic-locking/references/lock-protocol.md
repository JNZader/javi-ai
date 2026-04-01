# Lock Protocol Reference

Detailed engram schemas, conflict algorithm, TTL management, and orchestrator cleanup procedures.

---

## Engram Lock Operations

### Acquire Lock

```
mem_save(
  title: "lock: {agent-id} -> {file}:{symbol}",
  topic_key: "locks/{change-name}/{file-path-hash}/{symbol-name}",
  type: "architecture",
  project: "{project}",
  content: "agent_id: {agent-id}\nfile: {file-path}\nsymbol: {symbol-name}\nsymbol_type: {type}\nline_start: {N}\nline_end: {M}\nacquired_at: {ISO-timestamp}\nttl_seconds: 300\nstatus: active"
)
```

**File path hash**: Use a simplified hash to keep topic_key readable. Replace `/` with `--` and drop the extension:
- `src/services/order.ts` → `src--services--order`

**Topic key enables upsert**: Re-saving with the same topic_key updates the lock (TTL refresh).

### Release Lock

```
mem_update(
  id: {lock-observation-id},
  content: "...status: released..."
)
```

Or the orchestrator can simply ignore locks where `status: released` or where `acquired_at + ttl_seconds < now()`.

### Query Locks for a File

```
mem_search(
  query: "locks/{change-name}/{file-path-hash}",
  project: "{project}",
  limit: 20
)
```

This returns all locks on symbols within that file. The orchestrator then checks each for overlap with the requested range.

---

## Conflict Detection Algorithm

```
function check_conflict(new_lock, existing_locks):
  for each lock in existing_locks:
    if lock.status != "active":
      continue
    if lock.agent_id == new_lock.agent_id:
      continue  # same agent, will upsert
    if is_expired(lock):
      continue  # TTL expired, ignore
    if lock.file != new_lock.file:
      continue  # different file, no conflict
    if ranges_overlap(lock, new_lock):
      return CONFLICT(lock, new_lock)
  return NO_CONFLICT

function ranges_overlap(a, b):
  return a.line_start <= b.line_end AND b.line_start <= a.line_end

function is_expired(lock):
  return now() > parse(lock.acquired_at) + lock.ttl_seconds
```

---

## TTL Management

### Default TTL by Phase Complexity

| Task Complexity | Suggested TTL | Rationale |
|----------------|---------------|-----------|
| Small (1-2 functions) | 180s (3 min) | Quick edits, fast turnaround |
| Medium (3-5 functions) | 300s (5 min) | Default, covers most tasks |
| Large (6+ functions) | 600s (10 min) | Complex refactors need more time |

### TTL Refresh

Agents SHOULD refresh their locks midway through long tasks:

```
mem_save(
  title: "lock: {agent-id} -> {file}:{symbol}",
  topic_key: "locks/{change-name}/{file-path-hash}/{symbol-name}",
  ...same content with updated acquired_at...
)
```

The upsert via `topic_key` updates the timestamp without creating duplicates.

---

## Orchestrator Cleanup Procedure

### On Wave Completion (Success or Failure)

```
1. mem_search(query: "locks/{change-name}", project: "{project}", limit: 20)
2. For each lock found:
   a. If status == "active" → mem_update(id: {id}, content: "...status: released...")
   b. Log: "Released stale lock: {agent-id} -> {file}:{symbol}"
3. Report cleanup summary to user
```

### On Agent Failure

```
1. mem_search(query: "locks/{change-name}", project: "{project}", limit: 20)
2. For each lock where agent_id matches the failed agent:
   a. mem_update(id: {id}, content: "...status: released...")
   b. Log: "Force-released lock from failed agent: {symbol}"
```

### On Session End

```
1. Release ALL locks for the change (same as wave completion)
2. This prevents cross-session lock leaks
```

---

## Deadlock Detection Procedure

```
Build wait-for graph:
  For each pending lock request P:
    P.agent wants lock on symbol S
    S is held by agent H
    Add edge: P.agent → H

  If graph contains a cycle:
    Identify the agent with HIGHEST task number in the cycle
    Force-release that agent's blocking lock
    Report: "Deadlock detected: {agent-A} ↔ {agent-B}. Released {agent-B}'s lock on {symbol}."
```

### Priority Rules

- Lower task number = higher priority (task 1.1 > task 2.3)
- If task numbers are equal, the agent that acquired first wins
- The yielding agent receives a CONFLICT response and must retry or report

---

## Edge Cases

| Case | Handling |
|------|----------|
| Agent crashes mid-work | TTL expires, orchestrator cleanup releases lock |
| Lock on deleted lines (file shrank) | Treat as expired — line range no longer valid |
| Two agents want adjacent ranges (no overlap) | Both granted — adjacency is not overlap |
| Agent modifies lines outside its lock | Protocol violation — caught during verify phase |
| Engram unavailable | Fall back to file-level isolation (worktree mode) |
