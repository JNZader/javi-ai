---
name: semantic-locking
description: >
  Multi-agent semantic locking protocol for SDD parallel apply — sub-agents declare intent on specific symbols,
  lock line ranges, and detect conflicts BEFORE writing code. Replaces coarse file-level isolation with
  fine-grained symbol-level locking via engram.
  Trigger: When running SDD parallel apply, when multiple agents may modify the same file, or when configuring
  symbol-level lock granularity for parallel execution.
license: MIT
metadata:
  author: javi-ai
  version: "1.0"
  tags: [locking, parallel, multi-agent, orchestration, engram]
  category: orchestration
  inspired-by: wit-protocol
allowed-tools: Read, Bash
---

# Semantic Locking

Fine-grained symbol-level locking for multi-agent parallel apply. Agents declare intent on specific functions/classes/methods, the orchestrator verifies no conflicts, and locks are stored in engram for cross-agent visibility.

---

## 1. Core Principle

Worktree-based isolation prevents agents from touching the same file entirely. Semantic locking is finer — it locks **symbols** (functions, classes, methods) by line range within a file. Two agents CAN work on the same file as long as their symbol ranges don't overlap.

```
File: src/store.ts
  Agent A locks: processOrder()    lines 45-78   ✅
  Agent B locks: validateCart()    lines 120-155  ✅  (no overlap)
  Agent C wants: updateOrder()     lines 60-90   ❌  (overlaps Agent A)
```

---

## 2. Protocol Lifecycle

```
1. DECLARE  → Sub-agent reads target file, identifies symbols it will modify
2. ACQUIRE  → Agent saves lock to engram; orchestrator checks for conflicts
3. WORK     → Agent modifies ONLY its locked symbols
4. RELEASE  → Agent releases locks via engram after completing work
5. CLEANUP  → Orchestrator releases all locks on wave end / agent failure
```

### Key Invariants

- One lock per symbol per file (not one per file)
- Locks are stored in engram with deterministic `topic_key` for upsert
- Orchestrator is the SOLE authority for conflict resolution
- Agents MUST NOT write outside their locked ranges
- All locks have a TTL — expired locks are ignored during conflict checks

---

## 3. Lock Schema

Each lock is an engram observation:

```
topic_key: locks/{change-name}/{file-path-hash}/{symbol-name}
title:     "lock: {agent-id} -> {file}:{symbol}"
type:      architecture
project:   {project-name}
content:   (structured YAML below)
```

```yaml
agent_id: "task-1.1"
file: "src/services/order.ts"
symbol: "processOrder"
symbol_type: function    # function | class | method | block
line_start: 45
line_end: 78
acquired_at: "2026-03-31T10:00:00Z"
ttl_seconds: 300
status: active           # active | released | expired
```

---

## 4. Conflict Detection

Two locks conflict when they are on the **same file** and their line ranges **overlap**:

```
Conflict IF:
  lock_a.file == lock_b.file
  AND lock_a.agent_id != lock_b.agent_id
  AND lock_a.line_start <= lock_b.line_end
  AND lock_b.line_start <= lock_a.line_end
  AND lock_a.status == "active"
  AND lock_b.status == "active"
```

### Resolution

- **No overlap** — grant lock immediately
- **Overlap detected** — REJECT the new lock, report conflict to orchestrator
- **Same agent re-requests** — refresh TTL (idempotent upsert via topic_key)

---

## 5. Deadlock Detection

Circular wait: Agent A holds lock X, wants Y; Agent B holds Y, wants X.

```
Detection:
  Build a wait-for graph from pending lock requests
  If cycle exists → deadlock

Resolution:
  The agent with the LOWER priority (higher task number) releases its lock
  Orchestrator reports the forced release to the user
```

---

## 6. Configuration

```yaml
# In openspec/config.yaml or orchestrator config
semantic-locking:
  enabled: false          # opt-in, default off
  ttl_seconds: 300        # default lock TTL (5 minutes)
  max_locks_per_agent: 10 # prevent lock hoarding
  deadlock_check: true    # enable circular wait detection
  cleanup_on_wave_end: true
```

---

## 7. Orchestrator Integration

The orchestrator embeds locking instructions in sub-agent prompts during parallel apply:

1. **Before dispatch**: Query engram for existing locks on target files
2. **In prompt**: Include lock declaration and self-check rules
3. **After completion**: Verify all locks released; force-release if not
4. **On failure**: Release all locks held by the failed agent

### When to Use

| Scenario | Use Semantic Locking? |
|----------|----------------------|
| Tasks touch completely different files | No — worktree isolation sufficient |
| Tasks touch same file, different functions | **Yes** — this is the sweet spot |
| Tasks touch same function | No — serialize those tasks |
| Single agent, no parallelism | No — no contention possible |

---

## 8. Anti-Patterns

1. **Locking entire files** — defeats the purpose; use worktree isolation instead
2. **Agents self-enforcing locks** — orchestrator is the authority, not agents
3. **Forgetting cleanup** — stale locks block future waves
4. **Locking without reading the file first** — line ranges must be accurate
5. **TTL too long** — blocks other agents unnecessarily; keep it tight
6. **TTL too short** — agent loses lock mid-work; tune to task complexity

> @reference references/lock-protocol.md — Load when implementing lock acquisition, conflict checks, TTL management, or orchestrator cleanup procedures

> @reference references/prompt-templates.md — Load when injecting locking instructions into sub-agent prompts or configuring self-check rules

---

## Critical Rules

1. **Orchestrator is sole authority** — agents declare, orchestrator decides
2. **One lock per symbol** — never lock entire files
3. **TTL on every lock** — no permanent locks; expired = ignored
4. **Cleanup on wave end** — orchestrator MUST release all locks after each wave
5. **Conflict = reject, not queue** — if a lock conflicts, fail fast and report
6. **Agents MUST NOT write outside locked ranges** — violation = protocol breach
7. **Idempotent re-lock** — same agent re-requesting same symbol refreshes TTL
8. **Deadlock breaks by priority** — lower priority agent yields
