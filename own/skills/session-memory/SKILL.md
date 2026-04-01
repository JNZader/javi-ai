---
name: session-memory
description: >
  Session memory patterns and toolset profiles for AI coding assistants — persistent context, /remember commands, and mode-based tool access.
  Trigger: When managing AI context across sessions, implementing /remember patterns, or configuring toolset profiles for different work modes.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.1"
---

# Session Memory & Toolset Profiles

## 1. Core Principle

AI assistants are stateless by default. **Session memory** persists critical context across sessions. **Toolset profiles** restrict tools based on work mode. Together: fewer mistakes, less repetition, faster sessions.

```
Focused Tools + Persistent Context = Effective AI Sessions
```

---

## 2. Session Memory Patterns

### The /remember Pattern

| Command | Action |
|---------|--------|
| `/remember <text>` | Auto-categorize and store |
| `/forget <text>` | Remove matching entries |
| `/memories` | Show current memories |
| `/memories prune` | Remove expired entries |
| `/memories export` | Export to shareable format |

**Category detection**: decided/chose → Decision | prefer/always → Preference | gotcha/bug → Gotcha | pattern/convention → Pattern | todo/follow up → Action Item | else → General

### Memory File Format

```markdown
# Session Memory
## Project Decisions
- [2024-01-15] Use Zustand over Redux for state management
## Gotchas
- [2024-01-17] Auth middleware requires X-Custom-Header in all requests
## Patterns
- Error handling: use Result<T, E> pattern
```

### Storage Tiers

| Tier | Location | Scope | Git |
|------|----------|-------|-----|
| Project | `.ai-memory/session.md` | Team | Committed |
| User | `~/.ai-memory/global.md` | Personal | Not tracked |
| Session | In-context only | Current session | N/A |

**Precedence**: Session > Project > User

---

## 3. Memory Lifecycle

### Category TTLs & Priority

| Category | TTL | Prune Priority |
|----------|-----|---------------|
| Decisions | 180 days | Highest (keep) |
| Gotchas | 90 days | High |
| Patterns | 120 days | Medium |
| Preferences | Never | Medium |
| Action Items | 30 days | Low |
| General | 14 days | Lowest (prune first) |

### Token Budget

| Tier | Budget | ~Entries |
|------|--------|----------|
| Project | 300 tokens | ~20 |
| User | 150 tokens | ~10 |
| Session | 50 tokens | ~5 |
| **Total** | **500 tokens** | **~35** |

When over budget: remove expired → remove duplicates → remove lowest priority → summarize verbose → warn user.

---

## 4. Toolset Profiles

Restrict tools by work mode. Principle: **least privilege for AI tools**.

| Profile | Tools | Restrictions |
|---------|-------|-------------|
| `plan` | read, glob, grep, task | No writes, no terminal |
| `build` | read, write, edit, bash, glob, grep, task | No force push (default) |
| `review` | read, glob, grep, bash (read-only) | No writes, no edits |
| `explore` | read, glob, grep | No bash, no writes |
| `deploy` | bash, read, glob, grep | No source code edits |
| `debug` | read, glob, grep, bash, edit | No new files, no push |
| `docs` | read, write/edit (*.md), glob, grep | No source edits, no bash |

**Switching**: `/toolset plan` | `/toolset build` | `/toolset status` | `/toolset reset`

**Enforcement**: Claude Code uses PreToolUse hooks. OpenCode uses per-agent tool config. Manual uses system prompt instructions.

> @reference references/code-examples.md — Load when implementing the memory parser (Python), /remember handler (shell), toolset enforcer hook, or session init script

> @reference references/patterns.md — Load when integrating with Engram, domain orchestrators, SDD workflow, or reviewing anti-patterns

---

## Quick Reference

| File | Purpose |
|------|---------|
| `.ai-memory/session.md` | Project memories (committed) |
| `~/.ai-memory/global.md` | User preferences (personal) |
| `.claude/active-toolset` | Current toolset profile |
| `toolsets.yaml` | Profile definitions |
