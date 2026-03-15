---
name: worktree-flow
description: >
  Automated git worktree workflows — isolate each task in its own worktree, work in parallel, and auto-create PRs.
  Trigger: When running parallel tasks with git worktrees, automating PR creation from worktrees, or configuring wave-executor for isolated execution.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

# Worktree Flow

Automated git worktree workflows for parallel AI agent execution with isolated branches and auto-PR creation.

---

## 1. Core Principle

Git worktrees let you have multiple branches checked out simultaneously in separate directories. Combined with AI agents, this unlocks true parallel execution without interference:

- **Each task gets its own directory and branch** — No shared working tree, no stashing, no context switching.
- **No merge conflicts between parallel tasks** — Agents can't step on each other's files because they operate in physically separate directories.
- **Clean git history per feature** — Each worktree produces a linear commit history on its own branch.
- **Auto-PR creation when task completes** — The agent pushes its branch and creates a PR without human intervention.
- **Main repo stays clean for interactive work** — You keep working in the main worktree while agents work in `.worktrees/`.

### Why Not Just Branches?

Regular branches require switching back and forth (`git checkout`, `git stash`). With worktrees:

```
Regular branches:          Worktrees:
                           
repo/ (branch A)           repo/          (main - your work)
  switch to B...           .worktrees/
  switch to C...             task-001/    (branch A - agent 1)
  switch back to A...        task-002/    (branch B - agent 2)
                             task-003/    (branch C - agent 3)
```

All branches exist simultaneously. All agents run simultaneously. Zero interference.

---

## 2. Worktree-per-Task Architecture

### Directory Layout

```
~/project/                          (main worktree - interactive work)
~/project/.worktrees/
├── task-001/                       (worktree for T-001 on branch feat/t-001)
│   ├── src/
│   ├── tests/
│   └── package.json
├── task-002/                       (worktree for T-002 on branch feat/t-002)
│   ├── src/
│   ├── tests/
│   └── package.json
└── task-003/                       (worktree for T-003 on branch feat/t-003)
    ├── src/
    ├── tests/
    └── package.json
```

Each AI agent operates exclusively in its own worktree. The main worktree at `~/project/` remains untouched for your interactive development.

### Key Invariants

1. **One branch per worktree** — Git enforces this. You cannot check out the same branch in two worktrees.
2. **Shared `.git` directory** — All worktrees share the same repository data. Commits in any worktree are visible to all.
3. **Independent working trees** — File changes in one worktree do not appear in another.
4. **Shared remotes** — A `git push` from any worktree pushes to the same remote.

### .gitignore Entry

Always add the worktree directory to `.gitignore`:

```gitignore
# AI agent worktrees
.worktrees/
```

---

## 3. Setup and Lifecycle

### Full Lifecycle of a Worktree Task

```
CREATE  ──>  WORK  ──>  VALIDATE  ──>  PR  ──>  CLEANUP
  │            │           │           │          │
  │            │           │           │          └─ Remove worktree + branch
  │            │           │           └─ Push + gh pr create
  │            │           └─ Run tests in worktree dir
  │            └─ Agent works in worktree dir
  └─ git worktree add + branch creation
```

### Step-by-Step

#### Create

```bash
# Create worktree from current HEAD of main
git worktree add .worktrees/task-001 -b feat/task-001

# Create worktree from a specific base branch
git worktree add .worktrees/task-001 -b feat/task-001 origin/main

# Create worktree from a specific commit
git worktree add .worktrees/task-001 -b feat/task-001 abc1234
```

#### Work

The agent receives the worktree path as its working directory:

```bash
# Agent operates entirely within the worktree
cd .worktrees/task-001

# All git operations are scoped to this worktree
git status          # Shows only this worktree's changes
git add src/        # Stages only files in this worktree
git commit -m "..."  # Commits to feat/task-001 branch
```

#### Validate

```bash
# Run tests in the worktree directory
cd .worktrees/task-001
npm test            # or: cargo test, pytest, go test ./...

# Run linting
npm run lint

# Run type checking
npm run typecheck

# Build check
npm run build
```

#### Create PR

