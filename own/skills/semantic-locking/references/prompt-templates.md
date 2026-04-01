# Prompt Templates Reference

Orchestrator and sub-agent prompt injection blocks for semantic locking.

---

## Orchestrator Injection Block

Add this to every sub-agent prompt during parallel apply when `semantic-locking.enabled: true`:

```
SEMANTIC LOCKING (active):
You are operating under the semantic locking protocol. Follow these steps EXACTLY:

1. DECLARE INTENT — Before modifying any file:
   a. Read the target file completely
   b. Identify every function/class/method you plan to modify
   c. For each symbol, record: name, type, line_start, line_end
   d. Save each lock to engram:
      mem_save(
        title: "lock: {your-task-id} -> {file}:{symbol}",
        topic_key: "locks/{change-name}/{file-hash}/{symbol}",
        type: "architecture",
        project: "{project}",
        content: "agent_id: {your-task-id}\nfile: {path}\nsymbol: {name}\nsymbol_type: {type}\nline_start: {N}\nline_end: {M}\nacquired_at: {now-ISO}\nttl_seconds: 300\nstatus: active"
      )

2. CHECK FOR CONFLICTS — Before writing code:
   a. Search for existing locks on each target file:
      mem_search(query: "locks/{change-name}/{file-hash}", project: "{project}")
   b. For each existing lock with status "active" and different agent_id:
      - If your line range overlaps theirs → STOP, do NOT write
      - Report: "LOCK_CONFLICT: {your-symbol} overlaps {their-symbol} held by {their-agent}"
   c. If no conflicts → proceed to write

3. WORK — Modify ONLY your locked symbols:
   - Do NOT edit lines outside your declared ranges
   - If you discover you need to modify additional symbols, go back to step 1

4. RELEASE — After completing all edits:
   a. For each lock you acquired, update status to released:
      mem_search your locks → mem_update(id: {id}, content: "...status: released...")
   b. If you cannot release (crash/error), locks will auto-expire via TTL

SELF-CHECK:
- Am I about to edit a function I didn't lock? → STOP, declare intent first
- Did I check for conflicts before writing? → If not, check now
- Am I modifying lines outside my range? → STOP, that's a protocol violation
```

---

## Orchestrator Pre-Dispatch Check

Before launching sub-agents in a wave, the orchestrator runs:

```
PRE-DISPATCH CONFLICT CHECK:
For each agent in this wave:
  1. Analyze the task description to predict which files/symbols will be touched
  2. mem_search(query: "locks/{change-name}", project: "{project}")
  3. If any active lock from a PREVIOUS wave overlaps predicted targets:
     a. Option A: Wait for TTL expiry
     b. Option B: Force-release stale locks from completed waves
     c. Option C: Serialize the conflicting task into the next wave
```

---

## Orchestrator Post-Wave Cleanup

After all sub-agents in a wave complete:

```
POST-WAVE CLEANUP:
1. mem_search(query: "locks/{change-name}", project: "{project}", limit: 20)
2. For each result:
   - mem_get_observation(id) → check status
   - If status == "active" → mem_update(id, content with status: released)
   - Log: "Cleaned up lock: {agent} -> {file}:{symbol}"
3. Verify: zero active locks remain for this change
```

---

## Conflict Report Template

When a sub-agent detects a conflict:

```
LOCK_CONFLICT detected:
  Requesting agent: {my-task-id}
  Requesting symbol: {my-symbol} (lines {my-start}-{my-end})
  Conflicting agent: {their-task-id}
  Conflicting symbol: {their-symbol} (lines {their-start}-{their-end})
  File: {file-path}
  Action: STOPPED — did not write any code
  Recommendation: Serialize these tasks or reassign non-overlapping symbols
```

---

## Configuration Injection

When the orchestrator detects `semantic-locking.enabled: true` in config, add to the parallel apply dispatch:

```
PARALLEL APPLY CONFIG:
  isolation_mode: semantic-locking  # instead of worktree-only
  lock_ttl: {config.semantic-locking.ttl_seconds}
  max_locks_per_agent: {config.semantic-locking.max_locks_per_agent}
  deadlock_check: {config.semantic-locking.deadlock_check}
  change_name: {change-name}
  project: {project}
```

---

## Minimal Agent Self-Check (Compact Version)

For context-constrained prompts, use this compressed version:

```
LOCKING: Before editing any function/class, save a lock to engram (topic_key: locks/{change}/{file-hash}/{symbol}).
Check for conflicts first (mem_search). Do NOT write if another agent's active lock overlaps your range.
Release locks after completing work. If conflict: STOP and report LOCK_CONFLICT.
```
