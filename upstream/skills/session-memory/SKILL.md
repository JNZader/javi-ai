---
name: session-memory
description: >
  Session memory patterns and toolset profiles for AI coding assistants — persistent context, /remember commands, and mode-based tool access.
  Trigger: When managing AI context across sessions, implementing /remember patterns, or configuring toolset profiles for different work modes.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

# Session Memory & Toolset Profiles

## 1. Core Principle

AI coding assistants are **stateless by default**. Every new session starts from zero — no memory of past decisions, no awareness of established patterns, no recall of hard-won gotchas discovered in previous debugging sessions.

This creates three fundamental problems:

1. **Decision amnesia**: The team decided to use Zustand over Redux last Tuesday. The AI suggests Redux again on Wednesday. Time wasted re-explaining, or worse, inconsistent code gets merged.

2. **Context rebuilding tax**: Every session begins with the same ritual — "we use X for Y, our API follows Z convention, don't touch the legacy module in /src/old." This eats into productive time.

3. **Tool noise**: An agent in "planning mode" has access to file writes and terminal commands it shouldn't use. An agent reviewing code can accidentally edit files. Unrestricted tool access leads to mistakes and cognitive overhead.

**Session memory** solves problems 1 and 2 by persisting critical context across sessions in lightweight, token-budget-aware files.

**Toolset profiles** solve problem 3 by restricting which tools are available based on the current work mode — plan, build, review, explore, or deploy.

**Combining both** creates agents that remember what matters and only have access to what they need. The result: fewer mistakes, less repetition, faster sessions, and more trustworthy AI assistance.

### The Equation

```
Focused Tools + Persistent Context = Effective AI Sessions
```

Without memory: the agent is brilliant but amnesiac.
Without toolsets: the agent is capable but undisciplined.
With both: the agent is a reliable team member.

---

## 2. Session Memory Patterns

### 2.1 The /remember Pattern

The `/remember` command is a user-initiated instruction that tells the AI to persist a piece of information beyond the current session.

**Flow:**

```
User: /remember We decided to use Zustand over Redux for all new state management

AI:
  1. Parses the memory content
  2. Categorizes it (decision, preference, gotcha, pattern)
  3. Timestamps it
  4. Appends it to the appropriate memory file
  5. Confirms storage to the user
```

**Trigger phrases:**

| Phrase | Action |
|--------|--------|
| `/remember <text>` | Store text in session memory |
| `/forget <text>` | Remove matching entry from memory |
| `/memories` | Display current session memory contents |
| `/memories prune` | Remove entries older than retention period |
| `/memories export` | Export memory to shareable format |
| `/memories import <path>` | Import memory from file |

**Category detection heuristics:**

- Contains "decided", "chose", "will use", "agreed" → **Decision**
- Contains "prefer", "always", "never", "style" → **Preference**
- Contains "careful", "gotcha", "bug", "workaround", "watch out" → **Gotcha**
- Contains "pattern", "approach", "convention", "standard" → **Pattern**
- Contains "todo", "next time", "follow up" → **Action Item**
- Default → **General**

### 2.2 Memory File Format

The memory file uses Markdown for human readability and easy parsing. Each entry is timestamped and categorized.

```markdown
# Session Memory

> Auto-managed by session-memory skill. Manual edits are preserved.
> Token budget: ~500 tokens. Prune regularly.

## Project Decisions
- [2024-01-15] Use Zustand over Redux for state management
- [2024-01-16] API responses use camelCase, DB uses snake_case
- [2024-01-18] All new components must have unit tests before merge
- [2024-01-20] GraphQL for public API, REST for internal services
- [2024-02-01] Monorepo structure with Turborepo for build orchestration

## User Preferences
- Prefer functional components over class components
- Always use TypeScript strict mode
- Use named exports, avoid default exports
- Prefer explicit return types on public functions
- Use kebab-case for file names, PascalCase for components

## Gotchas
- [2024-01-17] The auth middleware requires X-Custom-Header in all requests
- [2024-01-22] PostgreSQL connection pool max is 20 in staging, 100 in prod
- [2024-01-25] The /api/legacy/* routes bypass the new validation layer
- [2024-02-03] Docker build fails if .env.local exists — add to .dockerignore

## Patterns
- Error handling: use Result<T, E> pattern (see error-handling skill)
- API calls: always wrap in try/catch with typed error responses
- State: colocate state near usage, lift only when 2+ consumers need it
- Testing: arrange-act-assert with descriptive test names

## Action Items
- [2024-02-05] TODO: Migrate remaining Redux slices to Zustand stores
- [2024-02-06] TODO: Add rate limiting to public GraphQL endpoint
```

### 2.3 Storage Locations

Session memory supports three tiers of storage, each with different scope and lifecycle:

