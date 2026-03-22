---
name: playbooks
description: >
  Executable markdown playbooks for AI agents — checkbox task documents, batch processing, and repeatable workflows.
  Trigger: When creating task documents for AI execution, running batch workflows, or building repeatable automation playbooks.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

# Playbooks — Executable Markdown for AI Agents

## 1. Core Principle

Playbooks are **executable markdown documents**. Each checkbox (`- [ ]`) is a discrete task
that an AI agent processes independently. The format is simultaneously human-readable
documentation AND machine-parseable instruction sets.

This is a fundamental shift: your task list IS your automation script.

### Why Playbooks

| Benefit | Description |
|---------|-------------|
| **Reproducible** | Same playbook, same results. Run it again next sprint. |
| **Clean context** | Each task executes in a fresh agent context — no accumulated confusion. |
| **Progress tracking** | The file itself tracks state. Checkboxes = done. Resume anytime. |
| **Loop support** | Iterative workflows: run until all boxes checked. |
| **Human-readable** | Any team member can read, review, and modify the workflow. |
| **Version controlled** | Git tracks every change. Diff your workflows like code. |
| **Composable** | Chain playbooks. Nest sub-tasks. Build complex workflows from simple parts. |

### The Mental Model

Think of a playbook as a **recipe** where each step is executed by a capable AI agent
that has never seen the previous steps. Each task must contain enough context to be
executed in isolation, but the sequence matters for correctness.

```
Playbook.md  -->  Agent reads  -->  Finds first unchecked task
                                        |
                                        v
                                  Executes task in clean context
                                        |
                                        v
                                  Checks the box [x]
                                        |
                                        v
                                  Commits progress
                                        |
                                        v
                                  Next unchecked task (or done)
```

---

## 2. Playbook Format Standard

Every playbook follows this canonical structure. Deviation from this format reduces
parseability and agent comprehension.

### Minimal Playbook

```markdown
# Playbook: Short Descriptive Title

## Tasks
- [ ] First task with specific details
- [ ] Second task with file paths and function names
- [ ] Third task with expected outcome
```

### Full Playbook

```markdown
# Playbook: Deploy Feature X

## Metadata
- **Author**: @username
- **Created**: 2024-01-15
- **Estimated**: 45 min
- **Tags**: deployment, backend
- **Reset on completion**: true
- **Execution mode**: sequential
- **Max retries per task**: 1

## Description
Deploy the user preferences feature including database migrations,
API endpoints, validation, tests, and staging verification.

## Prerequisites
- [ ] All tests passing on main branch
- [ ] Database migrations reviewed and approved
- [ ] Feature flag `user_preferences_v2` exists in config
- [ ] Staging environment is available (not locked by another deploy)

## Tasks
- [ ] Run database migrations for user_preferences table
- [ ] Update API endpoints in src/api/preferences.ts
- [ ] Add validation schema for new preferences fields
- [ ] Write integration tests for preferences API
- [ ] Update OpenAPI spec with new endpoints
- [ ] Run full test suite and fix any failures
- [ ] Deploy to staging environment
- [ ] Smoke test staging deployment

## Post-completion
- [ ] Notify #backend-team in Slack
- [ ] Update JIRA ticket FEAT-1234 to "Deployed to Staging"
```

### Section Semantics

| Section | Required | Purpose |
|---------|----------|---------|
| `# Playbook: Title` | Yes | Identifies the document as a playbook |
| `## Metadata` | No | Machine-readable properties |
| `## Description` | No | Human context for the workflow |
| `## Prerequisites` | No | Must ALL be checked before Tasks begin |
| `## Tasks` | Yes | The actual executable steps |
| `## Post-completion` | No | Steps after all tasks finish |

### Metadata Fields

```yaml
Author:               # Who created this playbook
Created:              # ISO date
Updated:              # ISO date of last modification
Estimated:            # Human-readable time estimate
Tags:                 # Comma-separated categories
Reset on completion:  # true = uncheck all boxes when done (for loops)
Execution mode:       # sequential | batch | loop | parallel
Max retries per task: # Number of retry attempts on failure (default: 0)
Timeout per task:     # Maximum time per task (e.g., "5 min")
Branch:               # Git branch this playbook operates on
```

---

## 3. Task Granularity Rules

The quality of a playbook is determined by the quality of its tasks. A well-written
task is the difference between a playbook that runs flawlessly and one that fails on
step 3.

### The One-Session Rule

