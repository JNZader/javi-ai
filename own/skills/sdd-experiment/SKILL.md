---
name: sdd-experiment
description: >
  Autonomous try-measure-keep/revert loop for hypothesis-driven code improvements.
  Runs N experiments, measures each via tests/benchmarks, keeps improvements, reverts regressions.
  Trigger: When --experiment flag is used with /sdd-apply, or user says "experiment", "try variations", "hypothesis loop".
license: MIT
metadata:
  author: javi-ai
  version: "1.0"
  tags: [experiment, hypothesis, autonomous, measurement, sdd, autoresearch]
  category: experimentation
  inspired-by: https://github.com/leonardlin/pi-autoresearch
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

## Purpose

You are a sub-agent responsible for AUTONOMOUS EXPERIMENTATION. You receive a change context (specs, design, tasks) and run a hypothesis-driven loop: formulate a hypothesis, try a code change, measure impact via tests/benchmarks, keep if improved, revert if regressed. Repeat N times.

This is NOT blind trial-and-error. Each hypothesis is informed by the specs, design, and previous experiment results. The loop converges toward the best implementation.

---

## What You Receive

From the orchestrator:
- Change name
- Artifact store mode (`engram | openspec | hybrid | none`)
- Experiment config (max iterations, confidence threshold, test/benchmark commands)
- Optionally: specific area to experiment on (e.g., "optimize the auth middleware")

---

## Execution and Persistence Contract

- If mode is `engram`:

  **CRITICAL: `mem_search` returns 300-char PREVIEWS, not full content. You MUST call `mem_get_observation(id)` for EVERY artifact. If you skip this, you will work with incomplete specs and produce wrong code.**

  **STEP A -- SEARCH** (get IDs only):

  Run all artifact searches in parallel:

  1. `mem_search(query: "sdd/{change-name}/proposal", project: "{project}")` -> save ID
  2. `mem_search(query: "sdd/{change-name}/spec", project: "{project}")` -> save ID
  3. `mem_search(query: "sdd/{change-name}/design", project: "{project}")` -> save ID
  4. `mem_search(query: "sdd/{change-name}/tasks", project: "{project}")` -> save ID

  **STEP B -- RETRIEVE FULL CONTENT** (mandatory):

  Run all retrieval calls in parallel:

  5. `mem_get_observation(id: {proposal_id})` -> full proposal
  6. `mem_get_observation(id: {spec_id})` -> full spec
  7. `mem_get_observation(id: {design_id})` -> full design
  8. `mem_get_observation(id: {tasks_id})` -> full tasks

  **Save experiment report**:
  ```
  mem_save(
    title: "sdd/{change-name}/experiment-report",
    topic_key: "sdd/{change-name}/experiment-report",
    type: "architecture",
    project: "{project}",
    content: "{your full experiment report}"
  )
  ```

- If mode is `openspec`: Write report to `openspec/changes/{change-name}/experiment-report.md`
- If mode is `hybrid`: Follow BOTH conventions.
- If mode is `none`: Return report inline only.

---

## Experiment Loop Protocol

### Step 1: Pre-Flight Checks

Before ANY experiment:

```
1. Verify clean git state:
   git status --porcelain
   -> MUST return empty
   -> If dirty: ABORT. Tell user to commit or stash first.

2. Record baseline commit:
   BASELINE_COMMIT=$(git rev-parse HEAD)
   -> This is your safety net for ALL experiments.

3. Run baseline tests:
   {test_command}
   -> Capture: pass_count, fail_count, duration
   -> If tests already fail: WARN user, record as baseline (experiments must not make it WORSE)

4. Run baseline benchmark (if configured):
   {benchmark_command}
   -> Capture: relevant metrics
   -> If no benchmark configured: skip, use test-only scoring
```

### Step 2: Detect Test Runner

```
Detect test runner from (in priority order):
  1. Experiment config test_command (if explicit)
  2. openspec/config.yaml -> rules.apply.test_command
  3. package.json -> scripts.test (npm test / pnpm test)
  4. pyproject.toml / pytest.ini -> pytest
  5. Makefile -> make test
  6. Fallback: ABORT -- cannot experiment without measurable tests
```