```bash
cd .worktrees/task-001
git add -A
git commit -m "feat(scope): implement task T-001"
git push -u origin feat/task-001
gh pr create \
  --title "feat: T-001 description" \
  --body "Automated PR from wave execution" \
  --base main
```

#### Cleanup

```bash
# Remove the worktree (from main repo directory)
git worktree remove .worktrees/task-001

# Optionally delete the branch after PR merge
git branch -d feat/task-001
git push origin --delete feat/task-001

# Prune stale worktree references
git worktree prune
```

---

## 4. Integration with Wave Executor

The wave executor orchestrates multiple tasks in parallel. Worktrees provide the isolation layer.

### Wave Execution Flow

```
┌─────────────────────────────────────────────────┐
│                 Wave Executor                    │
│                                                  │
│  1. Parse wave tasks                             │
│  2. Create worktrees (one per task)              │
│  3. Launch agents in parallel                    │
│     ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│     │ Agent 1  │ │ Agent 2  │ │ Agent 3  │      │
│     │ cwd:     │ │ cwd:     │ │ cwd:     │      │
│     │ .wt/t-01 │ │ .wt/t-02 │ │ .wt/t-03 │      │
│     └──────────┘ └──────────┘ └──────────┘      │
│  4. Wait for all agents to complete              │
│  5. Validate each worktree independently         │
│  6. Create PRs in order                          │
│  7. Cleanup worktrees                            │
└─────────────────────────────────────────────────┘
```

### Wave Executor Worktree Integration

Before executing a wave:

```bash
# For each task in the wave
for task in "${wave_tasks[@]}"; do
  task_id=$(echo "$task" | jq -r '.id')
  branch="feat/${task_id}"
  worktree_dir=".worktrees/${task_id}"
  
  # Create worktree from latest main
  git fetch origin main
  git worktree add "$worktree_dir" -b "$branch" origin/main
done
```

Each sub-agent receives its worktree as `cwd`:

```bash
# Launch agent with worktree as working directory
claude --cwd ".worktrees/task-001" \
  --prompt "Implement task T-001: ..." \
  --allowedTools "Edit,Write,Bash" &

claude --cwd ".worktrees/task-002" \
  --prompt "Implement task T-002: ..." \
  --allowedTools "Edit,Write,Bash" &

wait  # Wait for all agents
```

After all tasks complete, validate independently:

```bash
for task_dir in .worktrees/*/; do
  echo "Validating $task_dir..."
  (cd "$task_dir" && npm test) || echo "FAILED: $task_dir"
done
```

### File Ownership Protocol — Automatic

With worktrees, the file ownership protocol that prevents agents from conflicting becomes **automatic**:

| Without Worktrees | With Worktrees |
|---|---|
| Must declare file ownership per agent | Each agent has its own copy of all files |
| Risk of conflicts if protocol violated | Zero conflict risk — separate directories |
| Requires coordination overhead | No coordination needed |
| Complex merge resolution | Clean branch-per-feature PRs |

---

## 5. Auto-PR Creation

### Basic Auto-PR

After a task completes successfully in its worktree:

```bash
#!/usr/bin/env bash
# auto-pr.sh — Create PR from worktree

WORKTREE_DIR="$1"
TASK_ID="$2"
TASK_TITLE="$3"
BASE_BRANCH="${4:-main}"

cd "$WORKTREE_DIR" || exit 1

# Stage and commit all changes
git add -A

# Check if there are changes to commit
if git diff --cached --quiet; then
  echo "No changes to commit in $WORKTREE_DIR"
  exit 0
fi

# Create commit with conventional commit format
git commit -m "feat(${TASK_ID}): ${TASK_TITLE}"

# Push branch to remote
BRANCH=$(git branch --show-current)
git push -u origin "$BRANCH"

# Create PR using GitHub CLI
gh pr create \
  --title "feat: ${TASK_ID} — ${TASK_TITLE}" \
  --body "$(cat <<EOF
## Summary

Automated PR from worktree-flow execution.

**Task ID**: ${TASK_ID}
**Branch**: ${BRANCH}
**Base**: ${BASE_BRANCH}

## Changes

$(git log origin/${BASE_BRANCH}..HEAD --oneline --no-decorate)

## Validation

- Tests: $(if npm test --silent 2>/dev/null; then echo "PASSED"; else echo "FAILED"; fi)

---
*Created by worktree-flow*
EOF
)" \
  --base "$BASE_BRANCH"
```

