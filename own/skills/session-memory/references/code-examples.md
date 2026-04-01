# Session Memory — Code Examples

## Memory File Parser and Writer (Python)

```python
#!/usr/bin/env python3
"""session_memory.py — Parse and write .ai-memory/session.md files."""

import re
from datetime import datetime, timedelta
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class MemoryEntry:
    content: str
    category: str
    date: Optional[datetime] = None
    tags: list[str] = field(default_factory=list)

    def to_line(self) -> str:
        date_str = self.date.strftime("%Y-%m-%d") if self.date else datetime.now().strftime("%Y-%m-%d")
        tag_str = f" [{', '.join(self.tags)}]" if self.tags else ""
        return f"- [{date_str}] {self.content}{tag_str}"

    @classmethod
    def from_line(cls, line: str, category: str) -> "MemoryEntry":
        match = re.match(r"^- \[(\d{4}-\d{2}-\d{2})\]\s+(.+)$", line.strip())
        if match:
            date = datetime.strptime(match.group(1), "%Y-%m-%d")
            content = match.group(2)
        else:
            date = None
            content = line.strip().lstrip("- ")
        return cls(content=content, category=category, date=date)

    def is_expired(self, ttl_days: int) -> bool:
        if self.date is None:
            return False
        return (datetime.now() - self.date) > timedelta(days=ttl_days)


CATEGORY_TTLS = {
    "Project Decisions": 180, "User Preferences": 99999,
    "Gotchas": 90, "Patterns": 120, "Action Items": 30, "General": 14,
}

CATEGORY_PRIORITY = {
    "Project Decisions": 6, "Gotchas": 5, "Patterns": 4,
    "User Preferences": 3, "Action Items": 2, "General": 1,
}


class SessionMemory:
    def __init__(self, project_path: Optional[Path] = None):
        self.project_path = project_path or Path.cwd()
        self.project_memory_path = self.project_path / ".ai-memory" / "session.md"
        self.user_memory_path = Path.home() / ".ai-memory" / "global.md"
        self.entries: dict[str, list[MemoryEntry]] = {}

    def load(self) -> dict[str, list[MemoryEntry]]:
        self.entries = {}
        if self.user_memory_path.exists():
            self._parse_file(self.user_memory_path)
        if self.project_memory_path.exists():
            self._parse_file(self.project_memory_path)
        return self.entries

    def _parse_file(self, path: Path) -> None:
        content = path.read_text()
        current_category = "General"
        for line in content.splitlines():
            header_match = re.match(r"^## (.+)$", line)
            if header_match:
                current_category = header_match.group(1).strip()
                if current_category not in self.entries:
                    self.entries[current_category] = []
                continue
            if line.strip().startswith("- "):
                entry = MemoryEntry.from_line(line, current_category)
                if current_category not in self.entries:
                    self.entries[current_category] = []
                self.entries[current_category].append(entry)

    def remember(self, text: str) -> MemoryEntry:
        category = self._detect_category(text)
        entry = MemoryEntry(content=text, category=category, date=datetime.now())
        if category not in self.entries:
            self.entries[category] = []
        self.entries[category].append(entry)
        return entry

    def forget(self, pattern: str) -> int:
        removed = 0
        for category in self.entries:
            before = len(self.entries[category])
            self.entries[category] = [e for e in self.entries[category] if pattern.lower() not in e.content.lower()]
            removed += before - len(self.entries[category])
        return removed

    def prune(self) -> int:
        removed = 0
        for category, entries in self.entries.items():
            ttl = CATEGORY_TTLS.get(category, 14)
            before = len(entries)
            self.entries[category] = [e for e in entries if not e.is_expired(ttl)]
            removed += before - len(self.entries[category])
        return removed

    def enforce_budget(self, max_tokens: int = 500) -> int:
        removed = self.prune()
        if self.token_estimate() <= max_tokens:
            return removed
        sorted_cats = sorted(self.entries.keys(), key=lambda c: CATEGORY_PRIORITY.get(c, 0))
        for category in sorted_cats:
            if self.token_estimate() <= max_tokens:
                break
            while self.entries[category] and self.token_estimate() > max_tokens:
                self.entries[category].pop(0)
                removed += 1
        return removed

    def token_estimate(self) -> int:
        return sum(len(e.to_line()) for entries in self.entries.values() for e in entries) // 4

    def _detect_category(self, text: str) -> str:
        lower = text.lower()
        if any(w in lower for w in ["decided", "chose", "will use", "agreed"]): return "Project Decisions"
        if any(w in lower for w in ["prefer", "always", "never", "style"]): return "User Preferences"
        if any(w in lower for w in ["careful", "gotcha", "bug", "workaround"]): return "Gotchas"
        if any(w in lower for w in ["pattern", "approach", "convention"]): return "Patterns"
        if any(w in lower for w in ["todo", "next time", "follow up"]): return "Action Items"
        return "General"
```

---

## /remember Command Handler (Shell)

