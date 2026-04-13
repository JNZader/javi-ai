---
name: agent-orchestrator
description: >
  CLI-first agent orchestration patterns for headless/non-interactive SDD execution.
  Provides patterns for running parallel apply, progress reporting to stdout, and
  batch orchestration without a GUI or interactive user.
  Trigger: When running agents headlessly, in CI, or user says "headless", "cli orchestration", "batch agents", "/agent-orchestrator".
metadata:
  author: javi-ai
  version: "1.0"
  tags: [orchestration, cli, headless, parallel, ci]
  category: workflow
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, mcp__plugin_engram_engram__mem_search, mcp__plugin_engram_engram__mem_get_observation, mcp__plugin_engram_engram__mem_save
---

## Purpose

Standard SDD orchestration assumes an interactive user who approves each step. In headless/CLI mode (CI pipelines, batch scripts, scheduled runs), the agent must operate autonomously with structured progress output. This skill defines the patterns for non-interactive agent orchestration.

---

## 1. Core Principle

```
Interactive: Human-in-the-loop at every gate
Headless:   Pre-approved plan, autonomous execution, structured stdout reporting
```

Headless mode does NOT skip validation — it replaces interactive approval gates with pre-defined policies.

---

## 2. Headless Detection

The agent detects headless mode via environment:

| Signal | Detection |
|--------|-----------|
| `AGENT_HEADLESS=true` | Explicit headless flag |
| `CI=true` | Running in CI pipeline |
| `WORKTREE_HEADLESS=true` | Worktree-specific headless mode |
| No TTY attached | `test -t 0` returns false |

When headless mode is detected:
- Skip all interactive approval prompts
- Log decisions to stdout instead of asking
- Use pre-approved policies from config (see section 4)
- Never block waiting for user input

---

## 3. Progress Reporting Protocol

All output follows a structured line protocol for machine parsing:

```
[AGENT] {timestamp} {level} {phase} {message}
```

Levels: `INFO`, `WARN`, `ERROR`, `PROGRESS`, `GATE`, `RESULT`

### Examples

```
[AGENT] 2024-01-15T10:30:00Z INFO    explore   Starting exploration for change: dark-mode
[AGENT] 2024-01-15T10:30:15Z PROGRESS explore   Identified 12 affected files
[AGENT] 2024-01-15T10:30:30Z GATE     explore   Red-team pass: SKIPPED (not configured)
[AGENT] 2024-01-15T10:31:00Z RESULT   explore   Exploration complete. 3 approaches found. Recommended: Option B
[AGENT] 2024-01-15T10:31:01Z INFO    propose   Starting proposal generation
[AGENT] 2024-01-15T10:32:00Z PROGRESS apply     Task 1.1: DONE (3/10 complete, 30%)
[AGENT] 2024-01-15T10:32:30Z WARN    apply     Task 1.2: Test regression detected, reverting
[AGENT] 2024-01-15T10:35:00Z ERROR   apply     Task 1.3: Circuit breaker triggered (>50k tokens)
```

### Progress Bar (for terminal consumers)

When stdout is a TTY (non-CI), also emit progress bars:

```
[AGENT] apply [=========>          ] 45% (9/20 tasks) ETA: 12m
```

---

## 4. Pre-Approved Policy Configuration

In headless mode, decisions that normally require user approval are resolved by policy:

```yaml
# openspec/config.yaml or .agent-orchestrator.yaml
headless:
  auto_approve:
    explore: true          # Auto-approve exploration results
    propose: true          # Auto-approve proposals
    spec: true             # Auto-approve specs
    design: true           # Auto-approve design
    tasks: true            # Auto-approve task breakdown
    apply_batch_size: 3    # Tasks per batch (no approval between batches)
    merge: false           # Still require manual merge approval (safety)
  
  on_failure:
    test_regression: revert   # revert | stop | continue
    lint_error: stop          # revert | stop | continue
    circuit_breaker: stop     # stop | skip_task
    merge_conflict: stop      # stop (always — never auto-resolve)
  
  reporting:
    format: line              # line | json | github-actions
    verbosity: normal         # quiet | normal | verbose
    output: stdout            # stdout | file:{path} | both:{path}
```

---

## 5. Batch Orchestration Pattern

For running a complete SDD pipeline headlessly:

```
Phase 1: Planning (sequential)
  explore → propose → spec + design (parallel) → tasks

Phase 2: Implementation (batched)
  for batch in task_batches(size=apply_batch_size):
    apply(batch)
    if failure and policy == "stop": break
    report_progress()

Phase 3: Verification
  verify → report results

Phase 4: Completion
  archive → compact (optional)
```

### Execution Script Pattern

```bash
#!/usr/bin/env bash
# Run SDD pipeline headlessly
export AGENT_HEADLESS=true

claude --print "sdd ff $CHANGE_NAME" 2>&1 | while IFS= read -r line; do
  echo "$line"
  # Parse [AGENT] lines for CI integration
  if [[ "$line" =~ \[AGENT\].*ERROR ]]; then
    echo "::error::$line"  # GitHub Actions annotation
  fi
done

claude --print "sdd apply $CHANGE_NAME" 2>&1 | tee agent-apply.log
claude --print "sdd verify $CHANGE_NAME" 2>&1 | tee agent-verify.log
```

---

## 6. GitHub Actions Integration

When `reporting.format: github-actions`, emit native annotations:

```
::group::SDD Explore — {change-name}
[AGENT] ... explore output ...
::endgroup::

::notice file=src/auth.ts,line=42::Approach B recommended: adapter pattern for auth service
::warning file=src/db.ts::Red-team: no rollback strategy for migration
::error file=src/api.ts,line=15::Test regression in handleRequest after applying task 1.3
```

---

## 7. Parallel Apply in Headless Mode

Worktree-based parallel apply works identically in headless mode, with these adjustments:

- Diff preview is logged to stdout (not interactive approval)
- Merge conflicts trigger `on_failure.merge_conflict` policy (always "stop")
- Progress reports include worktree-specific prefixes:
  ```
  [AGENT] 2024-01-15T10:30:00Z PROGRESS apply:wt-task-001 Task 1.1 complete
  [AGENT] 2024-01-15T10:30:05Z PROGRESS apply:wt-task-002 Running tests...
  ```

---

## 8. Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All phases completed successfully |
| 1 | Apply failed (test regression, circuit breaker) |
| 2 | Verification failed (spec mismatch) |
| 3 | Merge conflict (requires manual resolution) |
| 10 | Configuration error (missing config, invalid policy) |
| 11 | No tasks found for change |

---

## Rules

1. Headless mode NEVER auto-resolves merge conflicts — always stop
2. All output must be parseable — no free-form text outside the `[AGENT]` protocol
3. Progress percentage must be accurate (based on completed vs total tasks)
4. Circuit breaker thresholds are the same in headless and interactive mode
5. If no policy config is found, use safe defaults (stop on any failure)
6. Exit codes must be consistent for CI pipeline integration