### PR Body Template

For richer PRs, use a template:

```markdown
## Summary

Automated PR from worktree-flow wave execution.

**Task**: {task_id} — {task_title}
**Wave**: {wave_number} of {total_waves}
**Agent**: {agent_id}

## Changes

{git_log_oneline}

## Files Changed

{git_diff_stat}

## Validation Results

| Check | Status |
|-------|--------|
| Tests | {test_status} |
| Lint  | {lint_status} |
| Build | {build_status} |

## Dependencies

- Depends on: {dependencies}
- Blocked by: {blockers}

---
*Created automatically by worktree-flow v1.0*
```

---

## 6. Worktree Management Scripts

### worktree-create.sh

```bash
#!/usr/bin/env bash
# worktree-create.sh — Create a worktree with branch from current HEAD
#
# Usage: worktree-create.sh <task-id> [base-ref]
# Example: worktree-create.sh task-001
# Example: worktree-create.sh task-001 origin/main

set -euo pipefail

TASK_ID="${1:?Usage: worktree-create.sh <task-id> [base-ref]}"
BASE_REF="${2:-HEAD}"
WORKTREE_BASE="${WORKTREE_BASE:-.worktrees}"
BRANCH_PREFIX="${BRANCH_PREFIX:-feat/}"

BRANCH="${BRANCH_PREFIX}${TASK_ID}"
WORKTREE_DIR="${WORKTREE_BASE}/${TASK_ID}"

# Validate we're in a git repository
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: Not inside a git repository"
  exit 1
fi

# Ensure we're in the main worktree (not inside another worktree)
MAIN_WORKTREE=$(git worktree list --porcelain | head -1 | sed 's/worktree //')
CURRENT_DIR=$(pwd)
if [ "$CURRENT_DIR" != "$MAIN_WORKTREE" ]; then
  echo "WARNING: Not in main worktree. Switching context to $MAIN_WORKTREE"
fi

# Check if worktree already exists
if [ -d "$WORKTREE_DIR" ]; then
  echo "ERROR: Worktree directory already exists: $WORKTREE_DIR"
  echo "  Use: git worktree remove $WORKTREE_DIR"
  exit 1
fi

# Check if branch already exists
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  echo "ERROR: Branch already exists: $BRANCH"
  echo "  Use a different task ID or delete the branch first"
  exit 1
fi

# Create the worktree base directory if needed
mkdir -p "$WORKTREE_BASE"

# Fetch latest from remote if using remote ref
if [[ "$BASE_REF" == origin/* ]]; then
  echo "Fetching latest from remote..."
  git fetch origin
fi

# Create the worktree
echo "Creating worktree:"
echo "  Directory: $WORKTREE_DIR"
echo "  Branch:    $BRANCH"
echo "  Base:      $BASE_REF"

git worktree add "$WORKTREE_DIR" -b "$BRANCH" "$BASE_REF"

echo ""
echo "Worktree created successfully."
echo "  cd $WORKTREE_DIR"
```

### worktree-cleanup.sh