```bash
#!/usr/bin/env bash
# remember.sh — CLI handler for /remember commands
set -euo pipefail

MEMORY_DIR="${AI_MEMORY_DIR:-.ai-memory}"
MEMORY_FILE="$MEMORY_DIR/session.md"
DATE=$(date +%Y-%m-%d)

mkdir -p "$MEMORY_DIR"
if [[ ! -f "$MEMORY_FILE" ]]; then
  cat > "$MEMORY_FILE" << 'TEMPLATE'
# Session Memory
> Auto-managed by session-memory skill.
## Project Decisions
## User Preferences
## Gotchas
## Patterns
## Action Items
## General
TEMPLATE
fi

TEXT="$*"
detect_category() {
  local text_lower=$(echo "$1" | tr '[:upper:]' '[:lower:]')
  if echo "$text_lower" | grep -qE "(decided|chose|will use|agreed)"; then echo "Project Decisions"
  elif echo "$text_lower" | grep -qE "(prefer|always|never|style)"; then echo "User Preferences"
  elif echo "$text_lower" | grep -qE "(careful|gotcha|bug|workaround)"; then echo "Gotchas"
  elif echo "$text_lower" | grep -qE "(pattern|approach|convention)"; then echo "Patterns"
  elif echo "$text_lower" | grep -qE "(todo|next time|follow up)"; then echo "Action Items"
  else echo "General"; fi
}

CATEGORY=$(detect_category "$TEXT")
ENTRY="- [$DATE] $TEXT"
awk -v category="## $CATEGORY" -v entry="$ENTRY" '$0 == category { print; print entry; next } { print }' "$MEMORY_FILE" > "${MEMORY_FILE}.tmp" && mv "${MEMORY_FILE}.tmp" "$MEMORY_FILE"
echo "Stored in [$CATEGORY]: $TEXT"
```

---

## Toolset Profile Loader (Bash)

```bash
#!/usr/bin/env bash
# toolset-loader.sh — Load and switch toolset profiles
set -euo pipefail

TOOLSET_DIR="${TOOLSET_DIR:-.claude}"
ACTIVE_FILE="$TOOLSET_DIR/active-toolset"

load_profile() {
  local profile="$1"
  local valid_profiles="plan build review explore deploy debug docs"
  if ! echo "$valid_profiles" | grep -qw "$profile"; then
    echo "Error: Unknown profile '$profile'"; return 1
  fi
  mkdir -p "$TOOLSET_DIR"
  echo "$profile" > "$ACTIVE_FILE"
  case "$profile" in
    plan) echo "Toolset: PLAN — Tools: read, glob, grep, task, webfetch" ;;
    build) echo "Toolset: BUILD — Tools: read, write, edit, bash, glob, grep, task, webfetch" ;;
    review) echo "Toolset: REVIEW — Tools: read, glob, grep, bash (read-only)" ;;
    explore) echo "Toolset: EXPLORE — Tools: read, glob, grep" ;;
    deploy) echo "Toolset: DEPLOY — Tools: bash, read, glob, grep" ;;
    debug) echo "Toolset: DEBUG — Tools: read, glob, grep, bash, edit" ;;
    docs) echo "Toolset: DOCS — Tools: read, write/edit (*.md only), glob, grep" ;;
  esac
}
[[ $# -gt 0 ]] && load_profile "$1"
```

---

## Toolset Enforcer Hook (Claude Code)

```bash
#!/usr/bin/env bash
# .claude/hooks/toolset-enforcer.sh
set -euo pipefail

TOOLSET_FILE=".claude/active-toolset"
TOOL_NAME="$1"
ACTIVE_PROFILE="build"
[[ -f "$TOOLSET_FILE" ]] && ACTIVE_PROFILE=$(cat "$TOOLSET_FILE" | tr -d '[:space:]')

case "$ACTIVE_PROFILE" in
  plan) ALLOWED="read glob grep task webfetch" ;;
  build) ALLOWED="read write edit bash glob grep task webfetch" ;;
  review) ALLOWED="read glob grep bash" ;;
  explore) ALLOWED="read glob grep" ;;
  deploy) ALLOWED="bash read glob grep" ;;
  debug) ALLOWED="read glob grep bash edit" ;;
  docs) ALLOWED="read write edit glob grep" ;;
  *) exit 0 ;;
esac

NORMALIZED_TOOL=$(echo "$TOOL_NAME" | sed 's/^mcp_//')
if echo "$ALLOWED" | grep -qw "$NORMALIZED_TOOL"; then exit 0
else echo "BLOCKED: '$NORMALIZED_TOOL' not allowed in '$ACTIVE_PROFILE' profile." >&2; exit 1; fi
```

---

## Session Init Script

```bash
#!/usr/bin/env bash
# session-init.sh — Load memory + set toolset on session start
set -euo pipefail
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
echo "=== AI Session Init === Project: $PROJECT_ROOT"

MEMORY_FILE="$PROJECT_ROOT/.ai-memory/session.md"
GLOBAL_MEMORY="$HOME/.ai-memory/global.md"
memory_tokens=0
[[ -f "$GLOBAL_MEMORY" ]] && memory_tokens=$(($(wc -c < "$GLOBAL_MEMORY") / 4))
[[ -f "$MEMORY_FILE" ]] && memory_tokens=$((memory_tokens + $(wc -c < "$MEMORY_FILE") / 4))
echo "Memory: ~$memory_tokens tokens"
[[ $memory_tokens -gt 500 ]] && echo "WARNING: Over 500 token budget. Run /memories prune"

TOOLSET="${1:-build}"
[[ -f "$PROJECT_ROOT/.claude/active-toolset" ]] && TOOLSET=$(cat "$PROJECT_ROOT/.claude/active-toolset")
echo "Toolset: $TOOLSET"
echo "=== Session Ready ==="
```