```
Tier 1: Project-Level (shared with team)
  Location: <project-root>/.ai-memory/session.md
  Git: Committed to repository
  Scope: Project-wide decisions and conventions
  Examples: Architecture decisions, API conventions, shared gotchas

Tier 2: User-Level (personal across projects)
  Location: ~/.ai-memory/global.md
  Git: Not tracked (personal dotfiles)
  Scope: Personal coding preferences and cross-project patterns
  Examples: Editor preferences, naming conventions, favorite patterns

Tier 3: Session-Level (ephemeral)
  Location: In-context only, not persisted to disk
  Git: N/A
  Scope: Current session only
  Examples: Temporary debugging notes, current task context
```

**Resolution order:** When loading memory, entries are merged with this precedence:

```
Session-Level (highest priority)
  ↓ overrides
Project-Level
  ↓ overrides
User-Level (lowest priority)
```

This means a project decision overrides a personal preference, and a session-level note overrides everything.

### 2.4 Memory Loading on Session Start

When a new AI session begins, the memory loader executes the following sequence:

```
1. Check for ~/.ai-memory/global.md → load user preferences
2. Check for .ai-memory/session.md → load project context
3. Merge entries, applying precedence rules
4. Calculate token count of merged memory
5. If over budget (500 tokens):
   a. Remove entries older than 30 days
   b. Remove lower-priority categories first (General → Action Items → Gotchas)
   c. Summarize remaining if still over budget
6. Inject merged memory into system context
7. Report: "Loaded N memories (M tokens)"
```

---

## 3. Memory Lifecycle Management

### 3.1 Auto-Pruning

Memories have a default TTL (time-to-live) based on their category:

| Category | Default TTL | Rationale |
|----------|-------------|-----------|
| Decisions | 180 days | Architectural decisions are long-lived |
| Preferences | Never expires | Personal style is persistent |
| Gotchas | 90 days | Bugs get fixed, workarounds become obsolete |
| Patterns | 120 days | Patterns evolve but are relatively stable |
| Action Items | 30 days | If not done in 30 days, re-evaluate |
| General | 14 days | Uncategorized entries decay fastest |

**Pruning runs automatically** when memory is loaded and the token budget is exceeded. It can also be triggered manually with `/memories prune`.

### 3.2 Priority-Based Retention

When the token budget forces pruning, entries are retained in this priority order:

```
1. Decisions (highest — these define the project)
2. Gotchas (high — these prevent repeat mistakes)
3. Patterns (medium — these ensure consistency)
4. Preferences (medium — these improve experience)
5. Action Items (low — these are transient)
6. General (lowest — these are uncategorized)
```

Within the same priority level, newer entries are retained over older ones.

### 3.3 Memory Merging

When projects fork or teams split, memory files may need merging:

```bash
# Merge memories from a forked project
ai-memory merge --source ../forked-project/.ai-memory/session.md \
                --target .ai-memory/session.md \
                --strategy=union  # or 'ours', 'theirs', 'interactive'
```

**Merge strategies:**
- `union`: Keep all unique entries from both sources
- `ours`: Prefer current project's entries on conflict
- `theirs`: Prefer source entries on conflict
- `interactive`: Prompt user for each conflict

### 3.4 Memory Export/Import

For team sharing and onboarding:

```bash
# Export project memories for a new team member
ai-memory export --format=yaml --output=onboarding-context.yaml

# Import as a new team member
ai-memory import onboarding-context.yaml --tier=project
```

### 3.5 Token Budget Awareness

The memory system is designed to stay within a strict token budget to avoid consuming too much of the AI's context window.

**Budget guidelines:**

| Tier | Max Tokens | Max Entries |
|------|-----------|-------------|
| Project | 300 | ~20 entries |
| User | 150 | ~10 entries |
| Session | 50 | ~3-5 entries |
| **Total** | **500** | **~35 entries** |

**Token estimation:** Approximately 1 token per 4 characters, or ~15 tokens per memory entry line.

When over budget, the system applies this reduction pipeline:

```
1. Remove expired entries (past TTL)
2. Remove duplicate/similar entries (fuzzy match)
3. Remove lowest-priority categories
4. Summarize verbose entries into concise form
5. If still over: warn user, ask what to prune
```

---

## 4. Toolset Profiles

### 4.1 Concept

Different tasks require different capabilities. A planning session shouldn't accidentally modify files. A code review shouldn't have terminal access. A deployment script shouldn't edit source code.

**Toolset profiles** define which tools are available in each work mode, creating intentional constraints that make the AI more focused and less error-prone.

The principle: **Least privilege for AI tools.** Give the agent exactly what it needs, nothing more.

### 4.2 Profile Definitions