Each task MUST be completable in a single AI agent session (1-5 minutes).
If a task takes longer, break it down.

### Task Anatomy

A good task contains:
1. **Action verb** — what to do (create, update, extract, add, remove, run)
2. **Target** — what to act on (file path, function, module, service)
3. **Specifics** — enough detail to act without guessing
4. **Outcome** — what "done" looks like (optional but helpful)

### Good vs Bad Tasks

```markdown
# BAD - Too vague, no actionable specifics
- [ ] Refactor the codebase
- [ ] Fix the tests
- [ ] Update the API
- [ ] Make it faster
- [ ] Clean up the code

# GOOD - Specific, actionable, scoped
- [ ] Extract auth logic from src/controllers/UserController.ts into new src/services/AuthService.ts
- [ ] Fix failing test in tests/api/users.test.ts:45 — mock the Redis client
- [ ] Add GET /api/v2/preferences endpoint in src/api/preferences.ts returning UserPreferences type
- [ ] Add database index on user_preferences.user_id column in migration 20240115_add_preferences.sql
- [ ] Remove deprecated helper functions from src/utils/legacy.ts (formatOldDate, parseOldConfig)
```

### Sub-tasks for Complex Items

When a single task has multiple parts, use nested checkboxes:

```markdown
- [ ] Set up authentication middleware
  - [ ] Create src/middleware/auth.ts with JWT verification
  - [ ] Add rate limiting (100 req/min per user)
  - [ ] Wire middleware into src/app.ts router chain
  - [ ] Add auth bypass for /health and /metrics endpoints
```

The agent processes sub-tasks sequentially within the parent task context.

### Context Embedding

Tasks should include enough context that an agent with NO prior knowledge can execute them:

```markdown
# Insufficient context
- [ ] Update the user model

# Sufficient context
- [ ] Add `preferences: JsonB` column to User model in src/models/User.ts
      (Sequelize model, PostgreSQL backend, see existing `settings` column for pattern)
```

### Task Size Guidelines

| Size | Tasks | When to use |
|------|-------|-------------|
| Micro | 3-5 | Quick fix, single concern |
| Small | 5-10 | Feature implementation, bug fix |
| Medium | 10-20 | Multi-file feature, refactor |
| Large | 20-35 | Major feature, migration |
| Too large | 35+ | Break into multiple playbooks |

---

## 4. Execution Modes

### Sequential (Default)

Process tasks top-to-bottom. Each task starts in a clean agent context.
The playbook file is the only state passed between tasks.

```markdown
## Metadata
- **Execution mode**: sequential

## Tasks
- [ ] Create database migration        # Runs first
- [ ] Update data model                 # Runs second (depends on migration)
- [ ] Add API endpoint                  # Runs third (depends on model)
- [ ] Write tests                       # Runs fourth (depends on endpoint)
```

**How it works:**
1. Agent reads playbook, finds first `- [ ]`
2. Executes the task
3. Marks it `- [x]` and commits
4. New agent session starts, reads playbook, finds next `- [ ]`
5. Repeat until no unchecked tasks remain

### Batch

Run multiple playbook documents in order. Each playbook completes fully
before the next begins.

```
.ai-playbooks/
  01-setup-database.md      # Completes first
  02-implement-api.md       # Completes second
  03-add-tests.md           # Completes third
  04-deploy-staging.md      # Completes fourth
```

Batch execution respects numeric prefix ordering. Files without numeric
prefixes are sorted alphabetically.

### Loop

Repeat the playbook until all tasks are checked. Useful for iterative
workflows like code review fixes or test-driven development.

```markdown
## Metadata
- **Execution mode**: loop
- **Reset on completion**: false
- **Max iterations**: 5

## Tasks
- [ ] Run test suite: `npm test`
- [ ] Fix the first failing test (read error output, apply fix)
- [ ] Run linter: `npm run lint`
- [ ] Fix the first linting error
```

In loop mode:
- Agent processes unchecked tasks top-to-bottom
- On reaching the end, it restarts from the top
- If `Reset on completion: true`, all boxes uncheck at the end of each pass
- If `Reset on completion: false`, tasks stay checked, loop ends when all are done
- `Max iterations` prevents infinite loops

### Parallel with Worktrees

For independent tasks, execute each in its own git worktree for true parallelism.

