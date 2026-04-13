---
name: hot-cache
description: >
  Auto-persisted hot context cache for fast session recovery. Captures active task, recent decisions, and working files at session end, loads them first at session start.
  Trigger: Session start (auto-load), session end (auto-persist), user says "hot context", "session cache", "what was I working on", or invokes /hot.
license: MIT
metadata:
  author: javi-ai
  version: "1.0"
  tags: [session, context, continuity, engram, memory]
  category: workflow
  inspired-by: https://github.com/AgriciDaniel/claude-obsidian
dependencies:
  - session-memory
allowed-tools: Read, Bash, mcp__engram__mem_save, mcp__engram__mem_search, mcp__engram__mem_get_observation, mcp__engram__mem_session_summary
---

# Hot Cache — Session Continuity

Auto-persist a curated "hot context" artifact at session end. Load it first on session start for instant context recovery without narrative bloat.

---

## 1. Core Principle

Session summaries are narratives — good for humans, bad for machines. Hot cache is a **structured snapshot** of the minimal context needed to resume work: what you were doing, what you decided, and which files matter. It loads in ~200 tokens instead of requiring a search + parse cycle.

```
Session End:
  1. Extract hot context from working state
  2. Persist to engram as structured artifact

Session Start:
  1. Load hot cache (instant, ~200 tokens)
  2. Resume with full context — no "what was I doing?" questions
```

---

## 2. Hot Cache Schema

The hot cache is a structured YAML-like block, NOT a narrative. Every field is optimized for machine parsing.

```yaml
hot_cache:
  version: 1
  timestamp: "2025-12-15T14:30:00Z"
  session_id: "abc123"
  project: "my-project"

  # What was actively being worked on
  active_task:
    description: "Implement auth middleware for API routes"
    sdd_change: "add-auth"           # null if not in SDD flow
    sdd_phase: "apply"               # explore|propose|spec|design|tasks|apply|verify|archive
    task_id: "2.3"                   # null if not in task breakdown
    status: "in-progress"            # in-progress|blocked|paused

  # Files touched in the last session (max 10)
  working_files:
    - path: "src/middleware/auth.ts"
      action: "created"              # created|modified|reviewed
    - path: "src/routes/api.ts"
      action: "modified"
    - path: "tests/auth.test.ts"
      action: "created"

  # Decisions made this session (max 5, most recent)
  recent_decisions:
    - "Use JWT with RS256 instead of HS256 for key rotation support"
    - "Auth middleware checks X-API-Key header before JWT for service-to-service calls"

  # Blockers or open questions
  blockers:
    - "Need to decide: store refresh tokens in Redis or DB"

  # Active branch (if any)
  git_branch: "feat/add-auth-middleware"

  # Engram artifact IDs for deeper context recovery
  engram_refs:
    - id: "obs_abc123"
      type: "sdd/add-auth/tasks"
    - id: "obs_def456"
      type: "sdd/add-auth/apply-progress"
```

---

## 3. Lifecycle

### On Session End (auto-persist)

**When**: Before `mem_session_end` or `mem_session_summary` is called. This skill hooks into the session lifecycle — the orchestrator or session-memory skill triggers it.

**Steps**:

1. **Extract active task**: Look at the most recent SDD state or conversation focus
2. **Collect working files**: Files read/written/edited in this session (cap at 10, most recent)
3. **Capture decisions**: Any `/remember` entries or explicit decisions from conversation (cap at 5)
4. **Note blockers**: Open questions or unresolved issues
5. **Detect git branch**: Current branch name if in a git repo
6. **Collect engram refs**: IDs of SDD artifacts saved this session

**Persist**:
```
mem_save(
  title: "hot-cache/{project}",
  topic_key: "hot-cache/{project}",
  type: "session",
  project: "{project}",
  content: "{YAML-formatted hot cache}"
)
```

**Key rule**: The hot cache is a **single artifact per project** that gets OVERWRITTEN each session (use `mem_update` if the observation already exists, `mem_save` if not). No history accumulation.

### On Session Start (auto-load)

**When**: At the beginning of any new session. This should be one of the first things loaded, BEFORE querying for SDD state or reading files.