```yaml
# toolsets.yaml — Place in project root or ~/.config/ai/toolsets.yaml
version: "1.0"

profiles:
  plan:
    description: "Planning and architecture — read-only exploration with task management"
    tools:
      - read
      - glob
      - grep
      - task
      - webfetch
    restrictions:
      - no file writes
      - no file edits
      - no terminal commands
      - no git operations
    use_when: "Designing features, writing specs, architecture discussions"

  build:
    description: "Full development — all tools available for implementation"
    tools:
      - read
      - write
      - edit
      - bash
      - glob
      - grep
      - task
      - webfetch
    restrictions:
      - no git force push
      - no destructive git operations (hard reset, etc.)
    use_when: "Implementing features, fixing bugs, writing tests"

  review:
    description: "Code review — read and analyze, suggest but never modify"
    tools:
      - read
      - glob
      - grep
      - bash:read-only    # git log, git diff, git show only
    restrictions:
      - no file writes
      - no file edits
      - no git push
      - no npm/pip install
    use_when: "Reviewing PRs, auditing code, security analysis"

  explore:
    description: "Codebase exploration — pure read-only discovery"
    tools:
      - read
      - glob
      - grep
    restrictions:
      - no bash
      - no writes
      - no edits
      - no git
    use_when: "Understanding new codebase, answering architecture questions"

  deploy:
    description: "Deployment and operations — run commands, no source edits"
    tools:
      - bash
      - read
      - glob
      - grep
    restrictions:
      - no source code edits (src/, lib/, app/)
      - no test modifications
      - config file edits allowed (infra/, deploy/, .github/)
    use_when: "CI/CD, deployment scripts, infrastructure changes"

  debug:
    description: "Debugging — full read access, limited writes, full terminal"
    tools:
      - read
      - glob
      - grep
      - bash
      - edit          # for adding debug logs only
    restrictions:
      - no new file creation
      - no git push
      - edits must be reverted before session end
    use_when: "Investigating bugs, analyzing logs, reproducing issues"

  docs:
    description: "Documentation — write docs, read code, no code changes"
    tools:
      - read
      - write         # markdown/docs files only
      - edit           # markdown/docs files only
      - glob
      - grep
    restrictions:
      - writes limited to: *.md, *.mdx, *.txt, *.rst, docs/**
      - no source code edits
      - no bash
    use_when: "Writing documentation, READMEs, API docs, guides"
```

### 4.3 Profile Switching

Users can switch profiles during a session:

```
/toolset plan       → Switch to planning mode
/toolset build      → Switch to full development mode
/toolset review     → Switch to code review mode
/toolset status     → Show current active profile
/toolset reset      → Return to default (build) profile
```

**Auto-detection (optional):** The AI can suggest a profile switch based on user intent:

```
User: "Let's review the PR #42"
AI: "Switching to review toolset — I'll analyze without modifying any files."

User: "Now let's fix that bug we found"
AI: "Switching to build toolset — I now have write and edit access."
```

### 4.4 Implementation Approaches

#### Claude Code — Hook-based Enforcement

Claude Code uses `PreToolUse` hooks to intercept tool calls and enforce the active profile.

Create `.claude/hooks/toolset-enforcer.sh`:

```bash
#!/usr/bin/env bash
# Toolset profile enforcer for Claude Code
# Reads active profile from .claude/active-toolset and blocks disallowed tools

set -euo pipefail

TOOLSET_FILE=".claude/active-toolset"
TOOL_NAME="$1"

# Default to 'build' if no active toolset
ACTIVE_PROFILE="build"
if [[ -f "$TOOLSET_FILE" ]]; then
  ACTIVE_PROFILE=$(cat "$TOOLSET_FILE" | tr -d '[:space:]')
fi

# Define allowed tools per profile
case "$ACTIVE_PROFILE" in
  plan)
    ALLOWED="read glob grep task webfetch"
    ;;
  build)
    ALLOWED="read write edit bash glob grep task webfetch"
    ;;
  review)
    ALLOWED="read glob grep bash"
    ;;
  explore)
    ALLOWED="read glob grep"
    ;;
  deploy)
    ALLOWED="bash read glob grep"
    ;;
  debug)
    ALLOWED="read glob grep bash edit"
    ;;
  docs)
    ALLOWED="read write edit glob grep"
    ;;
  *)
    # Unknown profile, allow all (fail-open)
    exit 0
    ;;
esac

# Normalize tool name (e.g., "mcp_bash" -> "bash", "mcp_edit" -> "edit")
NORMALIZED_TOOL=$(echo "$TOOL_NAME" | sed 's/^mcp_//')

# Check if tool is allowed
if echo "$ALLOWED" | grep -qw "$NORMALIZED_TOOL"; then
  exit 0  # Tool is allowed
else
  echo "BLOCKED: Tool '$NORMALIZED_TOOL' is not allowed in '$ACTIVE_PROFILE' profile." >&2
  echo "Allowed tools: $ALLOWED" >&2
  echo "Switch profile with: /toolset build" >&2
  exit 1  # Tool is blocked
fi
```

