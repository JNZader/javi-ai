# Hot Cache — Hook Examples

> Load this file when implementing auto-persist/auto-load hooks for Claude Code or OpenCode.

## Claude Code: Auto-Load on Session Start

Use a `PreToolUse` hook that fires on the first tool call of a session. The hook checks if a hot cache exists and injects it into context.

### settings.json hook config

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": ".*",
        "command": "~/.claude/hooks/hot-cache-load.sh",
        "once": true
      }
    ],
    "PostToolUse": [
      {
        "matcher": "mcp__engram__mem_session_end",
        "command": "~/.claude/hooks/hot-cache-persist.sh"
      }
    ]
  }
}
```

**Note**: The `once: true` flag (if supported) ensures the load hook fires only on the first tool call. If not supported, the hook script must track its own execution state via a temp file.

## Claude Code: Auto-Persist on Session End

A `PostToolUse` hook on `mem_session_end` or `mem_session_summary` triggers hot cache persistence. The actual persistence happens inside the AI context (the hook signals the AI to run the persist flow).

### hot-cache-load.sh

```bash
#!/usr/bin/env bash
# Signals the agent to load hot cache at session start.
# This hook outputs a system instruction that the agent reads.

PROJECT_NAME=$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
CACHE_MARKER="/tmp/.hot-cache-loaded-$$"

# Only fire once per session
if [[ -f "$CACHE_MARKER" ]]; then
  exit 0
fi
touch "$CACHE_MARKER"

echo "SYSTEM: Load hot cache for project '${PROJECT_NAME}' from engram before proceeding."
echo "Run: mem_search(query: 'hot-cache/${PROJECT_NAME}', project: '${PROJECT_NAME}', limit: 1)"
```

### hot-cache-persist.sh

```bash
#!/usr/bin/env bash
# Signals the agent to persist hot cache before session end.

PROJECT_NAME=$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")

echo "SYSTEM: Persist hot cache for project '${PROJECT_NAME}' to engram before ending session."
echo "Use topic_key: 'hot-cache/${PROJECT_NAME}', type: 'session'."
```

## OpenCode: Integration

OpenCode agents can implement hot cache through their agent config:

```toml
[agents.hot-cache]
system_prompt = """
On session start, search engram for hot-cache/{project} and present the resume prompt.
On session end, persist the hot cache artifact.
"""
```

## Engram Persistence Example

### Save (first time)

```
mem_save(
  title: "hot-cache/my-project",
  topic_key: "hot-cache/my-project",
  type: "session",
  project: "my-project",
  content: """
hot_cache:
  version: 1
  timestamp: "2025-12-15T14:30:00Z"
  project: "my-project"
  active_task:
    description: "Implement user authentication"
    sdd_change: "add-auth"
    sdd_phase: "apply"
    task_id: "2.3"
    status: "in-progress"
  working_files:
    - path: "src/auth/middleware.ts"
      action: "created"
    - path: "src/auth/jwt.ts"
      action: "modified"
  recent_decisions:
    - "Use RS256 for JWT signing"
  blockers: []
  git_branch: "feat/add-auth"
  engram_refs: []
"""
)
```

### Update (subsequent sessions)

```
# First, find the existing observation
mem_search(query: "hot-cache/my-project", project: "my-project", limit: 1)
# → returns observation ID

# Then update it
mem_update(
  id: "{observation_id}",
  content: "{new hot cache YAML}"
)
```

## Token Counting Heuristic

To stay within the 250-token budget without a tokenizer:

- 1 token ~= 4 characters (English text)
- 250 tokens ~= 1000 characters
- YAML field names are fixed overhead (~300 chars for schema)
- That leaves ~700 chars for values
- Average file path: ~40 chars → 10 paths = 400 chars
- Average decision: ~60 chars → 5 decisions = 300 chars

If total chars > 1000, trigger truncation (see SKILL.md section 6).