```bash
#!/usr/bin/env bash
# worktree-cleanup.sh — Remove worktree and optionally delete branch
#
# Usage: worktree-cleanup.sh <task-id> [--delete-branch] [--force]
# Example: worktree-cleanup.sh task-001
# Example: worktree-cleanup.sh task-001 --delete-branch

set -euo pipefail

TASK_ID="${1:?Usage: worktree-cleanup.sh <task-id> [--delete-branch] [--force]}"
DELETE_BRANCH=false
FORCE=false
WORKTREE_BASE="${WORKTREE_BASE:-.worktrees}"
BRANCH_PREFIX="${BRANCH_PREFIX:-feat/}"

# Parse flags
shift
for arg in "$@"; do
  case "$arg" in
    --delete-branch) DELETE_BRANCH=true ;;
    --force) FORCE=true ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

BRANCH="${BRANCH_PREFIX}${TASK_ID}"
WORKTREE_DIR="${WORKTREE_BASE}/${TASK_ID}"

# Check worktree exists
if [ ! -d "$WORKTREE_DIR" ]; then
  echo "Worktree directory not found: $WORKTREE_DIR"
  echo "Pruning stale references..."
  git worktree prune
  exit 0
fi

# Check for uncommitted changes
if [ "$FORCE" = false ]; then
  if ! (cd "$WORKTREE_DIR" && git diff --quiet && git diff --cached --quiet); then
    echo "ERROR: Worktree has uncommitted changes: $WORKTREE_DIR"
    echo "  Commit changes first, or use --force to discard them"
    exit 1
  fi
fi

# Remove the worktree
echo "Removing worktree: $WORKTREE_DIR"
if [ "$FORCE" = true ]; then
  git worktree remove --force "$WORKTREE_DIR"
else
  git worktree remove "$WORKTREE_DIR"
fi

# Delete branch if requested
if [ "$DELETE_BRANCH" = true ]; then
  echo "Deleting local branch: $BRANCH"
  git branch -D "$BRANCH" 2>/dev/null || true

  echo "Deleting remote branch: $BRANCH"
  git push origin --delete "$BRANCH" 2>/dev/null || true
fi

# Prune stale references
git worktree prune

echo "Cleanup complete."
```

### worktree-status.sh

```bash
#!/usr/bin/env bash
# worktree-status.sh — List all worktrees with status
#
# Usage: worktree-status.sh
# Output: Table showing each worktree's branch, status (clean/dirty/ahead)

set -euo pipefail

echo "=== Git Worktree Status ==="
echo ""

# Header
printf "%-30s %-25s %-10s %-10s %s\n" "DIRECTORY" "BRANCH" "STATUS" "AHEAD" "BEHIND"
printf "%-30s %-25s %-10s %-10s %s\n" "─────────" "──────" "──────" "─────" "──────"

# Parse worktree list
git worktree list --porcelain | while read -r line; do
  case "$line" in
    "worktree "*)
      WT_DIR="${line#worktree }"
      ;;
    "branch "*)
      WT_BRANCH="${line#branch refs/heads/}"
      ;;
    "")
      # End of worktree entry — print status
      if [ -n "${WT_DIR:-}" ]; then
        # Determine clean/dirty
        if (cd "$WT_DIR" 2>/dev/null && git diff --quiet && git diff --cached --quiet) 2>/dev/null; then
          STATUS="clean"
        else
          STATUS="dirty"
        fi

        # Count ahead/behind relative to origin
        AHEAD=0
        BEHIND=0
        if [ -n "${WT_BRANCH:-}" ]; then
          COUNTS=$(cd "$WT_DIR" 2>/dev/null && git rev-list --left-right --count "origin/main...HEAD" 2>/dev/null || echo "0 0")
          BEHIND=$(echo "$COUNTS" | awk '{print $1}')
          AHEAD=$(echo "$COUNTS" | awk '{print $2}')
        fi

        # Shorten directory for display
        SHORT_DIR=$(echo "$WT_DIR" | sed "s|$HOME|~|")

        printf "%-30s %-25s %-10s %-10s %s\n" \
          "$SHORT_DIR" "${WT_BRANCH:-detached}" "$STATUS" "+${AHEAD}" "-${BEHIND}"
      fi

      # Reset
      WT_DIR=""
      WT_BRANCH=""
      ;;
  esac
done

echo ""
echo "Total worktrees: $(git worktree list | wc -l)"
```

### worktree-pr.sh