Register in `.claude/hooks.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "command": ".claude/hooks/toolset-enforcer.sh",
        "description": "Enforce active toolset profile restrictions"
      }
    ]
  }
}
```

#### OpenCode — Agent Definition

In OpenCode, toolsets are defined per agent in the configuration:

```yaml
# opencode.yaml
agents:
  planner:
    model: anthropic/claude-sonnet-4-20250514
    tools: [read, glob, grep]
    system: "You are in planning mode. Read and analyze only."
  
  builder:
    model: anthropic/claude-sonnet-4-20250514
    tools: [read, write, edit, bash, glob, grep]
    system: "You are in build mode. Full development access."
  
  reviewer:
    model: anthropic/claude-sonnet-4-20250514
    tools: [read, glob, grep]
    system: "You are in review mode. Analyze and suggest, never modify."
```

#### Manual — Instruction-based

For tools that don't support programmatic restrictions, include the profile in the system instructions:

```markdown
<!-- In CLAUDE.md or system prompt -->
## Active Toolset: review

You are currently in **review mode**. The following restrictions apply:
- DO NOT write or edit any files
- DO NOT run terminal commands that modify state
- You MAY read files, search code, and run git log/diff/show
- Suggest changes as code blocks, never apply them directly
```

---

## 5. Integration with Existing Framework

### 5.1 Session Memory + Engram MCP Server

If the project uses the Engram MCP server for semantic memory, session-memory acts as the lightweight complement:

```
Engram MCP:
  - Long-term semantic memory
  - Vector-based retrieval
  - Cross-project knowledge graphs
  - Heavy, requires server infrastructure

Session Memory:
  - Short-to-medium term structured memory
  - Category-based retrieval
  - Per-project or per-user
  - Lightweight, file-based, zero infrastructure
```

**Integration pattern:** Session memory handles "working memory" (recent decisions, active gotchas), while Engram handles "long-term memory" (architectural patterns across projects, team knowledge).

```
/remember decision → writes to .ai-memory/session.md (session-memory)
/engram store      → writes to Engram vector store (long-term)

On session start:
  1. Load session-memory (fast, file-based, ~500 tokens)
  2. Query Engram for relevant context (semantic search)
  3. Merge into active context
```

### 5.2 Toolsets + Domain Orchestrators

When using domain orchestrators (e.g., SDD orchestrator), toolset profiles can be automatically set per phase:

```yaml
# SDD phase → toolset mapping
sdd_toolsets:
  explore: explore    # Read-only codebase discovery
  propose: plan       # Planning and architecture
  spec: docs          # Writing specifications
  design: plan        # Architecture decisions
  tasks: plan         # Task breakdown
  apply: build        # Implementation
  verify: review      # Validation against specs
  archive: docs       # Documentation sync
```

The orchestrator automatically switches toolsets when transitioning between SDD phases:

```
User: /sdd:apply auth-feature
Orchestrator:
  1. Sets toolset → build
  2. Loads session memory
  3. Loads task list from openspec/changes/auth-feature/tasks.md
  4. Begins implementation with full tool access
```

### 5.3 /remember + SDD Workflow

During SDD phases, the `/remember` command gains additional context:

```
# During /sdd:explore
/remember "The payments module uses event sourcing"
→ Stored in: Gotchas (tagged: sdd:explore, payments)

# During /sdd:apply
/remember "Had to use a workaround for the Stripe webhook race condition"  
→ Stored in: Gotchas (tagged: sdd:apply, payments, stripe)

# During /sdd:verify
/remember "Integration tests need STRIPE_TEST_KEY env var"
→ Stored in: Gotchas (tagged: sdd:verify, testing, env)
```

### 5.4 Session Memory + Codebase Cartography

When combined with codebase-cartography (if available), session memory can reference map regions:

```markdown
## Gotchas
- [2024-02-10] The auth module (map:core/auth) has circular deps with user module
- [2024-02-12] The API gateway (map:infra/gateway) rate limits are per-IP, not per-user
```

This allows the AI to quickly navigate to relevant code when a memory entry is surfaced.

---

## 6. Code Examples

### 6.1 Memory File Parser and Writer (Python)

