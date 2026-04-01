# Worktree Flow — Code Examples & Scripts

Shell scripts for worktree management, auto-PR creation, and wave execution.

> Load when implementing worktree-based parallel workflows.

## worktree-create.sh

Creates a worktree with branch, validates clean state, adds .gitignore entry.

## worktree-cleanup.sh

Removes worktree directory, deletes branch, runs `git worktree prune`.

## worktree-status.sh

Lists all worktrees with branch, status (clean/dirty), and file counts.

## worktree-pr.sh

Validates worktree, pushes branch, creates PR via `gh pr create` with structured body.

## Wave Execution Script

Manages waves of parallel worktrees: creates worktrees for each task, waits for completion, validates, creates PRs, cleans up.

## PR Body Template

```markdown
## Summary
{auto-generated from commit messages}

## Changes
{list of files changed}

## Validation Results
- Tests: {pass/fail}
- Lint: {pass/fail}

## Dependencies
{list any dependencies on other worktree tasks}
```

## Integration Patterns

### with `using-git-worktrees`
Standard git worktree commands for creating, listing, removing.

### with `finishing-a-development-branch`
Push worktree branch, create PR, merge when approved, cleanup.

### with `playbooks`
Each playbook task runs in its own worktree for isolation.

### with `wave-workflow`
Wave executor creates worktrees per wave task, runs in parallel.