### Step 3: Experiment Loop

```
FOR iteration IN 1..max_iterations:

  3a. HYPOTHESIZE
  ├── Review: specs, design, current code state, previous experiment results
  ├── Formulate hypothesis:
  │   "Changing {what} in {where} will improve {metric} because {why}"
  ├── Hypothesis MUST be specific and testable
  ├── Do NOT repeat a hypothesis that was already tried and reverted
  └── If no more meaningful hypotheses: STOP early, go to Step 4

  3b. SNAPSHOT
  ├── Record current state: git diff --stat (log what exists now)
  └── All safety is via BASELINE_COMMIT -- no stash needed

  3c. TRY
  ├── Implement the hypothesized change
  ├── Keep changes minimal and focused on the hypothesis
  └── Do NOT make unrelated changes

  3d. MEASURE
  ├── Run test command: {test_command}
  │   -> Capture: pass_count, fail_count, duration
  ├── Run benchmark (if configured): {benchmark_command}
  │   -> Capture: metrics
  └── Compute confidence score (see Scoring section)

  3e. DECIDE
  ├── IF confidence >= threshold:
  │   ├── KEEP the change
  │   ├── git add -A (stage changes as new baseline for next experiment)
  │   ├── Record: {iteration, hypothesis, KEPT, confidence, measurements}
  │   └── Update baseline metrics for next comparison
  │
  └── IF confidence < threshold:
      ├── REVERT: git checkout -- . && git clean -fd
      ├── Record: {iteration, hypothesis, REVERTED, confidence, measurements}
      └── Baseline metrics unchanged

  3f. LOG
  └── Append experiment result to running log
```

### Step 4: Post-Loop Report

After the loop completes (max iterations or early stop):

```
1. Generate structured experiment report (see Report Format below)
2. Persist report to engram (or filesystem per mode)
3. Return summary to orchestrator
```

**IMPORTANT**: After the loop, changes from KEPT experiments remain staged but NOT committed. The user or orchestrator decides when to commit.

---

## Confidence Scoring

```
Score range: 0.0 to 1.0

IF any previously-passing test now fails:
  confidence = 0.0  (HARD REJECT -- no test regressions allowed)

ELIF all tests pass:
  IF benchmark configured AND benchmark improved (> 5% gain):
    confidence = 1.0
  ELIF benchmark configured AND benchmark same (within 5%):
    confidence = 0.8
  ELIF benchmark configured AND benchmark regressed:
    confidence = 0.3
  ELIF no benchmark configured:
    IF new tests added AND all pass:
      confidence = 0.85
    ELSE:
      confidence = 0.8

ELIF test count increased (new tests) AND all original tests pass:
  confidence = 0.7
```

Default keep threshold: `0.6`

---

## Configuration

Via orchestrator prompt or `openspec/config.yaml`:

```yaml
experiment:
  max_iterations: 5        # Default: 5, Max: 10
  confidence_threshold: 0.6 # Default: 0.6, Range: 0.0-1.0
  test_command: auto        # "auto" = detect, or explicit command
  benchmark_command: null    # Optional benchmark command
  focus: null               # Optional: area to focus experiments on
```

### Defaults (when no config exists)

| Setting | Default | Description |
|---------|---------|-------------|
| `max_iterations` | 5 | Maximum experiment iterations |
| `confidence_threshold` | 0.6 | Minimum confidence to keep a change |
| `test_command` | auto | Auto-detect from project |
| `benchmark_command` | null | No benchmark by default |
| `focus` | null | Experiment on any relevant area |

---

## Report Format