```python
#!/usr/bin/env python3
"""
session_memory.py — Parse and write .ai-memory/session.md files.
"""

import re
from datetime import datetime, timedelta
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class MemoryEntry:
    """A single memory entry with metadata."""
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


# Category TTLs in days
CATEGORY_TTLS = {
    "Project Decisions": 180,
    "User Preferences": 99999,  # never expires
    "Gotchas": 90,
    "Patterns": 120,
    "Action Items": 30,
    "General": 14,
}

# Category priority (higher = keep longer when pruning)
CATEGORY_PRIORITY = {
    "Project Decisions": 6,
    "Gotchas": 5,
    "Patterns": 4,
    "User Preferences": 3,
    "Action Items": 2,
    "General": 1,
}


class SessionMemory:
    """Manages session memory files."""
    
    def __init__(self, project_path: Optional[Path] = None):
        self.project_path = project_path or Path.cwd()
        self.project_memory_path = self.project_path / ".ai-memory" / "session.md"
        self.user_memory_path = Path.home() / ".ai-memory" / "global.md"
        self.entries: dict[str, list[MemoryEntry]] = {}
    
    def load(self) -> dict[str, list[MemoryEntry]]:
        """Load and merge memory from all tiers."""
        self.entries = {}
        
        # Load user-level first (lowest priority)
        if self.user_memory_path.exists():
            self._parse_file(self.user_memory_path)
        
        # Load project-level (overrides user-level)
        if self.project_memory_path.exists():
            self._parse_file(self.project_memory_path)
        
        return self.entries
    
    def _parse_file(self, path: Path) -> None:
        """Parse a memory markdown file into entries."""
        content = path.read_text()
        current_category = "General"
        
        for line in content.splitlines():
            # Detect category headers
            header_match = re.match(r"^## (.+)$", line)
            if header_match:
                current_category = header_match.group(1).strip()
                if current_category not in self.entries:
                    self.entries[current_category] = []
                continue
            
            # Detect entry lines
            if line.strip().startswith("- "):
                entry = MemoryEntry.from_line(line, current_category)
                if current_category not in self.entries:
                    self.entries[current_category] = []
                self.entries[current_category].append(entry)
    
    def add(self, content: str, category: str = "General",
            tags: Optional[list[str]] = None) -> MemoryEntry:
        """Add a new memory entry."""
        entry = MemoryEntry(
            content=content,
            category=category,
            date=datetime.now(),
            tags=tags or [],
        )
        if category not in self.entries:
            self.entries[category] = []
        self.entries[category].append(entry)
        return entry
    
    def remember(self, text: str) -> MemoryEntry:
        """Process a /remember command — auto-categorize and store."""
        category = self._detect_category(text)
        return self.add(content=text, category=category)
    
    def forget(self, pattern: str) -> int:
        """Remove entries matching a pattern. Returns count removed."""
        removed = 0
        for category in self.entries:
            before = len(self.entries[category])
            self.entries[category] = [
                e for e in self.entries[category]
                if pattern.lower() not in e.content.lower()
            ]
            removed += before - len(self.entries[category])
        return removed
    
    def prune(self) -> int:
        """Remove expired entries based on category TTLs."""
        removed = 0
        for category, entries in self.entries.items():
            ttl = CATEGORY_TTLS.get(category, 14)
            before = len(entries)
            self.entries[category] = [
                e for e in entries if not e.is_expired(ttl)
            ]
            removed += before - len(self.entries[category])
        return removed
    
    def save(self, path: Optional[Path] = None) -> None:
        """Write memory to file."""
        target = path or self.project_memory_path
        target.parent.mkdir(parents=True, exist_ok=True)
        
        lines = [
            "# Session Memory\n",
            "> Auto-managed by session-memory skill. Manual edits are preserved.",
            f"> Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            f"> Token budget: ~500 tokens\n",
        ]
        
        # Sort categories by priority (highest first)
        sorted_cats = sorted(
            self.entries.keys(),
            key=lambda c: CATEGORY_PRIORITY.get(c, 0),
            reverse=True,
        )
        
        for category in sorted_cats:
            entries = self.entries[category]
            if not entries:
                continue
            lines.append(f"## {category}")
            for entry in entries:
                lines.append(entry.to_line())
            lines.append("")  # blank line between sections
        
        target.write_text("\n".join(lines))
    
    def token_estimate(self) -> int:
        """Estimate token count of current memory."""
        total_chars = sum(
            len(e.to_line())
            for entries in self.entries.values()
            for e in entries
        )
        return total_chars // 4  # rough estimate: 1 token ≈ 4 chars
    
    def enforce_budget(self, max_tokens: int = 500) -> int:
        """Prune until under token budget. Returns entries removed."""
        removed = 0
        
        # Step 1: Remove expired entries
        removed += self.prune()
        if self.token_estimate() <= max_tokens:
            return removed
        
        # Step 2: Remove by priority (lowest first)
        sorted_cats = sorted(
            self.entries.keys(),
            key=lambda c: CATEGORY_PRIORITY.get(c, 0),
        )
        
        for category in sorted_cats:
            if self.token_estimate() <= max_tokens:
                break
            while self.entries[category] and self.token_estimate() > max_tokens:
                self.entries[category].pop(0)  # remove oldest first
                removed += 1
        
        return removed
    
    def _detect_category(self, text: str) -> str:
        """Auto-detect category from text content."""
        lower = text.lower()
        
        decision_words = ["decided", "chose", "will use", "agreed", "approved",
                          "switched to", "migrated to", "adopted"]
        if any(w in lower for w in decision_words):
            return "Project Decisions"
        
        preference_words = ["prefer", "always", "never", "style", "convention",
                           "like to", "want to", "my preference"]
        if any(w in lower for w in preference_words):
            return "User Preferences"
        
        gotcha_words = ["careful", "gotcha", "bug", "workaround", "watch out",
                       "don't forget", "beware", "issue with", "breaks when"]
        if any(w in lower for w in gotcha_words):
            return "Gotchas"
        
        pattern_words = ["pattern", "approach", "convention", "standard",
                        "template", "boilerplate", "follow the"]
        if any(w in lower for w in pattern_words):
            return "Patterns"
        
        action_words = ["todo", "next time", "follow up", "need to", "should"]
        if any(w in lower for w in action_words):
            return "Action Items"
        
        return "General"
    
    def to_context_string(self) -> str:
        """Render memory as a string suitable for injection into AI context."""
        lines = ["<session-memory>"]
        for category, entries in self.entries.items():
            if entries:
                lines.append(f"  [{category}]")
                for e in entries:
                    lines.append(f"    {e.to_line()}")
        lines.append("</session-memory>")
        return "\n".join(lines)


# --- CLI usage ---
if __name__ == "__main__":
    import sys
    
    mem = SessionMemory()
    mem.load()
    
    if len(sys.argv) < 2:
        print(mem.to_context_string())
        print(f"\nToken estimate: {mem.token_estimate()}")
        sys.exit(0)
    
    cmd = sys.argv[1]
    
    if cmd == "remember" and len(sys.argv) > 2:
        text = " ".join(sys.argv[2:])
        entry = mem.remember(text)
        mem.save()
        print(f"Stored in [{entry.category}]: {entry.content}")
    
    elif cmd == "forget" and len(sys.argv) > 2:
        pattern = " ".join(sys.argv[2:])
        count = mem.forget(pattern)
        mem.save()
        print(f"Removed {count} entries matching '{pattern}'")
    
    elif cmd == "prune":
        count = mem.prune()
        mem.save()
        print(f"Pruned {count} expired entries")
    
    elif cmd == "budget":
        count = mem.enforce_budget()
        mem.save()
        print(f"Removed {count} entries to meet token budget")
        print(f"Current estimate: {mem.token_estimate()} tokens")
    
    else:
        print("Usage: session_memory.py [remember <text>|forget <pattern>|prune|budget]")
```