```markdown
## Metadata
- **Execution mode**: parallel
- **Branch prefix**: playbook/feature-x

## Tasks
- [ ] [PARALLEL] Add unit tests for UserService in tests/services/user.test.ts
- [ ] [PARALLEL] Add unit tests for AuthService in tests/services/auth.test.ts
- [ ] [PARALLEL] Add unit tests for PrefsService in tests/services/prefs.test.ts
- [ ] [SEQUENTIAL] Merge all test branches and run full suite
```

Tasks marked `[PARALLEL]` can run simultaneously. Tasks marked `[SEQUENTIAL]`
wait for all preceding parallel tasks to complete.

---

## 5. Integration with Existing Framework

### Playbooks vs SDD Tasks

Playbooks are a **lightweight alternative** to full Spec-Driven Development.
Use them when:

| Scenario | Use Playbooks | Use SDD |
|----------|---------------|---------|
| Quick feature (< 2 hours) | Yes | Overkill |
| Complex multi-day feature | No | Yes |
| Repeatable process | Yes | No |
| Needs architecture decisions | No | Yes |
| Bug fix with known steps | Yes | No |
| Exploratory/uncertain scope | No | Yes |

### Mapping SDD to Playbooks

An SDD `tasks.md` can be directly converted to a playbook:

```markdown
# SDD tasks.md
## Phase 1: Foundation
1. Create AuthService interface
2. Implement JWT validation

# Equivalent playbook
# Playbook: Auth Feature - Phase 1

## Tasks
- [ ] Create AuthService interface in src/services/auth/AuthService.ts with methods: validate(token), refresh(token), revoke(token)
- [ ] Implement JWT validation in src/services/auth/JwtAuthService.ts using jsonwebtoken package
```

The key difference: playbook tasks include MORE context per line because each
task runs without memory of the planning phase.

### Wave Executor Integration

The `wave-executor` agent can consume playbooks as wave definitions:

```markdown
# Playbook: Wave 3 - API Layer

## Metadata
- **Tags**: wave-3, api
- **Execution mode**: parallel

## Tasks
- [ ] [PARALLEL] Implement GET /users endpoint in src/api/users.ts
- [ ] [PARALLEL] Implement GET /preferences endpoint in src/api/preferences.ts
- [ ] [PARALLEL] Implement GET /notifications endpoint in src/api/notifications.ts
- [ ] [SEQUENTIAL] Add integration tests for all three endpoints
```

### Plan Executor Integration

The `plan-executor` processes playbook format natively. Point it at a playbook:

```bash
# In your AI agent prompt
"Execute the playbook at .ai-playbooks/deploy-v2.md. 
 Process each unchecked task sequentially. 
 Commit after each completed task."
```

### Using with /workflow:work

The `/workflow:work` command can reference playbooks:

```
/workflow:work .ai-playbooks/feature-auth.md
```

This loads the playbook and begins sequential execution of unchecked tasks.

### Storage Conventions

```
project-root/
  .ai-playbooks/              # Recommended location
    active/                    # Currently executing
      feature-auth.md
      bug-fix-login.md
    templates/                 # Reusable templates
      feature.md
      bugfix.md
      release.md
    archive/                   # Completed playbooks
      2024-01-feature-auth.md
  .maestro/
    playbooks/                 # Alternative location (Maestro convention)
```

---

## 6. Playbook Templates

### Feature Implementation

```markdown
# Playbook: Implement {{feature_name}}

## Metadata
- **Author**: @{{author}}
- **Created**: {{date}}
- **Estimated**: 2 hours
- **Tags**: feature, {{domain}}
- **Branch**: feature/{{feature_slug}}

## Prerequisites
- [ ] Feature spec reviewed and approved
- [ ] Branch created from latest main
- [ ] Development environment running

## Tasks
- [ ] Create data model/types in src/models/{{model_name}}.ts
- [ ] Add database migration in src/migrations/{{timestamp}}_add_{{table_name}}.sql
- [ ] Implement service layer in src/services/{{service_name}}.ts
- [ ] Add API routes in src/api/{{route_name}}.ts
- [ ] Write unit tests in tests/unit/{{service_name}}.test.ts
- [ ] Write integration tests in tests/integration/{{route_name}}.test.ts
- [ ] Update API documentation in docs/api/{{route_name}}.md
- [ ] Run full test suite: `npm test`
- [ ] Run linter: `npm run lint`
- [ ] Self-review: check diff against feature spec

## Post-completion
- [ ] Create pull request against main
- [ ] Request review from {{reviewer}}
```

### Bug Fix

