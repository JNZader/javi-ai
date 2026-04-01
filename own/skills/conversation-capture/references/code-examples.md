# Code Examples: Conversation Capture

## jq Extraction One-Liners

### List all assistant messages from a session

```bash
jq -c 'select(.type == "assistant") | {ts: .timestamp, content: .message.content[0].text}' \
  ~/.claude/projects/{project-hash}/{session-id}.jsonl
```

### Extract user prompts only

```bash
jq -c 'select(.type == "user") | {ts: .timestamp, content: .message.content}' \
  ~/.claude/projects/{project-hash}/{session-id}.jsonl
```

### Find decision-related messages

```bash
jq -c 'select(.type == "assistant") |
  select(.message.content[0].text |
    test("decided|chose|going with|approach|switched to"; "i")) |
  {ts: .timestamp, text: .message.content[0].text[:200]}' \
  ~/.claude/projects/{project-hash}/{session-id}.jsonl
```

### List all files edited in a session

```bash
jq -c 'select(.type == "assistant") |
  .message.content[]? |
  select(.type == "tool_use") |
  select(.name == "Edit" or .name == "Write") |
  .input.file_path' \
  ~/.claude/projects/{project-hash}/{session-id}.jsonl | sort -u
```

### Get session metadata

```bash
jq -c 'select(.type == "user") | {cwd, gitBranch, version, sessionId} | limit(1; .)' \
  ~/.claude/projects/{project-hash}/{session-id}.jsonl | head -1
```

---

## Python Streaming Parser

For large JSONL files (>5MB), use streaming line-by-line processing:

```python
#!/usr/bin/env python3
"""Extract key artifacts from a Claude Code JSONL session."""
import json
import sys
from pathlib import Path

DECISION_KEYWORDS = ["decided", "chose", "going with", "approach", "switched to"]
DISCOVERY_KEYWORDS = ["found", "realized", "turns out", "gotcha", "discovered"]
BUGFIX_KEYWORDS = ["fixed", "bug was", "root cause", "the issue was"]

def classify_message(text: str) -> str | None:
    lower = text.lower()
    for kw in DECISION_KEYWORDS:
        if kw in lower:
            return "decision"
    for kw in DISCOVERY_KEYWORDS:
        if kw in lower:
            return "discovery"
    for kw in BUGFIX_KEYWORDS:
        if kw in lower:
            return "bugfix"
    return None

def extract_session(jsonl_path: str) -> dict:
    artifacts = {"decisions": [], "discoveries": [], "bugfixes": [], "files_changed": set()}

    with open(jsonl_path, "r") as f:
        for line in f:
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue

            if record.get("type") == "assistant":
                for block in record.get("message", {}).get("content", []):
                    if block.get("type") == "text":
                        category = classify_message(block["text"])
                        if category:
                            artifacts[f"{category}s" if not category.endswith("s") else category].append({
                                "timestamp": record.get("timestamp"),
                                "text": block["text"][:500],
                                "category": category,
                            })
                    elif block.get("type") == "tool_use" and block.get("name") in ("Edit", "Write"):
                        artifacts["files_changed"].add(block["input"].get("file_path", ""))

    artifacts["files_changed"] = sorted(artifacts["files_changed"])
    return artifacts

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: extract_session.py <path-to-jsonl>")
        sys.exit(1)
    result = extract_session(sys.argv[1])
    print(json.dumps(result, indent=2, default=str))
```

---

## Engram Indexing Script

After extraction, index artifacts to engram:

```python
#!/usr/bin/env python3
"""Index extracted session artifacts to engram via Claude Code MCP."""

# This is a PATTERN — adapt to your engram client (MCP tool calls, HTTP API, etc.)

def index_to_engram(project: str, session_id: str, artifacts: dict):
    """
    Call mem_save for each artifact type.

    In practice, invoke via Claude Code's MCP tool:
      mem_save(title=..., topic_key=..., type=..., project=..., content=...)
    """
    if artifacts.get("decisions"):
        decisions_text = "\n".join(
            f"- [{d['timestamp']}] {d['text'][:200]}"
            for d in artifacts["decisions"]
        )
        # mem_save call:
        print(f"mem_save(title='session/{project}/{session_id}/decisions', "
              f"topic_key='session/{project}/{session_id}/decisions', "
              f"type='decision', project='{project}', "
              f"content='**What**: Key decisions from session {session_id}\\n"
              f"**Why**: Auto-indexed from session capture\\n"
              f"**Where**: {', '.join(artifacts.get('files_changed', [])[:5])}\\n"
              f"**Learned**:\\n{decisions_text}')")

    if artifacts.get("files_changed"):
        # mem_save call for file changes:
        print(f"mem_save(title='session/{project}/{session_id}/changes', "
              f"topic_key='session/{project}/{session_id}/changes', "
              f"type='pattern', project='{project}', "
              f"content='**What**: Files changed in session {session_id}\\n"
              f"**Where**: {chr(10).join(artifacts['files_changed'])}')")
```

---

## Codex Session Extraction

```bash
# Codex stores sessions as JSON files
jq '.messages[] | select(.role == "assistant") | .content[:200]' \
  ~/.codex/sessions/{session-file}.json
```

## Gemini CLI Session Extraction

```bash
# Gemini stores conversation history as JSON
jq '.[] | select(.role == "model") | .parts[0].text[:200]' \
  ~/.gemini/sessions/{session-file}.json
```