### 6.2 /remember Command Handler (Shell)

A lightweight shell wrapper for the `/remember` command:

```bash
#!/usr/bin/env bash
# remember.sh — CLI handler for /remember commands
# Usage: ./remember.sh "We decided to use PostgreSQL over MySQL"

set -euo pipefail

MEMORY_DIR="${AI_MEMORY_DIR:-.ai-memory}"
MEMORY_FILE="$MEMORY_DIR/session.md"
DATE=$(date +%Y-%m-%d)

# Ensure memory directory exists
mkdir -p "$MEMORY_DIR"

# Create memory file if it doesn't exist
if [[ ! -f "$MEMORY_FILE" ]]; then
  cat > "$MEMORY_FILE" << 'TEMPLATE'
# Session Memory

> Auto-managed by session-memory skill. Manual edits are preserved.

## Project Decisions

## User Preferences

## Gotchas

## Patterns

## Action Items

## General
TEMPLATE
fi

TEXT="$*"

# Auto-detect category
detect_category() {
  local text_lower
  text_lower=$(echo "$1" | tr '[:upper:]' '[:lower:]')
  
  if echo "$text_lower" | grep -qE "(decided|chose|will use|agreed|adopted)"; then
    echo "Project Decisions"
  elif echo "$text_lower" | grep -qE "(prefer|always|never|style|convention)"; then
    echo "User Preferences"
  elif echo "$text_lower" | grep -qE "(careful|gotcha|bug|workaround|watch out|beware)"; then
    echo "Gotchas"
  elif echo "$text_lower" | grep -qE "(pattern|approach|convention|standard|template)"; then
    echo "Patterns"
  elif echo "$text_lower" | grep -qE "(todo|next time|follow up|need to)"; then
    echo "Action Items"
  else
    echo "General"
  fi
}

CATEGORY=$(detect_category "$TEXT")
ENTRY="- [$DATE] $TEXT"

# Insert entry under the correct category header
# Uses awk to find the category section and append after its header
awk -v category="## $CATEGORY" -v entry="$ENTRY" '
  $0 == category { print; print entry; next }
  { print }
' "$MEMORY_FILE" > "${MEMORY_FILE}.tmp" && mv "${MEMORY_FILE}.tmp" "$MEMORY_FILE"

echo "Stored in [$CATEGORY]: $TEXT"
```

