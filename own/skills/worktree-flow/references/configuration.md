# Worktree Flow — Configuration Reference

## Configuration File

```yaml
# .ai-config/worktree.yaml
worktree:
  base_dir: .worktrees           # Where worktrees are created
  branch_prefix: agent           # Branch naming: agent/task-001
  auto_pr: true                  # Create PR when task completes
  auto_cleanup: true             # Remove worktree after PR created
  pr_template: .github/PULL_REQUEST_TEMPLATE.md
  max_concurrent: 4              # Maximum simultaneous worktrees
  validation:
    run_tests: true              # Run tests before PR
    run_lint: true               # Run linter before PR
    test_command: npm test        # Override test command
    lint_command: npm run lint    # Override lint command
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKTREE_BASE_DIR` | `.worktrees` | Base directory for worktrees |
| `WORKTREE_BRANCH_PREFIX` | `agent` | Prefix for worktree branches |
| `WORKTREE_AUTO_PR` | `true` | Auto-create PR on completion |
| `WORKTREE_AUTO_CLEANUP` | `true` | Auto-remove after PR |
| `WORKTREE_MAX_CONCURRENT` | `4` | Max simultaneous worktrees |
| `WORKTREE_VALIDATE` | `true` | Run validation before PR |

## Per-Task Override

```yaml
# In playbook or task file
task:
  id: task-001
  worktree:
    branch: feature/custom-branch  # Override branch name
    base: develop                   # Base branch (default: current)
    skip_validation: true           # Skip tests for this task
```

## Troubleshooting

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| "already checked out" | Branch in use by another worktree | `git worktree list`, remove stale |
| Lock file exists | Unclean removal | `git worktree prune` |
| Tests fail in worktree | Missing node_modules | Run `npm install` in worktree |
| Merge conflicts | Overlapping file changes | Restructure tasks to avoid same files |

### Diagnostic Commands

```bash
git worktree list              # Show all worktrees
git worktree prune             # Clean stale entries
git branch -a | grep agent/    # Find worktree branches
```

## Anti-Patterns

1. **Worktrees for sequential tasks** — Only parallel tasks benefit from isolation
2. **Forgetting cleanup** — Stale worktrees waste disk and confuse git
3. **Sharing worktrees between agents** — One agent per worktree, always
4. **Same branch in two worktrees** — Git forbids this; use unique branches
5. **Skipping validation before PR** — Broken PRs waste reviewer time
6. **Working in main worktree while agents use it** — Keep main for interactive work
