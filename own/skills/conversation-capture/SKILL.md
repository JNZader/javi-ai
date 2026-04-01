---
name: conversation-capture
description: >
  Capture, index, and search AI conversation sessions from Claude Code, Codex, and Gemini logs using engram.
  Trigger: When extracting session data, indexing conversation decisions to memory, recovering past session context, or wiring auto-capture hooks.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

# Conversation Capture

## 1. Core Principle

AI sessions produce high-value artifacts — decisions, discoveries, bug fixes, architecture choices — that vanish when the session ends. **Conversation capture** extracts and indexes this knowledge into engram for cross-session recovery.

```
Session JSONL → Extract → Index to Engram → Search in Future Sessions
```

---

## 2. When to Use

Use this skill when:
- Extracting decisions or discoveries from past Claude Code sessions
- Indexing conversation artifacts to engram for future recovery
- Searching past sessions for context before starting new work
- Wiring auto-capture hooks to save session summaries on exit

---

## 3. Session Data Sources

### Claude Code (Primary)

Sessions stored as JSONL at `~/.claude/projects/{project-hash}/{session-id}.jsonl`.

| Record Type | Field | Contains |
|-------------|-------|----------|
| `user` | `message.content` | User prompts |
| `assistant` | `message.content` | AI responses, decisions, code |
| `tool_use` | `message.content[].input` | Tool calls (Read, Edit, Bash) |
| `tool_result` | `message.content[].content` | Tool outputs |
| `progress` | `data.statusMessage` | Hook progress, status |
| `file-history-snapshot` | `snapshot.trackedFileBackups` | File change tracking |

Key fields on every record: `type`, `timestamp`, `sessionId`, `cwd`, `gitBranch`, `version`.

### Codex

Sessions stored at `~/.codex/sessions/`. Format: JSON with `messages[]` array containing `role` + `content` pairs.

### Gemini CLI

Sessions stored at `~/.gemini/sessions/`. Format: JSON conversation history with `parts[]` arrays.

---

## 4. Extraction Patterns

### Decision Tree

```
What do you need?
├── Quick scan of a session → jq one-liner (see references/code-examples.md)
├── Extract all decisions  → Filter assistant messages for decision keywords
├── Track file changes     → Filter tool_use records for Edit/Write calls
├── Full session summary   → Stream-parse and summarize with LLM
└── Automated on every exit → Wire a Stop hook (see section 7)
```

### Extraction Strategy by File Size

| JSONL Size | Strategy |
|------------|----------|
| < 5 MB | `jq` one-liners, load full file |
| 5-50 MB | Stream with `jq --stream` or Python line-by-line |
| > 50 MB | Use `tail -n` for recent entries, or `rg` for keyword search |

### What to Extract

| Artifact Type | Detection Keywords | Engram Type |
|--------------|-------------------|-------------|
| Decisions | "decided", "chose", "going with", "approach" | `decision` |
| Discoveries | "found", "realized", "turns out", "gotcha" | `discovery` |
| Bug Fixes | "fixed", "bug was", "root cause", "the issue" | `bugfix` |
| Architecture | "pattern", "structure", "architecture", "design" | `architecture` |
| Code Changes | tool_use type Edit/Write | `pattern` |

---

## 5. Engram Indexing

### Topic Key Convention

```
session/{project}/{session-id}/{artifact-type}
```

Artifact types: `summary`, `decisions`, `changes`, `discoveries`

### Structured Content Format

Always use the engram standard format:

```
**What**: [concise description]
**Why**: [reasoning or user request that drove it]
**Where**: [files/paths affected]
**Learned**: [gotchas, edge cases, decisions]
```

### Indexing Commands

```python
# Save a session summary
mem_save(
    title="session/{project}/{session-id}/summary",
    topic_key="session/{project}/{session-id}/summary",
    type="architecture",
    project="{project}",
    content="**What**: Session summary for {date}\n**Why**: Auto-captured on session end\n**Where**: {files changed}\n**Learned**: {key decisions}"
)

# Save a specific decision
mem_save(
    title="session/{project}/{session-id}/decisions",
    topic_key="session/{project}/{session-id}/decisions",
    type="decision",
    project="{project}",
    content="**What**: {decision description}\n**Why**: {rationale}\n**Where**: {affected files}\n**Learned**: {tradeoffs considered}"
)
```

---

## 6. Search and Recovery

### Common Search Patterns

| Need | Query |
|------|-------|
| All sessions for a project | `mem_search(query: "session/{project}", project: "{project}")` |
| Decisions from a specific session | `mem_search(query: "session/{project}/{session-id}/decisions")` |
| Find where a bug was fixed | `mem_search(query: "fixed {keyword}", type: "bugfix")` |
| Architecture decisions | `mem_search(query: "session/{project}", type: "architecture")` |
| Recent discoveries | `mem_search(query: "session/{project}", type: "discovery")` |

### Recovery Protocol (New Session Start)

```
1. mem_search(query: "session/{project}", project: "{project}", limit: 5)
2. For each result: mem_get_observation(id: {id}) → full content
3. Load relevant context into session
```

---

## 7. Auto-Capture Hooks

### Claude Code Stop Hook

Wire a `Stop` hook in `.claude/settings.json` to auto-save session summaries:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "$HOME/.claude/scripts/session-capture.sh"
          }
        ]
      }
    ]
  }
}
```

### SessionStart Hook (Context Recovery)

Wire a `SessionStart` hook to auto-load recent session context:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "$HOME/.claude/scripts/session-recover.sh"
          }
        ]
      }
    ]
  }
}
```

> @reference references/code-examples.md -- Load when implementing extraction scripts (jq, Python), engram indexing patterns, or session parsers

> @reference references/hook-templates.md -- Load when configuring auto-capture hooks, writing session-stop/session-start scripts, or setting up settings.json

---

## 8. Critical Rules

1. NEVER load entire JSONL files larger than 5MB into memory — stream line-by-line
2. ALWAYS use the `session/{project}/{session-id}/{type}` topic key convention
3. ALWAYS use structured content format (What/Why/Where/Learned) for engram saves
4. ALWAYS retrieve full content with `mem_get_observation(id)` after `mem_search` — search returns truncated previews
5. PREFER `jq` for quick extraction, Python for complex filtering
6. NEVER commit JSONL session files to git — they contain sensitive conversation data
7. Auto-capture hooks SHOULD be idempotent — running twice on the same session produces the same result
