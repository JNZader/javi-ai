---
name: worktree-flow
description: >
  Automated git worktree workflows — isolate each task in its own worktree, work in parallel, and auto-create PRs.
  Trigger: When running parallel tasks with git worktrees, automating PR creation from worktrees, or configuring wave-executor for isolated execution.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.1"
---

# Worktree Flow

Automated git worktree workflows for parallel AI agent execution with isolated branches and auto-PR creation.

---

## 1. Core Principle

Git worktrees let you have multiple branches checked out simultaneously in separate directories. Combined with AI agents:

- **Each task gets its own directory and branch** — no stashing, no context switching
- **No merge conflicts between parallel tasks** — physically separate directories
- **Clean git history per feature** — linear commits on isolated branches
- **Auto-PR creation** — agent pushes branch and creates PR without intervention
- **Main repo stays clean** — you work in main worktree while agents work in `.worktrees/`

---

## 2. Architecture

```
repo/                    (main - your work)
.worktrees/
  task-001/              (branch: agent/task-001 - agent 1)
  task-002/              (branch: agent/task-002 - agent 2)
  task-003/              (branch: agent/task-003 - agent 3)
```

### Key Invariants

- One worktree per task, one branch per worktree
- `.worktrees/` is gitignored
- Agents NEVER modify the main worktree
- All worktrees share the same `.git` directory (cheap on disk)
- Branch naming: `{prefix}/{task-id}` (e.g., `agent/task-001`)

---

## 3. Lifecycle

```
1. CREATE   → git worktree add .worktrees/{task-id} -b {prefix}/{task-id}
2. WORK     → Agent implements task in worktree directory
3. VALIDATE → Run tests + lint in worktree
4. CREATE PR → Push branch, create PR via gh CLI
5. CLEANUP  → git worktree remove .worktrees/{task-id} && git branch -d {prefix}/{task-id}
             → git worktree prune
```

### Step Details

**Create**: Verify clean git state, check no leftover worktrees, create with `-b` for new branch.

**Work**: Agent operates entirely within the worktree directory. Install deps if needed (`npm install`).

**Validate**: Run project tests and linter. Only proceed to PR if both pass.

**Create PR**: Push branch, create PR with structured body (summary, changes, validation results, dependencies).

**Cleanup**: Remove worktree directory, delete local branch, prune stale entries.

---

## 4. Wave Execution

For multiple parallel tasks, execute in waves:

```
Wave 1 (parallel):
  .worktrees/task-001/ → agent-1
  .worktrees/task-002/ → agent-2
  .worktrees/task-003/ → agent-3

All complete → validate all → create PRs → cleanup

Wave 2 (parallel):
  .worktrees/task-004/ → agent-1
  .worktrees/task-005/ → agent-2
```

### File Ownership Protocol

When tasks might touch overlapping files, assign file ownership:
- Each task gets exclusive ownership of specific files/directories
- Agents MUST NOT modify files outside their ownership
- The wave executor validates no file conflicts before starting

---

## 5. Auto-PR Creation

After task completion, push branch and create PR:

```bash
cd .worktrees/{task-id}
git push -u origin {prefix}/{task-id}
gh pr create --title "feat: {task description}" --body "$(cat <<'EOF'
## Summary
{what was done}

## Changes
{files changed}

## Validation
- Tests: pass
- Lint: pass
EOF
)"
```

---

## 6. Anti-Patterns

1. **Worktrees for sequential tasks** — Only parallel tasks benefit from isolation
2. **Forgetting cleanup** — Stale worktrees waste disk and confuse git
3. **Sharing worktrees** — One agent per worktree, always
4. **Same branch in two worktrees** — Git forbids this
5. **Skipping validation** — Broken PRs waste reviewer time
6. **Working in main while agents use it** — Keep main for interactive work

> @reference references/code-examples.md — Load when implementing worktree management scripts (create, cleanup, status, auto-PR, wave executor)

> @reference references/configuration.md — Load when configuring worktree settings, environment variables, troubleshooting, or per-task overrides

---

## Quick Reference

```bash
# Create worktree
git worktree add .worktrees/task-001 -b agent/task-001

# List all worktrees
git worktree list

# Remove worktree
git worktree remove .worktrees/task-001
git branch -d agent/task-001

# Prune stale
git worktree prune
```

### Decision Matrix

| Scenario | Use Worktrees? |
|----------|---------------|
| 3+ independent tasks | Yes |
| Sequential dependent tasks | No |
| Tasks touching same files | No (unless ownership is clear) |
| Single quick fix | No |
| CI-style parallel validation | Yes |
