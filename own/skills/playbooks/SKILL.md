---
name: playbooks
description: >
  Executable markdown playbooks for AI agents — checkbox task documents, batch processing, and repeatable workflows.
  Trigger: When creating task documents for AI execution, running batch workflows, or building repeatable automation playbooks.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.1"
---

# Playbooks — Executable Markdown for AI Agents

## 1. Core Principle

Playbooks are **executable markdown documents**. Each checkbox (`- [ ]`) is a discrete task processed independently by an AI agent. The format is simultaneously human-readable documentation AND machine-parseable instruction sets.

```
Playbook.md → Agent reads → Finds first unchecked → Executes → Checks [x] → Commits → Next
```

---

## 2. Playbook Format

```markdown
# Playbook: Short Descriptive Title

## Metadata
- **Execution mode**: sequential | batch | loop | parallel
- **Estimated**: 45 min
- **Tags**: deployment, backend

## Prerequisites
- [ ] All tests passing on main branch

## Tasks
- [ ] First task with specific file paths and details
- [ ] Second task with expected outcome

## Post-completion
- [ ] Notify team
```

| Section | Required | Purpose |
|---------|----------|---------|
| `# Playbook: Title` | Yes | Identifies as playbook |
| `## Metadata` | No | Machine-readable properties |
| `## Prerequisites` | No | Must ALL pass before tasks |
| `## Tasks` | Yes | Executable steps |
| `## Post-completion` | No | After all tasks finish |

---

## 3. Task Granularity Rules

**One-Session Rule**: Each task MUST complete in 1-5 minutes (one AI session).

**Task anatomy**: Action verb + Target (file path) + Specifics + Outcome

```markdown
# BAD
- [ ] Fix the tests

# GOOD
- [ ] Fix failing test in tests/api/users.test.ts:45 — mock the Redis client
```

| Size | Tasks | Use for |
|------|-------|---------|
| Micro | 3-5 | Quick fix |
| Small | 5-10 | Feature, bug fix |
| Medium | 10-20 | Multi-file feature |
| Large | 20-35 | Major feature |
| Too large | 35+ | Break into multiple playbooks |

---

## 4. Execution Modes

| Mode | Behavior |
|------|----------|
| **sequential** (default) | Top-to-bottom, clean context per task |
| **batch** | Multiple playbooks in numeric prefix order |
| **loop** | Repeat until all checked. `Max iterations` prevents infinite loops |
| **parallel** | `[PARALLEL]` tasks in worktrees, `[SEQUENTIAL]` waits for parallel |

---

## 5. Progress Tracking

The file IS the tracker. Each completed task = git commit.

```markdown
- [x] Done task
- [ ] Next task  ← agent starts here
- [ ] !! Failed: error description
- [ ] >> Skipped: reason
```

**Commit convention**: `playbook(<name>): complete task <n>/<total> - <summary>`

**Resume protocol**: Read file → count progress → find first unchecked (not failed/skipped) → execute → continue.

---

## 6. Anti-Patterns

1. **Vague tasks** — Always include file paths, function names, specific details
2. **50+ tasks** — Break into focused playbooks (max 35)
3. **Missing prerequisites** — Validate readiness before tasks
4. **Assuming shared context** — Each task must be self-contained
5. **No error recovery** — Include rollback considerations
6. **Mixing concerns** — Separate by domain (backend vs frontend)

> @reference references/templates.md — Load when creating playbooks from templates (feature, bugfix, release, onboarding, migration)

> @reference references/code-examples.md — Load when implementing playbook runners (bash), parsers (python), or git integration helpers

> @reference references/patterns.md — Load when using advanced patterns (conditional tasks, parameterized, chaining, approval gates, rollback, wave executor integration)

---

## Quick Reference

```
STRUCTURE:     # Playbook: Title → ## Prerequisites → ## Tasks → ## Post-completion
TASK FORMAT:   - [ ] <verb> <target> in <path> — <details>
STATUS:        - [x] done | - [ ] !! failed | - [ ] >> skipped
CONDITIONAL:   - [ ] [IF condition] Task description
PARAMETERIZED: {{parameter_name}} replaced before execution
MODES:         sequential | batch | loop | parallel
STORAGE:       .ai-playbooks/active/ | templates/ | archive/
MAX TASKS:     35 per playbook
TASK DURATION: 1-5 min each
```