```markdown
# Playbook: Fix {{bug_title}}

## Metadata
- **Author**: @{{author}}
- **Created**: {{date}}
- **Estimated**: 30 min
- **Tags**: bugfix, {{severity}}
- **Branch**: fix/{{bug_slug}}
- **Issue**: {{issue_url}}

## Prerequisites
- [ ] Bug reproduced locally
- [ ] Root cause identified: {{root_cause_description}}

## Tasks
- [ ] Write failing test that reproduces the bug in tests/{{test_file}}
- [ ] Apply fix in {{source_file}}:{{line_range}} — {{fix_description}}
- [ ] Verify fix: run the previously failing test
- [ ] Check for similar patterns elsewhere: search for {{pattern}} in src/
- [ ] Run full test suite to check for regressions
- [ ] Update changelog with fix description

## Post-completion
- [ ] Create pull request referencing issue {{issue_url}}
```

### Code Review Cleanup

```markdown
# Playbook: PR Review Fixes for #{{pr_number}}

## Metadata
- **Author**: @{{author}}
- **Created**: {{date}}
- **Estimated**: 1 hour
- **Tags**: review, cleanup
- **Branch**: {{pr_branch}}

## Tasks
- [ ] {{reviewer_comment_1}}
- [ ] {{reviewer_comment_2}}
- [ ] {{reviewer_comment_3}}
- [ ] Run tests after all fixes: `npm test`
- [ ] Push fixes and re-request review
```

### Release Preparation

```markdown
# Playbook: Release v{{version}}

## Metadata
- **Author**: @{{author}}
- **Created**: {{date}}
- **Estimated**: 1.5 hours
- **Tags**: release, v{{version}}
- **Branch**: release/v{{version}}

## Prerequisites
- [ ] All features for v{{version}} merged to main
- [ ] No critical bugs open for this milestone
- [ ] QA sign-off received

## Tasks
- [ ] Create release branch from main: `git checkout -b release/v{{version}}`
- [ ] Update version in package.json to {{version}}
- [ ] Update version in pyproject.toml / Cargo.toml / build.gradle (if applicable)
- [ ] Generate changelog from commits since last release
- [ ] Review and edit CHANGELOG.md for clarity
- [ ] Run full test suite on release branch
- [ ] Build production artifacts: `npm run build`
- [ ] Test production build locally
- [ ] Tag release: `git tag v{{version}}`
- [ ] Create GitHub release with changelog notes
- [ ] Deploy to production
- [ ] Verify production deployment (smoke tests)
- [ ] Announce release in #releases channel

## Post-completion
- [ ] Merge release branch back to main
- [ ] Update development version to {{next_version}}-dev
```

### Onboarding (Project Setup)

```markdown
# Playbook: Developer Onboarding

## Metadata
- **Author**: @tech-lead
- **Created**: 2024-01-15
- **Estimated**: 2 hours
- **Tags**: onboarding, setup

## Prerequisites
- [ ] Access to GitHub organization granted
- [ ] Access to cloud provider console granted

## Tasks
- [ ] Clone repository: `git clone {{repo_url}}`
- [ ] Install dependencies: `npm install` (requires Node >= 20)
- [ ] Copy .env.example to .env and fill in local values
- [ ] Start local database: `docker compose up -d postgres redis`
- [ ] Run migrations: `npm run db:migrate`
- [ ] Seed development data: `npm run db:seed`
- [ ] Start development server: `npm run dev`
- [ ] Verify app loads at http://localhost:3000
- [ ] Run test suite to confirm setup: `npm test`
- [ ] Install recommended IDE extensions (see .vscode/extensions.json)
- [ ] Read architecture overview in docs/architecture.md
- [ ] Read contributing guide in CONTRIBUTING.md
```

### Migration Playbook

