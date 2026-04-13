---
name: memory-compressor
description: >
  Monitors context size and triggers autonomous memory compression mid-session.
  Detects when the active context is growing large and summarizes older context
  into engram before it gets compacted and lost.
  Trigger: When context is large, mid-session, user says "compress", "compact context", or "/memory-compress".
metadata:
  author: javi-ai
  version: "1.0"
  tags: [memory, compression, context, engram, autonomous]
  category: workflow
allowed-tools: Read, Glob, Grep, mcp__plugin_engram_engram__mem_search, mcp__plugin_engram_engram__mem_get_observation, mcp__plugin_engram_engram__mem_save, mcp__plugin_engram_engram__mem_session_summary
---

## Purpose

Context windows are finite. Long sessions accumulate conversation history, tool outputs, and intermediate reasoning that eventually triggers automatic compaction — which LOSES information indiscriminately. Memory-compressor proactively saves valuable context to engram BEFORE compaction happens, preserving decisions, discoveries, and progress while discarding noise.

This is different from `sdd-compact` (which compresses SDD artifacts post-archive). Memory-compressor operates on the CONVERSATION ITSELF, mid-session.

---

## 1. Core Principle

```
Reactive (bad):   Context fills → auto-compaction → information lost → agent confused
Proactive (good): Context growing → compress to engram → free context → agent informed
```

---

## 2. Compression Triggers

### Automatic Detection

The agent should self-monitor and trigger compression when ANY of these conditions are met:

| Signal | Threshold | Detection Method |
|--------|-----------|-----------------|
| Long conversation | >30 tool calls in session | Count tool invocations |
| Large file reads | >5 files read with >200 lines each | Track Read tool usage |
| Repetitive patterns | Same question asked twice | Detect re-asking behavior |
| Apply session length | >5 tasks completed in current session | Track apply progress |
| Explicit user signal | User says "compress", "save context", "getting long" | Keyword detection |

### Manual Trigger

User says `/memory-compress` or "compress context" or "save what we've learned".

---

## 3. What Gets Compressed (Save to Engram)

### High-Value Content (ALWAYS save)

| Content Type | Example | Engram Topic Key |
|-------------|---------|-----------------|
| Decisions made | "We chose adapter pattern over inheritance" | `session/{project}/decisions/{date}` |
| Discovered patterns | "All services use constructor injection" | `session/{project}/patterns/{date}` |
| Bug investigations | "Root cause was race condition in event handler" | `session/{project}/bugs/{date}` |
| Architecture insights | "Module X depends on Y through Z" | `session/{project}/architecture/{date}` |
| File modification log | List of files changed and why | `session/{project}/changes/{date}` |
| Failed approaches | "Tried X but it broke Y because Z" | `session/{project}/failures/{date}` |

### Low-Value Content (DO NOT save)

- Raw file contents (already on disk)
- Tool call arguments and responses (noise)
- Intermediate reasoning steps (ephemeral)
- Error stack traces (look up when needed)
- Repeated explanations of the same concept

---

## 4. Compression Protocol

### Step 1: Scan Conversation for Valuable Content

Review the conversation history and extract:
- Explicit decisions (keywords: "decided", "chose", "going with", "let's use")
- Discoveries (keywords: "found that", "turns out", "discovered", "realized")
- Failures (keywords: "didn't work", "broke", "reverted", "wrong approach")
- Progress milestones (keywords: "completed", "done", "finished", "merged")

### Step 2: Deduplicate Against Existing Memory

Before saving, check if the information already exists:
```
mem_search(query: "{content summary}", project: "{project}", limit: 3)
```

If a matching memory exists with the same content, SKIP (don't duplicate).
If it exists but this session added new details, UPDATE with `mem_save` (upsert via topic_key).

### Step 3: Save Compressed Summary

```
mem_save(
  title: "session/{project}/compressed/{date}",
  topic_key: "session/{project}/compressed/{date}",
  type: "session",
  project: "{project}",
  content: "{compressed summary — see format below}"
)
```

### Compressed Summary Format

```markdown
## Session Compression — {date} {time}

### Context
- Working on: {what the user was doing}
- SDD Change: {change name if applicable}
- Phase: {current SDD phase if applicable}

### Decisions
- {Decision 1}: {rationale}
- {Decision 2}: {rationale}

### Discoveries
- {Discovery 1}: found in {file/module}
- {Discovery 2}: impact on {area}

### Progress
- Completed: {list of completed items}
- In progress: {current work}
- Blocked: {blockers if any}

### Files Modified
- `{path}` — {what changed and why}

### Failed Approaches (avoid repeating)
- Tried {X}: failed because {Y}

### Open Questions
- {Unresolved question 1}
- {Unresolved question 2}
```

### Step 4: Report Compression

After saving, report to the user:

```
Context compressed to engram:
- {N} decisions saved
- {N} discoveries saved
- {N} files tracked
- Topic: session/{project}/compressed/{date}

Older conversation context can now be safely forgotten.
```

---

## 5. Autonomous Mid-Session Compression

When the agent detects compression triggers (Section 2) without explicit user request:

1. Do NOT interrupt the user's current task
2. Wait for a natural pause (between tool calls, after completing a sub-task)
3. Compress silently — save to engram without asking for approval
4. Briefly inform the user: "Compressed session context to engram (topic: {key})"
5. Continue with the current task

The agent should NEVER:
- Interrupt mid-tool-call to compress
- Ask "should I compress?" (just do it when thresholds are met)
- Compress during the first 10 tool calls (too early, not enough context)
- Compress more than once every 20 tool calls (avoid thrashing)

---

## 6. Recovery After Compaction

If the agent detects it has lost context (signs: asking about things already discussed, unable to find information that was previously loaded):

```
mem_search(query: "session/{project}/compressed", project: "{project}", limit: 3)
mem_get_observation(id: {most recent result})
```

This recovers the compressed summary and restores awareness of decisions, progress, and discoveries.

---

## Rules

1. Never save raw file contents to engram — only summaries and decisions
2. Compression must be idempotent — running it twice produces the same engram state
3. Always deduplicate before saving — no duplicate memories
4. Keep compressed summaries under 2000 tokens each
5. If engram is unavailable, fall back to logging compression summary to stdout only
6. Mid-session compression is autonomous — do not ask for permission
7. Post-compression, the agent should be able to reconstruct its context from engram alone