```bash
#!/usr/bin/env bash
# worktree-pr.sh — Create PR from worktree, push, and optionally cleanup
#
# Usage: worktree-pr.sh <task-id> <title> [--cleanup] [--base main]
# Example: worktree-pr.sh task-001 "Add user auth" --cleanup

set -euo pipefail

TASK_ID="${1:?Usage: worktree-pr.sh <task-id> <title> [--cleanup] [--base main]}"
TITLE="${2:?Usage: worktree-pr.sh <task-id> <title> [--cleanup] [--base main]}"
CLEANUP=false
BASE_BRANCH="main"
WORKTREE_BASE="${WORKTREE_BASE:-.worktrees}"
BRANCH_PREFIX="${BRANCH_PREFIX:-feat/}"

# Parse flags
shift 2
for arg in "$@"; do
  case "$arg" in
    --cleanup) CLEANUP=true ;;
    --base) shift; BASE_BRANCH="$1" ;;
    *) ;;
  esac
done

BRANCH="${BRANCH_PREFIX}${TASK_ID}"
WORKTREE_DIR="${WORKTREE_BASE}/${TASK_ID}"

# Validate worktree exists
if [ ! -d "$WORKTREE_DIR" ]; then
  echo "ERROR: Worktree not found: $WORKTREE_DIR"
  exit 1
fi

cd "$WORKTREE_DIR"

# Stage all changes
git add -A

# Check for changes
if git diff --cached --quiet; then
  echo "No changes to commit."
  exit 0
fi

# Commit
COMMIT_MSG="feat(${TASK_ID}): ${TITLE}"
git commit -m "$COMMIT_MSG"

# Push
git push -u origin "$BRANCH"

# Create PR
PR_URL=$(gh pr create \
  --title "feat: ${TASK_ID} — ${TITLE}" \
  --body "$(cat <<EOF
## Summary

${TITLE}

**Task**: ${TASK_ID}
**Branch**: \`${BRANCH}\`

## Changes

$(git log "origin/${BASE_BRANCH}..HEAD" --oneline --no-decorate 2>/dev/null || echo "N/A")

## Files Changed

\`\`\`
$(git diff --stat "origin/${BASE_BRANCH}..HEAD" 2>/dev/null || echo "N/A")
\`\`\`

---
*Created by worktree-flow*
EOF
)" \
  --base "$BASE_BRANCH" 2>&1)

echo "PR created: $PR_URL"

# Cleanup if requested
if [ "$CLEANUP" = true ]; then
  cd - >/dev/null
  echo "Cleaning up worktree..."
  git worktree remove "$WORKTREE_DIR"
  echo "Worktree removed."
fi
```

---

## 7. Parallel Execution Pattern

### Wave-Based Parallel Execution

```
Wave 1 (3 independent tasks):
  ┌─────────────────────────────────────────┐
  │ 1. Create 3 worktrees from main         │
  │ 2. Launch 3 agents in parallel           │
  │    Agent 1 → .worktrees/task-001         │
  │    Agent 2 → .worktrees/task-002         │
  │    Agent 3 → .worktrees/task-003         │
  │ 3. Wait for all agents to complete       │
  │ 4. Validate each worktree independently  │
  │ 5. Create 3 PRs                          │
  │ 6. Cleanup worktrees                     │
  └─────────────────────────────────────────┘
                    │
                    ▼
         Merge Wave 1 PRs
                    │
                    ▼
Wave 2 (depends on Wave 1):
  ┌─────────────────────────────────────────┐
  │ 1. Pull updated main (with Wave 1)      │
  │ 2. Create worktrees from updated main   │
  │ 3. Launch agents in parallel             │
  │ 4. Validate, PR, cleanup                 │
  └─────────────────────────────────────────┘
```

### Full Wave Execution Script