```markdown
# Playbook: Migrate from {{old_system}} to {{new_system}}

## Metadata
- **Author**: @{{author}}
- **Created**: {{date}}
- **Estimated**: 4 hours
- **Tags**: migration, {{old_system}}, {{new_system}}
- **Execution mode**: sequential

## Prerequisites
- [ ] {{new_system}} credentials configured
- [ ] Data backup completed
- [ ] Rollback plan documented in docs/rollback-{{migration_name}}.md
- [ ] Maintenance window scheduled

## Phase 1: Preparation
- [ ] Create adapter interface in src/adapters/{{interface_name}}.ts
- [ ] Implement {{new_system}} adapter in src/adapters/{{new_adapter}}.ts
- [ ] Add feature flag `use_{{new_system}}` in src/config/flags.ts
- [ ] Write migration verification tests in tests/migration/

## Phase 2: Dual-Write
- [ ] Enable dual-write: both {{old_system}} and {{new_system}} receive writes
- [ ] Monitor for 24 hours — check error rates and data consistency
- [ ] Run consistency check script: `npm run migration:verify`

## Phase 3: Cutover
- [ ] Switch reads to {{new_system}} via feature flag
- [ ] Monitor for 2 hours — check latency and error rates
- [ ] Disable writes to {{old_system}}
- [ ] Archive {{old_system}} adapter (keep code, remove from DI)

## Phase 4: Cleanup
- [ ] Remove feature flag `use_{{new_system}}`
- [ ] Remove {{old_system}} adapter code
- [ ] Update documentation
- [ ] Remove {{old_system}} credentials from config
```

---

## 7. Progress Tracking

### The File IS the Tracker

The playbook markdown file is the single source of truth for progress.
No external database, no dashboard — just the file.

```markdown
## Tasks
- [x] Create database migration        # Done
- [x] Update data model                 # Done
- [ ] Add API endpoint                  # <-- Agent starts here
- [ ] Write tests
- [ ] Deploy
```

### Git-Based Progress

Each completed task results in a git commit, creating an audit trail:

```bash
# Commit pattern after each task
git add -A
git commit -m "playbook(deploy-v2): complete task 3/8 - Add API endpoint"
```

This gives you:
- **Atomic rollback**: revert any single task
- **Progress history**: `git log --oneline` shows playbook progress
- **Blame tracking**: know which task changed which file

### Commit Message Convention

```
playbook(<playbook-name>): complete task <n>/<total> - <task summary>
playbook(<playbook-name>): skip task <n>/<total> - <reason>
playbook(<playbook-name>): fail task <n>/<total> - <error summary>
```

### Error Handling

When a task fails, the agent marks it with a failure indicator and continues:

```markdown
## Tasks
- [x] Create database migration
- [x] Update data model
- [ ] Add API endpoint  <!-- FAILED: TypeScript compilation error in UserPrefs type -->
- [ ] Write tests       <!-- SKIPPED: depends on failed task -->
- [x] Update docs
```

Alternative failure notation using emoji markers:

```markdown
- [x] Task completed successfully
- [ ] Task not yet attempted
- [ ] !! Task failed: <error description>
- [ ] >> Task skipped: <reason>
```

### Resume Protocol

When an agent picks up a partially-completed playbook:

1. Read the entire playbook file
2. Count total tasks and completed tasks
3. Report: "Resuming playbook 'Deploy Feature X': 3/8 tasks complete"
4. Find the first `- [ ]` that is NOT marked as failed/skipped
5. Execute that task
6. Continue until all tasks are resolved

### Progress Reporting

Agents should output progress summaries:

```
Playbook: Deploy Feature X
Progress: [####----] 4/8 tasks (50%)
Current:  Task 5 - Write integration tests
Status:   In progress
Failures: 0
Skipped:  0
```

---

## 8. Advanced Patterns

### Conditional Tasks

Tasks that only execute when a condition is met:

```markdown
- [ ] Run test suite on staging
- [ ] [IF all tests pass] Deploy to production
- [ ] [IF any test fails] Create bug report and halt playbook
- [ ] [IF weekend] Skip Slack notification
- [ ] [IF version > 2.0] Run backward compatibility checks
```

The agent evaluates the condition in brackets before executing.
If the condition is false, the task is marked as skipped.

### Parameterized Playbooks

Use `{{parameter}}` syntax for reusable playbooks:

```markdown
# Playbook: Deploy Service

## Parameters
- `{{service_name}}`: Name of the service to deploy
- `{{version}}`: Version tag to deploy
- `{{environment}}`: Target environment (staging/production)
- `{{branch}}`: Source branch (default: main)

## Tasks
- [ ] Checkout branch {{branch}} at tag v{{version}}
- [ ] Build {{service_name}} Docker image: `docker build -t {{service_name}}:{{version}} .`
- [ ] Push to registry: `docker push registry.example.com/{{service_name}}:{{version}}`
- [ ] Deploy to {{environment}}: `kubectl set image deployment/{{service_name}} app={{service_name}}:{{version}}`
- [ ] Verify {{service_name}} health in {{environment}}: `curl https://{{environment}}.example.com/health`
```

**Instantiation** — before execution, replace all parameters:

```bash
# Create instance from template
sed 's/{{service_name}}/user-api/g; s/{{version}}/2.1.0/g; s/{{environment}}/staging/g; s/{{branch}}/main/g' \
  templates/deploy-service.md > active/deploy-user-api-2.1.0.md