### 6.3 Toolset Profile Loader (Bash)

```bash
#!/usr/bin/env bash
# toolset-loader.sh — Load and switch toolset profiles
# Usage: source toolset-loader.sh plan|build|review|explore|deploy|debug|docs

set -euo pipefail

TOOLSET_DIR="${TOOLSET_DIR:-.claude}"
ACTIVE_FILE="$TOOLSET_DIR/active-toolset"

load_profile() {
  local profile="$1"
  local valid_profiles="plan build review explore deploy debug docs"
  
  if ! echo "$valid_profiles" | grep -qw "$profile"; then
    echo "Error: Unknown profile '$profile'"
    echo "Valid profiles: $valid_profiles"
    return 1
  fi
  
  mkdir -p "$TOOLSET_DIR"
  echo "$profile" > "$ACTIVE_FILE"
  
  # Display profile info
  case "$profile" in
    plan)
      echo "Toolset: PLAN — Read-only exploration with task management"
      echo "Tools: read, glob, grep, task, webfetch"
      echo "Restricted: no writes, no terminal, no git"
      ;;
    build)
      echo "Toolset: BUILD — Full development access"
      echo "Tools: read, write, edit, bash, glob, grep, task, webfetch"
      echo "Restricted: no force push"
      ;;
    review)
      echo "Toolset: REVIEW — Analyze without modifying"
      echo "Tools: read, glob, grep, bash (read-only)"
      echo "Restricted: no writes, no edits, no push"
      ;;
    explore)
      echo "Toolset: EXPLORE — Pure read-only codebase discovery"
      echo "Tools: read, glob, grep"
      echo "Restricted: no bash, no writes, no edits"
      ;;
    deploy)
      echo "Toolset: DEPLOY — Operations and deployment"
      echo "Tools: bash, read, glob, grep"
      echo "Restricted: no source code edits"
      ;;
    debug)
      echo "Toolset: DEBUG — Investigation with limited writes"
      echo "Tools: read, glob, grep, bash, edit"
      echo "Restricted: no new files, no push"
      ;;
    docs)
      echo "Toolset: DOCS — Documentation writing"
      echo "Tools: read, write (*.md only), edit (*.md only), glob, grep"
      echo "Restricted: no source edits, no bash"
      ;;
  esac
}

get_active_profile() {
  if [[ -f "$ACTIVE_FILE" ]]; then
    cat "$ACTIVE_FILE" | tr -d '[:space:]'
  else
    echo "build"  # default
  fi
}

# If called with an argument, load that profile
if [[ $# -gt 0 ]]; then
  load_profile "$1"
fi
```

### 6.4 Session Init Script

A unified script that loads memory and sets the toolset on session start:

```bash
#!/usr/bin/env bash
# session-init.sh — Initialize AI coding session with memory + toolset
# Called automatically or manually at session start

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

echo "=== AI Session Init ==="
echo "Project: $PROJECT_ROOT"
echo ""

# --- Step 1: Load Session Memory ---
echo "--- Loading Session Memory ---"

MEMORY_FILE="$PROJECT_ROOT/.ai-memory/session.md"
GLOBAL_MEMORY="$HOME/.ai-memory/global.md"

memory_tokens=0

if [[ -f "$GLOBAL_MEMORY" ]]; then
  global_chars=$(wc -c < "$GLOBAL_MEMORY")
  global_tokens=$((global_chars / 4))
  echo "  User memory: $GLOBAL_MEMORY ($global_tokens tokens)"
  memory_tokens=$((memory_tokens + global_tokens))
fi

if [[ -f "$MEMORY_FILE" ]]; then
  project_chars=$(wc -c < "$MEMORY_FILE")
  project_tokens=$((project_chars / 4))
  echo "  Project memory: $MEMORY_FILE ($project_tokens tokens)"
  memory_tokens=$((memory_tokens + project_tokens))
fi

if [[ $memory_tokens -eq 0 ]]; then
  echo "  No memory files found. Starting fresh."
else
  echo "  Total memory: ~$memory_tokens tokens"
  if [[ $memory_tokens -gt 500 ]]; then
    echo "  WARNING: Memory exceeds 500 token budget. Run: /memories prune"
  fi
fi

echo ""

# --- Step 2: Set Toolset Profile ---
echo "--- Setting Toolset Profile ---"

TOOLSET="${1:-build}"  # Default to 'build' if not specified

if [[ -f "$PROJECT_ROOT/.claude/active-toolset" ]]; then
  TOOLSET=$(cat "$PROJECT_ROOT/.claude/active-toolset" | tr -d '[:space:]')
  echo "  Loaded active profile from file: $TOOLSET"
else
  echo "  Using default profile: $TOOLSET"
fi

# Source the toolset loader (defined above)
if [[ -f "$SCRIPT_DIR/toolset-loader.sh" ]]; then
  source "$SCRIPT_DIR/toolset-loader.sh" "$TOOLSET"
fi

echo ""
echo "=== Session Ready ==="
```