```bash
#!/usr/bin/env bash
# wave-execute.sh — Execute a wave of tasks using worktrees
#
# Usage: wave-execute.sh <wave-file.json>
# Wave file format:
# {
#   "wave": 1,
#   "base": "main",
#   "tasks": [
#     {"id": "task-001", "title": "Add auth", "prompt": "Implement..."},
#     {"id": "task-002", "title": "Add API", "prompt": "Create..."}
#   ]
# }

set -euo pipefail

WAVE_FILE="${1:?Usage: wave-execute.sh <wave-file.json>}"
WORKTREE_BASE="${WORKTREE_BASE:-.worktrees}"
BRANCH_PREFIX="${BRANCH_PREFIX:-feat/}"
MAX_PARALLEL="${MAX_PARALLEL:-4}"

# Parse wave file
WAVE_NUM=$(jq -r '.wave' "$WAVE_FILE")
BASE=$(jq -r '.base // "main"' "$WAVE_FILE")
TASK_COUNT=$(jq '.tasks | length' "$WAVE_FILE")

echo "=== Wave $WAVE_NUM: $TASK_COUNT tasks ==="
echo "Base: $BASE"
echo ""

# Step 1: Fetch latest base
echo "--- Fetching latest $BASE ---"
git fetch origin "$BASE"

# Step 2: Create worktrees
echo "--- Creating worktrees ---"
for i in $(seq 0 $((TASK_COUNT - 1))); do
  TASK_ID=$(jq -r ".tasks[$i].id" "$WAVE_FILE")
  BRANCH="${BRANCH_PREFIX}${TASK_ID}"
  WORKTREE_DIR="${WORKTREE_BASE}/${TASK_ID}"
  
  echo "  Creating: $WORKTREE_DIR ($BRANCH)"
  git worktree add "$WORKTREE_DIR" -b "$BRANCH" "origin/$BASE"
done

# Step 3: Launch agents in parallel
echo "--- Launching agents ---"
PIDS=()
for i in $(seq 0 $((TASK_COUNT - 1))); do
  TASK_ID=$(jq -r ".tasks[$i].id" "$WAVE_FILE")
  TASK_TITLE=$(jq -r ".tasks[$i].title" "$WAVE_FILE")
  TASK_PROMPT=$(jq -r ".tasks[$i].prompt" "$WAVE_FILE")
  WORKTREE_DIR="${WORKTREE_BASE}/${TASK_ID}"

  echo "  Launching agent for $TASK_ID: $TASK_TITLE"
  
  # Launch agent in background
  (
    cd "$WORKTREE_DIR"
    # Replace with your agent launch command
    claude --print "$TASK_PROMPT" \
      --allowedTools "Edit,Write,Bash" \
      2>&1 | tee "../${TASK_ID}.log"
  ) &
  
  PIDS+=($!)

  # Respect max parallel limit
  if (( ${#PIDS[@]} >= MAX_PARALLEL )); then
    wait "${PIDS[0]}"
    PIDS=("${PIDS[@]:1}")
  fi
done

# Wait for remaining agents
echo "--- Waiting for agents to complete ---"
for pid in "${PIDS[@]}"; do
  wait "$pid" || echo "WARNING: Agent PID $pid exited with error"
done

# Step 4: Validate each worktree
echo "--- Validating worktrees ---"
FAILED=()
for i in $(seq 0 $((TASK_COUNT - 1))); do
  TASK_ID=$(jq -r ".tasks[$i].id" "$WAVE_FILE")
  WORKTREE_DIR="${WORKTREE_BASE}/${TASK_ID}"
  
  echo "  Validating $TASK_ID..."
  if (cd "$WORKTREE_DIR" && npm test --silent 2>/dev/null); then
    echo "    PASSED"
  else
    echo "    FAILED"
    FAILED+=("$TASK_ID")
  fi
done

if [ ${#FAILED[@]} -gt 0 ]; then
  echo ""
  echo "WARNING: ${#FAILED[@]} tasks failed validation: ${FAILED[*]}"
  echo "Fix failures before creating PRs."
  exit 1
fi

# Step 5: Create PRs
echo "--- Creating PRs ---"
for i in $(seq 0 $((TASK_COUNT - 1))); do
  TASK_ID=$(jq -r ".tasks[$i].id" "$WAVE_FILE")
  TASK_TITLE=$(jq -r ".tasks[$i].title" "$WAVE_FILE")
  WORKTREE_DIR="${WORKTREE_BASE}/${TASK_ID}"
  
  echo "  Creating PR for $TASK_ID..."
  (cd "$WORKTREE_DIR" && \
    git add -A && \
    git commit -m "feat(${TASK_ID}): ${TASK_TITLE}" && \
    git push -u origin "${BRANCH_PREFIX}${TASK_ID}" && \
    gh pr create \
      --title "feat: ${TASK_ID} — ${TASK_TITLE}" \
      --body "Automated PR from Wave $WAVE_NUM" \
      --base "$BASE")
done

# Step 6: Cleanup
echo "--- Cleaning up worktrees ---"
for i in $(seq 0 $((TASK_COUNT - 1))); do
  TASK_ID=$(jq -r ".tasks[$i].id" "$WAVE_FILE")
  WORKTREE_DIR="${WORKTREE_BASE}/${TASK_ID}"
  
  echo "  Removing: $WORKTREE_DIR"
  git worktree remove "$WORKTREE_DIR"
done

git worktree prune

echo ""
echo "=== Wave $WAVE_NUM complete ==="
echo "Created $TASK_COUNT PRs. Review and merge before starting next wave."
```