```

### Playbook Chaining

One playbook triggers the next upon completion:

```markdown
# Playbook: Feature Complete Pipeline

## Metadata
- **Chain**: 
  - .ai-playbooks/01-implement-feature.md
  - .ai-playbooks/02-write-tests.md
  - .ai-playbooks/03-review-cleanup.md
  - .ai-playbooks/04-deploy.md

## Tasks
- [ ] Execute playbook: .ai-playbooks/01-implement-feature.md
- [ ] Execute playbook: .ai-playbooks/02-write-tests.md
- [ ] Execute playbook: .ai-playbooks/03-review-cleanup.md
- [ ] Execute playbook: .ai-playbooks/04-deploy.md
```

### Approval Gates

Insert human checkpoints into automated workflows:

```markdown
- [x] Run database migration on staging
- [x] Verify data integrity
- [ ] [APPROVAL REQUIRED] Approve production migration (@tech-lead)
- [ ] Run database migration on production
- [ ] Verify production data
```

The agent halts at `[APPROVAL REQUIRED]` tasks and notifies the specified person.
Execution only resumes when a human checks that box.

### Rollback Tasks

Define rollback steps that execute if the playbook fails:

```markdown
## Tasks
- [ ] Deploy v2.1.0 to production
- [ ] Run smoke tests

## Rollback (execute if any task above fails)
- [ ] Revert deployment to previous version: `kubectl rollout undo deployment/api`
- [ ] Verify rollback: `curl https://api.example.com/version`
- [ ] Notify team: "Deployment of v2.1.0 rolled back due to: {{failure_reason}}"
```

### Playbook Marketplace

Teams can share playbooks through a structured repository:

```
team-playbooks/
  deploy/
    standard-deploy.md
    hotfix-deploy.md
    canary-deploy.md
  features/
    crud-feature.md
    graphql-feature.md
    event-driven-feature.md
  operations/
    incident-response.md
    capacity-scaling.md
    dependency-update.md
  README.md                 # Catalog of available playbooks
```

---

## 9. Code Examples

### Bash Playbook Runner

A minimal script to parse and process playbook tasks:

```bash
#!/usr/bin/env bash
# playbook-runner.sh — Execute a markdown playbook
set -euo pipefail

PLAYBOOK_FILE="${1:?Usage: playbook-runner.sh <playbook.md>}"

if [[ ! -f "$PLAYBOOK_FILE" ]]; then
  echo "Error: Playbook not found: $PLAYBOOK_FILE"
  exit 1
fi

# Count tasks
TOTAL=$(grep -c '^\- \[ \]' "$PLAYBOOK_FILE" || true)
DONE=$(grep -c '^\- \[x\]' "$PLAYBOOK_FILE" || true)
echo "Playbook: $PLAYBOOK_FILE"
echo "Progress: $DONE/$((TOTAL + DONE)) tasks complete"
echo ""

# Find and display next unchecked task
NEXT_TASK=$(grep -n '^\- \[ \]' "$PLAYBOOK_FILE" | head -1)
if [[ -z "$NEXT_TASK" ]]; then
  echo "All tasks complete!"
  exit 0
fi

LINE_NUM=$(echo "$NEXT_TASK" | cut -d: -f1)
TASK_TEXT=$(echo "$NEXT_TASK" | cut -d']' -f2- | sed 's/^ //')

echo "Next task (line $LINE_NUM): $TASK_TEXT"
echo ""
echo "Execute this task, then mark it complete with:"
echo "  sed -i '${LINE_NUM}s/- \[ \]/- [x]/' \"$PLAYBOOK_FILE\""
```

### Python Playbook Parser

A structured parser for programmatic playbook processing:

```python
"""playbook_parser.py — Parse and manage markdown playbooks."""

from __future__ import annotations

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
    subtasks: list[Task] = field(default_factory=list)
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
    def total_tasks(self) -> int:
        return len(self.tasks)

    @property
    def completed_tasks(self) -> int:
        return sum(1 for t in self.tasks if t.status == TaskStatus.COMPLETE)

    @property
    def progress_pct(self) -> float:
        if self.total_tasks == 0:
            return 100.0
        return (self.completed_tasks / self.total_tasks) * 100

    @property
    def next_task(self) -> Task | None:
        for task in self.tasks:
            if task.is_actionable:
                return task
        return None

    @property
    def is_complete(self) -> bool:
        return all(t.status != TaskStatus.PENDING for t in self.tasks)