---

## 7. Anti-Patterns

### 7.1 Storing Sensitive Data in Memory

**Don't:**

```markdown
## Gotchas
- [2024-01-15] API key for Stripe: sk_live_abc123def456
- [2024-01-16] Database password is "hunter2" in production
```

Memory files may be committed to git. Never store secrets, API keys, passwords, tokens, or PII. Instead, reference where secrets are stored:

**Do:**

```markdown
## Gotchas
- [2024-01-15] Stripe API key is in 1Password vault "Engineering Shared"
- [2024-01-16] Production DB credentials are in AWS Secrets Manager
```

### 7.2 Letting Memory Files Grow Unbounded

**Don't:** Add entries without ever pruning. A 2000-token memory file consumes valuable context window space and slows down every AI response.

**Do:** Run `/memories prune` regularly. Set up auto-pruning. Keep under the 500-token budget. Remove resolved gotchas and completed action items.

### 7.3 Micromanaging with Toolsets

**Don't:** Create ultra-restrictive profiles that prevent the AI from doing its job:

```yaml
ultra-restricted:
  tools: [read]
  restrictions: [everything]
```

**Do:** Trust the agent with the tools it needs for the current task. Toolsets are guardrails, not cages. The `build` profile should be the default for most work.

### 7.4 Forgetting to Prune Outdated Memories

**Don't:** Leave entries like "The deploy pipeline is broken" from 6 months ago. Stale memories actively mislead the AI.

**Do:** Review memories monthly. Mark time-sensitive entries with TTLs. Let auto-pruning handle the rest.

### 7.5 Mixing Personal and Project Memories

**Don't:** Store personal preferences in the project-level memory file:

```markdown
## User Preferences (in .ai-memory/session.md — shared with team!)
- I prefer dark mode
- I like tabs over spaces
- Always use vim keybindings
```

**Do:** Keep personal preferences in `~/.ai-memory/global.md` (user-level). Project-level memory should only contain team-relevant decisions and conventions.

### 7.6 Duplicating Existing Documentation

**Don't:** Use session memory to replicate what should be in README, CONTRIBUTING.md, or ADRs:

```markdown
## Project Decisions
- [2024-01-01] We use React 19 with TypeScript
- [2024-01-01] We use PostgreSQL 16
- [2024-01-01] We use Docker for containerization
- [2024-01-01] We deploy to AWS ECS
... (50 more entries duplicating the tech stack docs)
```

**Do:** Store only delta information — things that aren't obvious from the codebase or existing docs. Session memory complements documentation, it doesn't replace it.

### 7.7 Ignoring Token Budget Warnings

**Don't:** Dismiss budget warnings. Every token in memory is a token unavailable for the AI's actual reasoning about your code.

**Do:** Treat the token budget as a hard constraint. 500 tokens of high-signal memory is better than 2000 tokens of noise.

---

## 8. Quick Reference

### Commands

| Command | Description |
|---------|-------------|
| `/remember <text>` | Store a memory entry (auto-categorized) |
| `/forget <pattern>` | Remove entries matching pattern |
| `/memories` | Show all current memories |
| `/memories prune` | Remove expired entries |
| `/memories export` | Export to shareable format |
| `/memories import <path>` | Import from file |
| `/toolset <profile>` | Switch to a toolset profile |
| `/toolset status` | Show active profile |
| `/toolset reset` | Return to default (build) |

### File Locations

| File | Purpose |
|------|---------|
| `.ai-memory/session.md` | Project-level memories (committed) |
| `~/.ai-memory/global.md` | User-level preferences (personal) |
| `.claude/active-toolset` | Current active toolset profile |
| `toolsets.yaml` | Profile definitions |
| `.claude/hooks/toolset-enforcer.sh` | Hook for Claude Code enforcement |

### Token Budget

| Tier | Budget | ~Entries |
|------|--------|----------|
| Project | 300 tokens | ~20 |
| User | 150 tokens | ~10 |
| Session | 50 tokens | ~5 |
| **Total** | **500 tokens** | **~35** |

### Category TTLs

| Category | TTL | Priority |
|----------|-----|----------|
| Decisions | 180 days | Highest |
| Gotchas | 90 days | High |
| Patterns | 120 days | Medium |
| Preferences | Never | Medium |
| Action Items | 30 days | Low |
| General | 14 days | Lowest |