---

## 8. Integration with Existing Skills

### with `using-git-worktrees`

The `using-git-worktrees` skill teaches the fundamentals of git worktrees. This skill **extends** it with automation:

| `using-git-worktrees` | `worktree-flow` |
|---|---|
| Manual worktree creation | Scripted/automated creation |
| Interactive branch work | Agent-driven parallel work |
| Manual PR creation | Auto-PR on completion |
| Manual cleanup | Auto-cleanup with validation |

Use `using-git-worktrees` to understand the concepts. Use `worktree-flow` to automate them.

### with `finishing-a-development-branch`

The cleanup phase of `worktree-flow` aligns with `finishing-a-development-branch`:

1. **worktree-flow** creates the PR automatically
2. **finishing-a-development-branch** handles the review/merge/cleanup cycle
3. Together they provide end-to-end branch lifecycle management

### with `playbooks`

Each playbook task can be configured to use a worktree:

```yaml
# In a playbook definition
tasks:
  - id: task-001
    title: "Implement auth module"
    worktree: true            # Flag: execute in isolated worktree
    prompt: "Implement..."
```

The playbook executor checks the `worktree` flag and creates/manages worktrees automatically.

### with `wave-workflow`

A wave **is** a batch of worktrees:

```
wave-workflow defines:  WHAT tasks to run in parallel
worktree-flow provides: HOW to isolate them
```

The wave-workflow skill orchestrates task grouping and dependency ordering. The worktree-flow skill provides the execution isolation layer.

---

## 9. Configuration

### Configuration File

```yaml
# .ai-config/worktree-flow.yaml

# Base directory for worktrees (relative to repo root)
worktree_base: .worktrees

# Branch naming prefix
branch_prefix: feat/

# Auto-create PRs when task completes successfully
auto_pr: true

# Target branch for PRs
pr_base: main

# Remove worktree automatically after PR merge
cleanup_on_merge: true

# Maximum concurrent worktrees (limits parallel agents)
max_parallel: 4

# Command to validate before creating PR
validation_command: npm test

# Additional validation commands (all must pass)
validation_commands:
  - npm run lint
  - npm run typecheck
  - npm test

# PR template (path relative to repo root)
pr_template: .github/PULL_REQUEST_TEMPLATE/worktree-flow.md

# Commit message format (supports {task_id} and {title} placeholders)
commit_format: "feat({task_id}): {title}"

# Labels to apply to auto-created PRs
pr_labels:
  - automated
  - worktree-flow

# Reviewers to assign to auto-created PRs
pr_reviewers: []

# Whether to install dependencies in each worktree
install_deps: true

# Dependency install command
install_command: npm ci

# Stale worktree threshold (hours) — warn if older
stale_threshold_hours: 24
```

### Environment Variables

All configuration can be overridden via environment variables:

```bash
export WORKTREE_BASE=".worktrees"
export BRANCH_PREFIX="feat/"
export MAX_PARALLEL=4
export VALIDATION_COMMAND="npm test"
export AUTO_PR=true
export PR_BASE="main"
```

### Per-Task Override

Individual tasks can override global settings:

```json
{
  "id": "task-001",
  "title": "Critical fix",
  "config": {
    "branch_prefix": "fix/",
    "pr_base": "release/1.0",
    "validation_command": "npm run test:unit",
    "pr_labels": ["hotfix", "urgent"]
  }
}
```

---

## 10. Anti-Patterns

### DON'T: Create worktrees for sequential tasks

```
BAD:  Task A → worktree → PR → merge → Task B → worktree → PR → merge
      (Overhead of create/cleanup not worth it for sequential work)

GOOD: Task A → commit → Task B → commit → single PR
      (Sequential tasks share a branch, one PR at the end)
```

Worktrees add overhead (directory creation, potential dep install). Only use them when tasks are **parallel and independent**.

### DON'T: Forget to cleanup stale worktrees