_CHECKBOX_RE = re.compile(r"^(\s*)- \[([ x])\] (.+)$")
_CONDITION_RE = re.compile(r"^\[IF (.+?)\] (.+)$")
_TITLE_RE = re.compile(r"^# Playbook:\s*(.+)$")
_METADATA_RE = re.compile(r"^\- \*\*(.+?)\*\*:\s*(.+)$")


def parse_playbook(file_path: str | Path) -> Playbook:
    """Parse a markdown playbook file into a structured Playbook object."""
    path = Path(file_path)
    content = path.read_text()
    lines = content.splitlines()

    title = ""
    metadata: dict[str, str] = {}
    current_section = ""
    prerequisites: list[Task] = []
    tasks: list[Task] = []
    post_completion: list[Task] = []

    for i, line in enumerate(lines, start=1):
        # Detect title
        title_match = _TITLE_RE.match(line)
        if title_match:
            title = title_match.group(1).strip()
            continue

        # Detect sections
        if line.startswith("## "):
            current_section = line[3:].strip().lower()
            continue

        # Parse metadata
        if current_section == "metadata":
            meta_match = _METADATA_RE.match(line)
            if meta_match:
                metadata[meta_match.group(1).lower()] = meta_match.group(2).strip()
            continue

        # Parse checkboxes
        cb_match = _CHECKBOX_RE.match(line)
        if cb_match:
            indent = len(cb_match.group(1))
            checked = cb_match.group(2) == "x"
            text = cb_match.group(3).strip()
            status = TaskStatus.COMPLETE if checked else TaskStatus.PENDING

            # Check for failure markers
            if text.startswith("!!"):
                status = TaskStatus.FAILED
                text = text[2:].strip()
            elif text.startswith(">>"):
                status = TaskStatus.SKIPPED
                text = text[2:].strip()

            # Check for conditions
            condition = None
            cond_match = _CONDITION_RE.match(text)
            if cond_match:
                condition = cond_match.group(1)
                text = cond_match.group(2)

            task = Task(
                line_number=i,
                text=text,
                status=status,
                condition=condition,
            )

            target = {
                "prerequisites": prerequisites,
                "tasks": tasks,
                "post-completion": post_completion,
            }.get(current_section, tasks)

            if indent > 0 and target:
                target[-1].subtasks.append(task)
            else:
                target.append(task)

    return Playbook(
        title=title,
        file_path=path,
        metadata=metadata,
        prerequisites=prerequisites,
        tasks=tasks,
        post_completion=post_completion,
    )


def mark_task_complete(file_path: str | Path, line_number: int) -> None:
    """Mark a specific task as complete by line number."""
    path = Path(file_path)
    lines = path.read_text().splitlines()
    idx = line_number - 1
    if 0 <= idx < len(lines):
        lines[idx] = lines[idx].replace("- [ ]", "- [x]", 1)
        path.write_text("\n".join(lines) + "\n")


def print_progress(playbook: Playbook) -> None:
    """Print a progress summary of the playbook."""
    filled = int(playbook.progress_pct / 100 * 20)
    bar = "#" * filled + "-" * (20 - filled)
    print(f"Playbook: {playbook.title}")
    print(f"File:     {playbook.file_path}")
    print(f"Progress: [{bar}] {playbook.completed_tasks}/{playbook.total_tasks} ({playbook.progress_pct:.0f}%)")
    next_task = playbook.next_task
    if next_task:
        print(f"Next:     (line {next_task.line_number}) {next_task.text}")
    else:
        print("Status:   All tasks complete!")


# Usage
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python playbook_parser.py <playbook.md>")
        sys.exit(1)

    pb = parse_playbook(sys.argv[1])
    print_progress(pb)
```

### Git Integration Helper

Commit after each completed task with structured messages:

```bash
#!/usr/bin/env bash
# playbook-commit.sh — Commit progress after a playbook task
set -euo pipefail

PLAYBOOK_FILE="${1:?Usage: playbook-commit.sh <playbook.md> <task_number>}"
TASK_NUM="${2:?Provide the task number}"

# Extract playbook name from filename
PLAYBOOK_NAME=$(basename "$PLAYBOOK_FILE" .md)

