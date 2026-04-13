---
name: worktree-flow
description: >
  Automated git worktree workflows — isolate each task in its own worktree, work in parallel, and auto-create PRs.
  Trigger: When running parallel tasks with git worktrees, automating PR creation from worktrees, or configuring wave-executor for isolated execution.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.3"
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
1. CREATE      → git worktree add .worktrees/{task-id} -b {prefix}/{task-id}
2. WORK        → Agent implements task in worktree directory
3. VALIDATE    → Run tests + lint in worktree
4. PREVIEW     → Show diff, flag unexpected files, ask for approval
5. CREATE PR   → Push branch, create PR via gh CLI
6. CLEANUP     → git worktree remove .worktrees/{task-id} && git branch -d {prefix}/{task-id}
                → git worktree prune
```

### Step Details

**Create**: Verify clean git state, check no leftover worktrees, create with `-b` for new branch.

**Work**: Agent operates entirely within the worktree directory. Install deps if needed (`npm install`).

**Validate**: Run project tests and linter. Only proceed to PR if both pass.

**Preview Diff Before Merge**: Before merging or creating a PR, generate a diff preview and present it for approval. This prevents blind merges of unexpected changes.

```bash
# Preview what will be merged into the target branch
git diff main...{prefix}/{task-id} --stat
git diff main...{prefix}/{task-id}
```

The agent MUST:
1. Show the diff summary (`--stat`) first for a high-level overview
2. Show the full diff for files that changed
3. Highlight any files that were NOT in the task's ownership list (unexpected changes)
4. ASK for explicit approval before proceeding to merge or PR creation
5. If the user rejects, the worktree stays intact for further work — do NOT cleanup

**Approval prompt format**:
```
Worktree {task-id} is ready to merge:
- {N} files changed, {insertions} insertions, {deletions} deletions
- Unexpected files outside ownership: {list or "none"}

Proceed with merge/PR? [y/n]
```

When running in headless/CI mode (no interactive user), skip the approval prompt and log the diff to stdout instead. Headless mode is detected when `WORKTREE_HEADLESS=true` is set in the environment.

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

## 6. Pre-Flight Checks

Before creating ANY worktree, verify these conditions. If any fail, STOP and report to the user.

```bash
# 1. Clean git state (no uncommitted changes)
test -z "$(git status --porcelain)" || echo "FAIL: dirty working tree"

# 2. No leftover worktrees from previous runs
worktree_count=$(git worktree list | wc -l)
test "$worktree_count" -eq 1 || echo "WARN: $((worktree_count - 1)) existing worktrees found"

# 3. Not in merge/rebase state
test ! -d .git/rebase-merge && test ! -d .git/rebase-apply && test ! -f .git/MERGE_HEAD || echo "FAIL: merge/rebase in progress"

# 4. .worktrees/ in .gitignore
grep -q '.worktrees' .gitignore 2>/dev/null || echo "WARN: .worktrees not in .gitignore"
```

If pre-flight fails:
- Dirty tree → suggest `git stash` or commit
- Leftover worktrees → suggest `git worktree remove` + `git worktree prune`
- Merge/rebase → suggest `git merge --abort` or `git rebase --abort`
- Missing gitignore → add `.worktrees/` to `.gitignore` automatically

---

## 7. Branch Naming Conventions

Branch names follow `{prefix}/{identifier}` with context-specific prefixes:

| Context | Prefix | Example |
|---------|--------|---------|
| General agent tasks | `agent/` | `agent/task-001` |
| SDD parallel apply | `sdd/{change}/` | `sdd/auth-refactor/task-3` |
| Feature branches | `feat/` | `feat/add-dark-mode` |
| Fix branches | `fix/` | `fix/login-timeout` |
| CI validation | `ci/` | `ci/validate-build` |

Rules:
- Lowercase, hyphens only (no underscores, no spaces)
- Max 60 characters for the full branch name
- Include task ID when running batched tasks
- NEVER reuse a branch name — append timestamp if collision risk exists

---

## 8. Merge-Conflict Handling (Refinery Pattern)

When merging worktree branches back into the base branch, conflicts may occur if tasks touched overlapping files despite ownership rules.

### Sequential Merge Protocol

Merge branches one at a time in dependency order:

```bash
git checkout {base-branch}
git merge --no-ff sdd/{change}/task-{id} -m "merge: task {id} from parallel apply"
```

### On Conflict — Bisection Algorithm

When a batch of N branches produces a merge conflict:

```
CONFLICT in batch [T1, T2, T3, T4]:

Round 1 — Split in half:
  Merge [T1, T2] → success → keep merged
  Merge [T3, T4] → conflict → bisect again

Round 2 — Isolate:
  Merge [T3] → success → keep merged
  Merge [T4] → CONFLICT → culprit isolated

Result: T1, T2, T3 merged. T4 flagged for manual resolution.
```

### Conflict Resolution Rules

1. **NEVER auto-resolve conflicts** — always flag for human review
2. **Merge successful branches first** — don't block passing work
3. **Leave culprit worktree intact** — user needs it for inspection
4. **Report format**:
   ```
   Merged: T1, T2, T3
   Conflict: T4
     Branch: sdd/{change}/task-T4
     Worktree: .worktrees/sdd-{change}-task-T4
     Conflicting files: [list]
   ```
5. After conflict resolution, user merges manually: `git merge sdd/{change}/task-T4`

---

## 9. Cleanup & Recovery

### Normal Cleanup (after successful merge/PR)

```bash
git worktree remove .worktrees/{task-id}
git branch -d {prefix}/{task-id}
git worktree prune
```

### Stale Worktree Recovery

Detect and clean stale worktrees (directory deleted but git still tracks them):

```bash
# List all worktrees — stale ones show "prunable"
git worktree list --porcelain

# Remove all stale entries
git worktree prune

# Force-remove a stuck worktree (directory still exists but locked)
git worktree remove --force .worktrees/{task-id}
```

### Lock File Recovery

If a worktree has a `.git/worktrees/{id}/locked` file preventing removal:

```bash
# Check if locked
git worktree list --porcelain | grep locked

# Unlock and remove
git worktree unlock .worktrees/{task-id}
git worktree remove .worktrees/{task-id}
```

### Bulk Cleanup (after a failed run)

```bash
# Remove ALL worktrees under .worktrees/
for wt in .worktrees/*/; do
  task_id=$(basename "$wt")
  git worktree remove --force "$wt" 2>/dev/null
  git branch -D "agent/$task_id" 2>/dev/null
done
git worktree prune

# Verify clean state
git worktree list  # Should show only main worktree
```

### Orphaned Branch Cleanup

After bulk cleanup, branches may remain without worktrees:

```bash
# List agent branches that no longer have worktrees
git branch --list 'agent/*' --list 'sdd/*'

# Delete them (after confirming no unmerged work)
git branch -d agent/task-001 agent/task-002
```

---

## 10. Anti-Patterns

1. **Worktrees for sequential tasks** — Only parallel tasks benefit from isolation
2. **Forgetting cleanup** — Stale worktrees waste disk and confuse git
3. **Sharing worktrees** — One agent per worktree, always
4. **Same branch in two worktrees** — Git forbids this
5. **Skipping validation** — Broken PRs waste reviewer time
6. **Working in main while agents use it** — Keep main for interactive work
7. **Skipping pre-flight checks** — Dirty state or leftover worktrees cause silent failures
8. **Auto-resolving merge conflicts** — Always flag for human review, never guess
9. **Reusing branch names** — Stale remote refs cause push failures and confusion

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