Each worktree is a full copy of the working tree. They consume disk space.

```bash
# Check for stale worktrees periodically
git worktree list

# Prune references to deleted worktree directories
git worktree prune

# Remove old worktrees manually
git worktree remove .worktrees/old-task
```

Set up a check in your workflow:

```bash
# Warn about worktrees older than 24 hours
find .worktrees -maxdepth 1 -mindepth 1 -type d -mtime +1 -exec \
  echo "STALE WORKTREE: {}" \;
```

### DON'T: Share worktrees between agents

```
BAD:  Agent 1 and Agent 2 both work in .worktrees/task-001
      (Same conflicts as sharing a single working tree)

GOOD: Agent 1 → .worktrees/task-001
      Agent 2 → .worktrees/task-002
      (Complete isolation)
```

One worktree per agent. Always. No exceptions.

### DON'T: Create worktrees on the same branch

Git prohibits checking out the same branch in multiple worktrees. This is enforced:

```bash
$ git worktree add .worktrees/copy2 -b feat/task-001
fatal: 'feat/task-001' is already checked out at '.worktrees/task-001'
```

Each worktree MUST have its own branch.

### DON'T: Skip validation before PR creation

```
BAD:  git add -A && git commit && git push && gh pr create
      (No tests, no lint, no type check — PR might be broken)

GOOD: npm test && npm run lint && npm run typecheck && \
      git add -A && git commit && git push && gh pr create
      (Validate first, then PR)
```

Always validate in the worktree before creating a PR. Failed PRs waste reviewer time.

### DON'T: Work in the main worktree while agents use it

```
BAD:  You edit files in ~/project/ while agents also run in ~/project/
      (Race conditions, conflicts)

GOOD: You work in ~/project/
      Agents work in ~/project/.worktrees/task-*/
      (Complete separation)
```

---

## 11. Troubleshooting

### Common Issues

**"fatal: is already checked out"**

A branch can only be checked out in one worktree at a time.

```bash
# Find which worktree has the branch
git worktree list
# Remove the conflicting worktree or use a different branch name
```

**"Worktree directory not empty"**

The target directory already exists (possibly from a failed cleanup).

```bash
# Force remove the directory and try again
rm -rf .worktrees/task-001
git worktree prune
git worktree add .worktrees/task-001 -b feat/task-001
```

**"Dependencies not installed in worktree"**

Worktrees share `.git` but NOT `node_modules`. Install dependencies in each worktree:

```bash
cd .worktrees/task-001
npm ci    # Clean install from lockfile (fastest)
```

Tip: If using a monorepo with hoisted deps, consider symlinks or shared caches.

**"Lock file prevents worktree removal"**

```bash
# Check for lock files
ls .worktrees/task-001/.git  # This is a file, not a directory

# Force removal
git worktree remove --force .worktrees/task-001
git worktree prune
```

### Diagnostic Commands

```bash
# List all worktrees with full details
git worktree list --porcelain

# Check for stale worktree references
git worktree prune --dry-run

# Verify worktree integrity
git fsck

# Show which branch each worktree tracks
git worktree list | awk '{print $1, $3}'
```

---

## 12. Quick Reference

### Cheat Sheet

```bash
# Create worktree
git worktree add .worktrees/TASK -b feat/TASK origin/main

# List worktrees
git worktree list

# Work in worktree
cd .worktrees/TASK && <do work>

# Create PR from worktree
cd .worktrees/TASK && git add -A && git commit -m "..." && \
  git push -u origin feat/TASK && gh pr create --base main

# Remove worktree
git worktree remove .worktrees/TASK

# Cleanup stale references
git worktree prune

# Remove all worktrees
for wt in .worktrees/*/; do git worktree remove "$wt"; done
```

### Decision Matrix

| Scenario | Use Worktrees? |
|---|---|
| 3+ independent tasks in parallel | Yes |
| 2 independent tasks | Maybe (depends on size) |
| Sequential dependent tasks | No |
| Quick single-file fix | No |
| Long-running background task | Yes |
| Tasks touching same files | Yes (separate worktrees prevent conflicts) |
| CI/CD pipeline tasks | No (CI already isolates) |
