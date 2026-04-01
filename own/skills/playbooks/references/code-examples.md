# Playbooks — Code Examples

## Bash Playbook Runner

```bash
#!/usr/bin/env bash
# playbook-runner.sh — Execute a markdown playbook
set -euo pipefail

PLAYBOOK_FILE="${1:?Usage: playbook-runner.sh <playbook.md>}"
[[ ! -f "$PLAYBOOK_FILE" ]] && echo "Error: Not found: $PLAYBOOK_FILE" && exit 1

TOTAL=$(grep -c '^\- \[ \]' "$PLAYBOOK_FILE" || true)
DONE=$(grep -c '^\- \[x\]' "$PLAYBOOK_FILE" || true)
echo "Playbook: $PLAYBOOK_FILE — Progress: $DONE/$((TOTAL + DONE))"

NEXT_TASK=$(grep -n '^\- \[ \]' "$PLAYBOOK_FILE" | head -1)
[[ -z "$NEXT_TASK" ]] && echo "All tasks complete!" && exit 0

LINE_NUM=$(echo "$NEXT_TASK" | cut -d: -f1)
TASK_TEXT=$(echo "$NEXT_TASK" | cut -d']' -f2- | sed 's/^ //')
echo "Next task (line $LINE_NUM): $TASK_TEXT"
echo "Mark complete: sed -i '${LINE_NUM}s/- \[ \]/- [x]/' \"$PLAYBOOK_FILE\""
```

## Python Playbook Parser

```python
"""playbook_parser.py — Parse and manage markdown playbooks."""
import re
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path

class TaskStatus(Enum):
    PENDING = "pending"
    COMPLETE = "complete"
    FAILED = "failed"
    SKIPPED = "skipped"

@dataclass
class Task:
    line_number: int
    text: str
    status: TaskStatus
    subtasks: list["Task"] = field(default_factory=list)
    condition: str | None = None

    @property
    def is_actionable(self) -> bool:
        return self.status == TaskStatus.PENDING

@dataclass
class Playbook:
    title: str
    file_path: Path
    metadata: dict[str, str]
    prerequisites: list[Task]
    tasks: list[Task]
    post_completion: list[Task]

    @property
    def total_tasks(self) -> int: return len(self.tasks)
    @property
    def completed_tasks(self) -> int: return sum(1 for t in self.tasks if t.status == TaskStatus.COMPLETE)
    @property
    def progress_pct(self) -> float: return (self.completed_tasks / self.total_tasks * 100) if self.total_tasks else 100.0
    @property
    def next_task(self) -> Task | None: return next((t for t in self.tasks if t.is_actionable), None)
    @property
    def is_complete(self) -> bool: return all(t.status != TaskStatus.PENDING for t in self.tasks)

_CHECKBOX_RE = re.compile(r"^(\s*)- \[([ x])\] (.+)$")
_TITLE_RE = re.compile(r"^# Playbook:\s*(.+)$")
_METADATA_RE = re.compile(r"^\- \*\*(.+?)\*\*:\s*(.+)$")

def parse_playbook(file_path: str | Path) -> Playbook:
    path = Path(file_path)
    lines = path.read_text().splitlines()
    title, metadata, current_section = "", {}, ""
    prerequisites, tasks, post_completion = [], [], []

    for i, line in enumerate(lines, start=1):
        title_match = _TITLE_RE.match(line)
        if title_match: title = title_match.group(1).strip(); continue
        if line.startswith("## "): current_section = line[3:].strip().lower(); continue
        if current_section == "metadata":
            meta_match = _METADATA_RE.match(line)
            if meta_match: metadata[meta_match.group(1).lower()] = meta_match.group(2).strip()
            continue
        cb_match = _CHECKBOX_RE.match(line)
        if cb_match:
            indent, checked, text = len(cb_match.group(1)), cb_match.group(2) == "x", cb_match.group(3).strip()
            status = TaskStatus.COMPLETE if checked else TaskStatus.PENDING
            if text.startswith("!!"): status, text = TaskStatus.FAILED, text[2:].strip()
            elif text.startswith(">>"): status, text = TaskStatus.SKIPPED, text[2:].strip()
            task = Task(line_number=i, text=text, status=status)
            target = {"prerequisites": prerequisites, "tasks": tasks, "post-completion": post_completion}.get(current_section, tasks)
            if indent > 0 and target: target[-1].subtasks.append(task)
            else: target.append(task)

    return Playbook(title=title, file_path=path, metadata=metadata, prerequisites=prerequisites, tasks=tasks, post_completion=post_completion)

def mark_task_complete(file_path: str | Path, line_number: int) -> None:
    path = Path(file_path)
    lines = path.read_text().splitlines()
    lines[line_number - 1] = lines[line_number - 1].replace("- [ ]", "- [x]", 1)
    path.write_text("\n".join(lines) + "\n")
```

## Git Integration Helper

```bash
#!/usr/bin/env bash
# playbook-commit.sh — Commit progress after a playbook task
set -euo pipefail
PLAYBOOK_FILE="${1:?Usage: playbook-commit.sh <playbook.md> <task_number>}"
TASK_NUM="${2:?Provide the task number}"
PLAYBOOK_NAME=$(basename "$PLAYBOOK_FILE" .md)
TOTAL=$(grep -c '^\- \[[ x]\]' "$PLAYBOOK_FILE" || echo 0)
TASK_TEXT=$(grep '^\- \[[ x]\]' "$PLAYBOOK_FILE" | sed -n "${TASK_NUM}p" | sed 's/- \[.\] //')
git add -A
git commit -m "playbook(${PLAYBOOK_NAME}): complete task ${TASK_NUM}/${TOTAL} - ${TASK_TEXT}"
```