```markdown
## Experiment Report: {change-name}

**Iterations**: {completed}/{max}
**Kept**: {count}
**Reverted**: {count}
**Early Stop**: {yes/no -- reason}

### Baseline
- Tests: {pass}/{total} passing, {duration}
- Benchmark: {metrics or "N/A"}

### Experiments

| # | Hypothesis | Result | Confidence | Key Metric |
|---|-----------|--------|------------|------------|
| 1 | {hypothesis} | KEPT | 0.85 | Tests: 42/42, +2 new |
| 2 | {hypothesis} | REVERTED | 0.0 | Tests: 40/42 (-2 regressions) |
| 3 | {hypothesis} | KEPT | 1.0 | Bench: 15% faster |

### What Worked
- {Description of kept experiment and why it improved things}

### What Didn't Work
- {Description of reverted experiment and why it regressed}

### Final State
- Tests: {pass}/{total} passing, {duration}
- Benchmark: {metrics or "N/A"}
- Net improvement: {summary of gains}
- Files modified: {list}

### Confidence Summary
- Average confidence (kept only): {avg}
- Highest confidence experiment: #{N} ({score})
- Recommendation: {proceed with these changes / more experiments needed / revert all}
```

---

## Orchestrator Integration

### Dispatch Pattern

The orchestrator embeds experiment instructions in the sub-agent prompt:

```
Task(
  description: 'experiment loop for {change-name}',
  prompt: 'You are an SDD experiment sub-agent.
  Read the skill at own/skills/sdd-experiment/SKILL.md FIRST.

  CONTEXT:
  - Change: {change-name}
  - Project: {project path}
  - Artifact store mode: {mode}
  - Config: {experiment config}

  TASK:
  Run the autonomous experiment loop. Try up to {max_iterations} variations.
  Focus area: {focus or "any relevant area from specs/design"}

  Return structured output with: status, executive_summary, artifacts, next_recommended, risks.'
)
```

### SDD Apply Integration

When `--experiment` flag is detected:

```
/sdd-apply --experiment change-name

Orchestrator behavior:
1. Read tasks from engram/filesystem
2. Instead of standard apply, dispatch sdd-experiment sub-agent
3. Pass all SDD context (proposal, spec, design, tasks)
4. Sub-agent runs experiment loop
5. On completion: show experiment report to user
6. User decides: commit kept changes, try more experiments, or revert all
```

---

## Relationship to Other Skills

| Skill | Relationship |
|-------|-------------|
| **sdd-apply** | Complementary. Apply implements tasks directly. Experiment explores variations autonomously. |
| **sdd-verify** | Downstream. After experiments, verify can validate the final state matches specs. |
| **circuit-breaker** | Safety net. Circuit breaker can kill an experiment loop that runs too long. |
| **ralph-loop** | Orthogonal. Ralph loop manages context freshness. Experiment loop manages hypothesis iteration. |
| **competitive-planning** | Similar concept at planning level. Competitive planning compares proposals. Experiment compares implementations. |

---

## Critical Rules

1. **NEVER experiment without measurable tests** -- if no test runner is detected, ABORT. Experiments without measurement are just random changes.
2. **NEVER allow test regressions** -- confidence = 0.0 for any test failure. No exceptions, no "it's probably fine."
3. **ALWAYS record baseline BEFORE first experiment** -- without baseline, you cannot measure improvement.
4. **ALWAYS revert on failure** -- `git checkout -- . && git clean -fd` is non-negotiable on reject.
5. **NEVER repeat a reverted hypothesis** -- if it didn't work, trying the same thing again is the definition of insanity.
6. **NEVER commit automatically** -- leave changes staged. The user commits.
7. **ALWAYS persist the experiment report** -- even if all experiments were reverted, the report has value.
8. **Hypotheses must be SPECIFIC** -- "make it better" is not a hypothesis. "Extracting the validation logic into a pure function will make it independently testable" IS.
9. **Keep changes MINIMAL per experiment** -- one hypothesis = one focused change. Do not bundle.
10. **Max iterations is a HARD limit** -- even if you have more ideas, stop at the configured maximum.
11. **Git clean state is a PRE-CONDITION** -- dirty working tree = ABORT. No exceptions.
12. **Benchmark regression with passing tests = LOW confidence, not zero** -- the user can decide if the tradeoff is worth it.
