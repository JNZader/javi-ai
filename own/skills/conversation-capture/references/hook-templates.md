# Hook Templates: Conversation Capture

## Claude Code Settings Configuration

Add to `.claude/settings.json` (project-level) or `~/.claude/settings.json` (global):

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
    ],
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

---

## Session Capture Script (Stop Hook)

Save as `~/.claude/scripts/session-capture.sh`:

```bash
#!/usr/bin/env bash
# Auto-capture session summary on Claude Code exit.
# Extracts key decisions and file changes, saves to engram.
set -euo pipefail

SESSION_ID="${CLAUDE_SESSION_ID:-unknown}"
PROJECT_DIR="${CLAUDE_CWD:-$(pwd)}"
PROJECT_NAME=$(basename "$PROJECT_DIR")

# Find the JSONL file for this session
PROJECTS_DIR="$HOME/.claude/projects"
JSONL_FILE=$(find "$PROJECTS_DIR" -name "${SESSION_ID}.jsonl" 2>/dev/null | head -1)

if [[ -z "$JSONL_FILE" ]]; then
  echo "No JSONL found for session $SESSION_ID"
  exit 0
fi

# Extract assistant message count and files changed
MSG_COUNT=$(jq -c 'select(.type == "assistant")' "$JSONL_FILE" 2>/dev/null | wc -l)
FILES_CHANGED=$(jq -rc 'select(.type == "assistant") |
  .message.content[]? |
  select(.type == "tool_use") |
  select(.name == "Edit" or .name == "Write") |
  .input.file_path' "$JSONL_FILE" 2>/dev/null | sort -u | head -20)

# Skip trivial sessions (< 3 assistant messages)
if [[ "$MSG_COUNT" -lt 3 ]]; then
  exit 0
fi

# Extract decisions (first 5)
DECISIONS=$(jq -rc 'select(.type == "assistant") |
  .message.content[0]? |
  select(.type == "text") |
  select(.text | test("decided|chose|going with|approach"; "i")) |
  .text[:150]' "$JSONL_FILE" 2>/dev/null | head -5)

# Build summary content
SUMMARY="**What**: Session summary ($MSG_COUNT messages)"
SUMMARY+="\n**Why**: Auto-captured on session end"
SUMMARY+="\n**Where**: ${FILES_CHANGED:-no files changed}"

if [[ -n "$DECISIONS" ]]; then
  SUMMARY+="\n**Learned**:\n$DECISIONS"
fi

echo "$SUMMARY"
# The actual engram save happens via the hook output being processed
# by Claude Code's hook system. The script output is displayed to the user.
#
# For direct engram integration, use the engram CLI or HTTP API:
# engram save --title "session/$PROJECT_NAME/$SESSION_ID/summary" \
#   --topic-key "session/$PROJECT_NAME/$SESSION_ID/summary" \
#   --type architecture --project "$PROJECT_NAME" \
#   --content "$SUMMARY"
```

---

## Session Recovery Script (SessionStart Hook)

Save as `~/.claude/scripts/session-recover.sh`:

```bash
#!/usr/bin/env bash
# Load recent session context on Claude Code start.
set -euo pipefail

PROJECT_DIR="${CLAUDE_CWD:-$(pwd)}"
PROJECT_NAME=$(basename "$PROJECT_DIR")

echo "Loading session context for $PROJECT_NAME..."

# Recent sessions are loaded by engram's own SessionStart hook.
# This script provides additional JSONL-based recovery for when
# engram doesn't have indexed data yet.

PROJECTS_DIR="$HOME/.claude/projects"

# Find project hash directory (matches cwd pattern)
PROJECT_HASH_DIR=$(find "$PROJECTS_DIR" -maxdepth 1 -type d | while read -r dir; do
  LATEST=$(ls -t "$dir"/*.jsonl 2>/dev/null | head -1)
  if [[ -n "$LATEST" ]]; then
    CWD=$(jq -r 'select(.type == "user") | .cwd' "$LATEST" 2>/dev/null | head -1)
    if [[ "$CWD" == "$PROJECT_DIR"* ]]; then
      echo "$dir"
      break
    fi
  fi
done)

if [[ -z "$PROJECT_HASH_DIR" ]]; then
  echo "No prior sessions found for $PROJECT_DIR"
  exit 0
fi

# List recent sessions (last 3)
echo "Recent sessions:"
ls -t "$PROJECT_HASH_DIR"/*.jsonl 2>/dev/null | head -3 | while read -r f; do
  SESSION=$(basename "$f" .jsonl)
  DATE=$(jq -r '.timestamp' "$f" 2>/dev/null | head -1 | cut -dT -f1)
  MSGS=$(jq -c 'select(.type == "assistant")' "$f" 2>/dev/null | wc -l)
  echo "  - $SESSION ($DATE, $MSGS messages)"
done
```

---

## Permissions Setup

```bash
chmod +x ~/.claude/scripts/session-capture.sh
chmod +x ~/.claude/scripts/session-recover.sh
```

---

## Environment Variables Available in Hooks

| Variable | Description |
|----------|-------------|
| `CLAUDE_SESSION_ID` | Current session UUID |
| `CLAUDE_CWD` | Working directory when Claude Code was launched |
| `CLAUDE_PLUGIN_ROOT` | Root path of the plugin that registered the hook |

> **Note**: Variable availability depends on Claude Code version. Check `version` field in JSONL records to confirm compatibility.