**Steps**:

1. **Search**: `mem_search(query: "hot-cache/{project}", project: "{project}", limit: 1)`
2. **Load**: `mem_get_observation(id: {result_id})` to get the full untruncated content
3. **Parse**: Extract fields from the YAML block
4. **Present**: Show a concise status to the user:

```
Resuming from last session (2h ago):
  Task: Implement auth middleware [sdd:add-auth, task 2.3, in-progress]
  Branch: feat/add-auth-middleware
  Working on: src/middleware/auth.ts, src/routes/api.ts, tests/auth.test.ts
  Last decisions: Use JWT RS256; Auth checks X-API-Key before JWT
  Blocker: Refresh token storage (Redis vs DB)
```

5. **Offer**: "Want to continue where you left off, or start something new?"

### On Session Summary (enrichment)

When `mem_session_summary` is called, the hot cache content should be included in the summary to provide structured context alongside the narrative summary.

---

## 4. Engram Convention

| Operation | Topic Key |
|-----------|-----------|
| Save/update hot cache | `hot-cache/{project}` |
| Search for hot cache | `mem_search(query: "hot-cache/{project}")` |
| Full retrieval | `mem_get_observation(id)` |

**One cache per project**. The hot cache is NOT versioned — each session overwrites the previous one. For historical context, use `mem_session_summary` and engram's regular session artifacts.

---

## 5. Integration Points

### With Session Memory

Session memory stores `/remember` entries in files. Hot cache pulls from the same source but structures them for machine loading. They complement each other:

```
session-memory: File-based, human-readable, committed to git
hot-cache:      Engram-based, machine-parseable, ephemeral (overwritten each session)
```

### With SDD Orchestrator

The orchestrator should trigger hot cache persist before archiving or ending a session:

```
sdd-apply completes
  → Update hot cache with task progress
  → Continue or end session

Session end
  → Persist hot cache
  → Run mem_session_summary
  → mem_session_end
```

### With Cost Tracking

Hot cache can include a `session_cost` field if cost-tracking data is available:

```yaml
session_cost:
  total_usd: 1.23
  tokens_used: 45000
  cache_hit_ratio: 0.72
```

### With Claude Code Hooks

A `PostToolUse` hook on session-related tools can auto-trigger hot cache persistence. Or a `PreToolUse` hook on the first tool call can auto-load the hot cache.

---

## 6. Token Budget

| Component | Max Tokens | Max Items |
|-----------|-----------|-----------|
| Active task | 50 | 1 |
| Working files | 60 | 10 paths |
| Recent decisions | 50 | 5 entries |
| Blockers | 30 | 3 entries |
| Git + engram refs | 30 | 5 refs |
| **Total** | **~220** | — |

The entire hot cache MUST fit in 250 tokens. If content exceeds this, truncate in priority order: blockers (drop oldest) > engram_refs (drop oldest) > working_files (keep 5 most recent) > decisions (keep 3 most recent).

---

## 7. Anti-Patterns

1. **Narrative dumps** — Hot cache is structured YAML, not prose. "We discussed auth and decided to..." is wrong.
2. **History accumulation** — One snapshot per project. Overwrite, don't append.
3. **Storing code** — File paths only. Never paste code into the hot cache.
4. **Storing secrets** — No API keys, tokens, credentials. Same rules as session-memory.
5. **Loading stale cache without warning** — If the hot cache is >24h old, warn the user it may be outdated.
6. **Skipping hot cache on short sessions** — Even a 5-minute session produces useful context. Always persist.

> @reference references/hook-examples.md — Load when implementing auto-persist/auto-load hooks for Claude Code or OpenCode

---

## Quick Reference

| Event | Action | Engram Call |
|-------|--------|-------------|
| Session start | Load hot cache | `mem_search` + `mem_get_observation` |
| Session end | Persist hot cache | `mem_save` or `mem_update` |
| Task switch | Update active_task | `mem_update` |
| Decision made | Append to recent_decisions | In-memory until persist |
| File touched | Append to working_files | In-memory until persist |

```
Topic key:  hot-cache/{project}
Type:       session
Max tokens: 250
Overwrite:  yes (single artifact per project)
```