# Count total tasks
TOTAL=$(grep -c '^\- \[[ x]\]' "$PLAYBOOK_FILE" || echo 0)

# Extract task text
TASK_TEXT=$(grep '^\- \[[ x]\]' "$PLAYBOOK_FILE" | sed -n "${TASK_NUM}p" | sed 's/- \[.\] //')

# Stage and commit
git add -A
git commit -m "playbook(${PLAYBOOK_NAME}): complete task ${TASK_NUM}/${TOTAL} - ${TASK_TEXT}"

echo "Committed: task ${TASK_NUM}/${TOTAL} - ${TASK_TEXT}"
```

---

## 10. Anti-Patterns

### Things That Break Playbooks

**Vague tasks** destroy playbook utility:
```markdown
# DON'T
- [ ] Fix the bug
- [ ] Make it work
- [ ] Update everything

# DO
- [ ] Fix null pointer in src/services/UserService.ts:142 when user.email is undefined
- [ ] Update all imports in src/api/ from 'lodash' to 'lodash-es' for tree-shaking
```

**Mega-playbooks** with 50+ tasks are unmanageable:
```markdown
# DON'T: One 60-task playbook

# DO: Break into focused playbooks
.ai-playbooks/
  01-database-setup.md        # 8 tasks
  02-api-implementation.md    # 12 tasks
  03-frontend-components.md   # 10 tasks
  04-testing.md               # 8 tasks
  05-deployment.md            # 6 tasks
```

**Missing prerequisites** cause cascading failures:
```markdown
# DON'T: Jump straight to tasks
## Tasks
- [ ] Deploy to production

# DO: Validate readiness first
## Prerequisites
- [ ] All tests passing
- [ ] Security review complete
- [ ] Staging verified

## Tasks
- [ ] Deploy to production
```

**No file paths or specifics** — the agent cannot guess:
```markdown
# DON'T
- [ ] Add the new field to the model
- [ ] Update the test

# DO
- [ ] Add `email_verified: boolean` field to User model in src/models/User.ts
- [ ] Update user creation test in tests/models/User.test.ts to include email_verified=false default
```

**Mixing concerns** makes playbooks fragile:
```markdown
# DON'T: Mix database work with frontend styling
- [ ] Add migration for user_preferences
- [ ] Update CSS for dark mode
- [ ] Add new API endpoint
- [ ] Fix mobile responsive layout

# DO: Separate by concern
# Playbook: Backend - User Preferences
- [ ] Add migration for user_preferences
- [ ] Add new API endpoint

# Playbook: Frontend - Dark Mode
- [ ] Update CSS for dark mode
- [ ] Fix mobile responsive layout
```

**Assuming shared context** between tasks:
```markdown
# DON'T: Tasks assume knowledge from previous tasks
- [ ] Create the helper function
- [ ] Use it in the controller   # Use WHAT? WHERE?

# DO: Each task is self-contained
- [ ] Create formatUserResponse() in src/utils/formatters.ts that takes User and returns UserDTO
- [ ] Call formatUserResponse() in src/controllers/UserController.ts:getUser() before returning response
```

**No error recovery path**:
```markdown
# DON'T: Optimistic-only playbook
- [ ] Deploy to production
- [ ] Celebrate

# DO: Include rollback considerations
- [ ] Deploy to production
- [ ] Run smoke tests against production
- [ ] [IF smoke tests fail] Execute rollback: kubectl rollout undo deployment/api
- [ ] [IF smoke tests pass] Monitor error rates for 30 minutes
```

---

## Quick Reference Card

```
STRUCTURE:        # Playbook: Title → ## Prerequisites → ## Tasks → ## Post-completion
TASK FORMAT:      - [ ] <verb> <target> in <path> — <details>
CHECKED:          - [x] (complete) | - [ ] !! (failed) | - [ ] >> (skipped)
CONDITIONAL:      - [ ] [IF condition] Task description
PARAMETERIZED:    {{parameter_name}} replaced before execution
MODES:            sequential (default) | batch | loop | parallel
STORAGE:          .ai-playbooks/active/ | .ai-playbooks/templates/ | .ai-playbooks/archive/
COMMIT MSG:       playbook(<name>): complete task <n>/<total> - <summary>
MAX TASKS:        35 per playbook (break into multiple if larger)
TASK DURATION:    1-5 minutes each (one AI session)
CHAINING:         Reference other playbooks as tasks
GATES:            [APPROVAL REQUIRED] for human checkpoints
```
