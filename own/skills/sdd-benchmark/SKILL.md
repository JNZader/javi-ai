---
name: sdd-benchmark
description: >
  Standardized evaluation datasets and benchmark suite for SDD artifacts. Defines known-good reference outputs
  for proposals, specs, designs, and tasks to enable regression testing and quality scoring.
  Trigger: When building eval datasets for SDD, running quality benchmarks, regression testing skill changes, or comparing model outputs.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
  inspired-by: open-compass/opencompass
---

## Core Principle

You cannot improve what you do not measure. Every SDD skill needs a benchmark — a set of inputs with scored reference outputs that detect regressions before they reach production.

---

## OpenCompass Concepts Mapped to SDD

| OpenCompass Concept | SDD Equivalent | Description |
|-------------------|----------------|-------------|
| **Dataset** | Eval set | Collection of sample inputs + reference outputs for one SDD phase |
| **Evaluator** | Scoring function | Rubric-based scorer for each quality dimension |
| **Summarizer** | Benchmark report | Aggregated scores across all phases and samples |
| **Partitioner** | Sample split | Train/eval/holdout splits to prevent overfitting |
| **Model** | Skill prompt version | The specific SKILL.md revision being benchmarked |

---

## Benchmark Architecture

```
sdd-benchmark/
  datasets/
    explore/
      samples.yaml        # Input/output pairs
      rubric.yaml          # Scoring dimensions and weights
    propose/
      samples.yaml
      rubric.yaml
    spec/
      samples.yaml
      rubric.yaml
    design/
      samples.yaml
      rubric.yaml
    tasks/
      samples.yaml
      rubric.yaml
    apply/
      samples.yaml
      rubric.yaml
    verify/
      samples.yaml
      rubric.yaml
  baselines/
    baseline-v1.yaml       # Scores from initial skill versions
  reports/
    run-2024-01-15.yaml    # Individual benchmark run results
    history.yaml           # Score trends over time
  config.yaml              # Benchmark configuration
```

---

## Dataset Format

### Sample Structure

Each sample is a complete input/output pair with human-assigned quality scores.

```yaml
dataset:
  phase: sdd-propose
  version: "1.0"
  samples:
    - id: BENCH-PROP-001
      name: "Redux to Zustand migration"
      difficulty: medium
      tags: [state-management, migration, react]
      input:
        exploration: |
          ## Current State
          Large React app (150+ components) using Redux with 45 slices.
          No test coverage on Redux layer. Team of 5, 2 familiar with Zustand.

          ## Affected Areas
          - State management layer (45 Redux slices)
          - Connected components (87 containers)
          - Middleware (3 custom, 2 third-party)

          ## Approaches
          ### Approach A: Big bang migration
          Replace all Redux at once. High risk, fast completion.

          ### Approach B: Incremental strangler
          Migrate slice-by-slice. Lower risk, longer timeline.

          ## Recommendation
          Approach B — incremental migration with feature flags.
        project_context:
          stack: [react-18, typescript, redux-toolkit, jest]
          team_size: 5
          test_coverage: "42%"
      reference_output: |
        ## Intent
        Migrate state management from Redux Toolkit to Zustand to reduce
        boilerplate, improve bundle size, and simplify the mental model
        for the team.

        ## Scope
        - **In scope**: All 45 Redux slices, connected components, custom middleware
        - **Out of scope**: Third-party middleware (redux-saga), build tooling, CI/CD

        ## Approach
        Incremental strangler pattern: migrate one domain at a time behind
        feature flags. Start with the simplest slice (UI preferences),
        validate the pattern, then proceed to complex slices (auth, data).

        ## Risks
        1. **State synchronization during migration** — Redux and Zustand
           stores coexist. Risk of state drift between them.
           Mitigation: Bridge utility that syncs shared state.
        2. **Team velocity drop** — Learning curve for 3 developers unfamiliar
           with Zustand. Mitigation: Pairing sessions + migration guide.
        3. **Middleware incompatibility** — Custom middleware may not have
           Zustand equivalents. Mitigation: Audit middleware first, build
           adapters where needed.
        4. **Regression in untested areas** — 58% of code has no tests.
           Mitigation: Add integration tests for migrated slices BEFORE migration.

        ## Alternatives Considered
        - **Jotai**: More granular but steeper learning curve for the team
        - **React Context + useReducer**: No library dependency but poor
          performance at scale

        ## Effort Estimate
        Size: L (3-4 weeks for full migration)
      scores:
        completeness: 5
        clarity: 5
        risk_coverage: 5
        actionability: 4
        overall: 4.75

    - id: BENCH-PROP-002
      name: "Add authentication to API"
      difficulty: easy
      tags: [auth, api, security]
      input:
        exploration: |
          ## Current State
          Express API with 12 endpoints, no authentication.
          All endpoints publicly accessible. PostgreSQL database.

          ## Affected Areas
          - All 12 API endpoints
          - Database (user table needed)
          - Client applications (2 SPAs, 1 mobile)

          ## Approaches
          ### Approach A: JWT with refresh tokens
          Stateless, scalable. Requires token management on client.

          ### Approach B: Session-based with Redis
          Simpler client-side. Requires Redis infrastructure.

          ## Recommendation
          Approach A — JWT for stateless scaling.
        project_context:
          stack: [express, typescript, postgresql, prisma]
          team_size: 3
          test_coverage: "65%"
      reference_output: |
        ## Intent
        Add JWT-based authentication to all API endpoints to prevent
        unauthorized access and enable user-specific data scoping.

        ## Scope
        - **In scope**: Auth middleware, user model, login/register/refresh endpoints, JWT issuance
        - **Out of scope**: OAuth providers, 2FA, rate limiting (follow-up)

        ## Approach
        JWT with short-lived access tokens (15min) and refresh tokens (7d).
        Auth middleware applied globally with allowlist for public endpoints.

        ## Risks
        1. **Token storage on clients** — XSS risk if stored in localStorage.
           Mitigation: httpOnly cookies for web, secure storage for mobile.
        2. **Breaking existing clients** — All 3 clients need auth headers.
           Mitigation: Versioned rollout with grace period for unauthenticated access.
        3. **Refresh token rotation** — Stolen refresh tokens enable persistent access.
           Mitigation: Rotate on use, maintain token family for theft detection.

        ## Alternatives Considered
        - **Session-based**: Simpler but requires Redis, harder to scale horizontally
        - **API keys**: Simpler but per-service, not per-user

        ## Effort Estimate
        Size: M (1-2 weeks)
      scores:
        completeness: 5
        clarity: 5
        risk_coverage: 4
        actionability: 5
        overall: 4.75
```

---

## Rubric Format

Each phase has a scoring rubric with weighted dimensions.

```yaml
rubric:
  phase: sdd-propose
  version: "1.0"
  scoring_model: llm-as-judge  # or: regex, hybrid
  dimensions:
    - name: completeness
      weight: 0.30
      description: All required sections present with sufficient detail
      scale: 1-5
      anchors:
        1: "Missing multiple required sections"
        3: "All sections present but some lack detail"
        5: "All sections present with thorough detail"
      checks:
        - has_section: "## Intent"
        - has_section: "## Scope"
        - has_section: "## Risks"
        - has_section: "## Approach"

    - name: clarity
      weight: 0.20
      description: Unambiguous language, concrete examples, no hand-waving
      scale: 1-5
      anchors:
        1: "Vague, abstract, unclear next steps"
        3: "Generally clear with some ambiguity"
        5: "Crystal clear, every statement is concrete and actionable"

    - name: risk_coverage
      weight: 0.25
      description: Realistic risks identified with practical mitigations
      scale: 1-5
      anchors:
        1: "No risks or only trivial risks listed"
        3: "3+ risks but mitigations are vague"
        5: "3+ diverse risks with specific, actionable mitigations"
      checks:
        - min_count: 3
          pattern: "^\\d+\\."  # Numbered risk items

    - name: actionability
      weight: 0.25
      description: Next steps are clear, estimates provided, no ambiguity
      scale: 1-5
      anchors:
        1: "No clear next steps, no effort estimate"
        3: "Next steps exist but lack specificity"
        5: "Clear next steps with effort estimate and owner assignment"
```

---

## Scoring Methods

### LLM-as-Judge

Use a structured evaluation prompt to score each dimension independently.

```
You are an SDD artifact evaluator. Score the following {phase} output on the dimension: {dimension_name}.

## Scoring Scale
{anchors}

## Rubric
{dimension_description}

## Reference Output (known good)
{reference_output}

## Candidate Output (to score)
{candidate_output}

Score (1-5): 
Justification (1-2 sentences):
```

**Key rules**:
- Score each dimension INDEPENDENTLY (separate LLM calls)
- Run BOTH orderings for pairwise comparisons (candidate vs reference, then reference vs candidate)
- Use the SAME judge model across all benchmark runs for consistency

### Regex/Structural Checks

Fast, deterministic checks that do not require an LLM.

| Check | What It Validates |
|-------|------------------|
| `has_section(heading)` | Required markdown section exists |
| `min_count(n, pattern)` | At least N matches for regex pattern |
| `max_tokens(limit)` | Output does not exceed token budget |
| `references_pattern(regex)` | Output contains required references (spec IDs, etc.) |
| `no_placeholder(pattern)` | No unresolved placeholders like `{TODO}` or `[TBD]` |

### Hybrid Scoring

Combine structural checks (pass/fail) with LLM-as-Judge (quality). Final score:

```
final_score = (structural_pass_rate * 0.3) + (llm_judge_avg * 0.7)
```

---

## Benchmark Execution

### Run a Benchmark

```yaml
benchmark_run:
  config:
    phases: [explore, propose, spec, design, tasks]  # which phases to benchmark
    model: claude-sonnet-4-20250514                    # model running the skills
    judge_model: claude-sonnet-4-20250514              # model scoring outputs
    parallel: true                                      # run samples in parallel
    max_samples_per_phase: 20                           # cap for cost control
    output_dir: reports/

  execution:
    1. Load eval sets for each phase
    2. For each sample:
       a. Run the skill prompt with sample input
       b. Score the output against rubric (structural + LLM judge)
       c. Compare against reference output
       d. Record scores
    3. Aggregate scores per phase and overall
    4. Compare against baseline
    5. Generate report
```

### Benchmark Report Format

```yaml
benchmark_report:
  run_id: bench-2024-01-15-001
  timestamp: "2024-01-15T14:30:00Z"
  model: claude-sonnet-4-20250514
  judge_model: claude-sonnet-4-20250514
  skill_versions:
    sdd-explore: "1.2"
    sdd-propose: "1.1"
    sdd-spec: "1.0"
    sdd-design: "1.0"
    sdd-tasks: "1.1"

  results:
    sdd-propose:
      samples_run: 15
      avg_score: 4.2
      min_score: 3.1
      max_score: 5.0
      by_dimension:
        completeness: 4.5
        clarity: 4.0
        risk_coverage: 4.1
        actionability: 4.2
      by_difficulty:
        easy: 4.6
        medium: 4.1
        hard: 3.8
      regressions:
        - sample: BENCH-PROP-003
          baseline_score: 4.5
          current_score: 3.2
          regression: "-29%"
          affected_dimension: risk_coverage

  summary:
    total_samples: 75
    overall_avg: 4.1
    phases_above_baseline: [explore, propose, tasks]
    phases_below_baseline: [spec]
    regressions_detected: 3
    recommendation: "Investigate sdd-spec regression on samples BENCH-SPEC-004, BENCH-SPEC-007"
```

---

## Baseline Management

### Creating a Baseline

```yaml
baseline:
  name: baseline-v1
  created: "2024-01-01T00:00:00Z"
  description: "Initial baseline from skill versions at launch"
  scores:
    sdd-explore: 3.8
    sdd-propose: 4.0
    sdd-spec: 3.5
    sdd-design: 3.7
    sdd-tasks: 3.9
  sample_scores:
    BENCH-PROP-001: 4.5
    BENCH-PROP-002: 4.75
    # ... all individual sample scores
```

### Regression Detection

A regression is detected when:

1. **Phase-level**: Average score drops > 0.3 points from baseline
2. **Sample-level**: Individual sample score drops > 1.0 point from baseline
3. **Dimension-level**: Any scoring dimension drops > 0.5 points from baseline

When a regression is detected:

```
1. Flag the specific samples and dimensions affected
2. Compare the current skill prompt against the baseline version
3. Identify which prompt changes correlate with the regression
4. Feed regression data to prompt-compiler for targeted optimization
```

---

## Dataset Construction Guidelines

### Minimum Dataset Requirements

| Phase | Min Samples | Difficulty Distribution | Required Tags |
|-------|------------|------------------------|---------------|
| `explore` | 10 | 4 easy, 4 medium, 2 hard | At least 3 different domains |
| `propose` | 15 | 5 easy, 6 medium, 4 hard | At least 4 different domains |
| `spec` | 12 | 4 easy, 5 medium, 3 hard | At least 3 different domains |
| `design` | 10 | 3 easy, 4 medium, 3 hard | At least 3 different patterns |
| `tasks` | 10 | 3 easy, 4 medium, 3 hard | Must cover dependency ordering |

### Difficulty Levels

| Level | Characteristics | Example |
|-------|----------------|---------|
| **Easy** | Single domain, clear requirements, no conflicts | Add CRUD endpoint |
| **Medium** | Cross-cutting concerns, some ambiguity, 2-3 affected areas | Migrate state management |
| **Hard** | Conflicting requirements, multiple domains, architectural impact | Multi-tenant + real-time + offline-first |

### Sample Quality Checklist

Before adding a sample to the dataset:

- [ ] Input is realistic (based on actual project scenarios)
- [ ] Reference output was written by a senior engineer
- [ ] Reference output was reviewed by a second person
- [ ] Scores were assigned independently by 2+ reviewers
- [ ] Score disagreements > 1 point were resolved through discussion
- [ ] Sample is tagged with domain, difficulty, and relevant patterns
- [ ] Sample does NOT duplicate an existing sample's scenario

---

## Integration with Prompt Compiler and Assertions

### Feedback Loop

```
                    ┌─────────────────┐
                    │  sdd-benchmark  │
                    │  (eval datasets │
                    │   + scoring)    │
                    └────────┬────────┘
                             │ scores + regressions
                             ▼
                    ┌─────────────────┐
                    │ prompt-compiler  │
                    │  (optimization   │
                    │   loop)          │
                    └────────┬────────┘
                             │ optimized prompts
                             ▼
                    ┌─────────────────┐
                    │ agent-assertions │
                    │  (runtime        │
                    │   constraints)   │
                    └────────┬────────┘
                             │ pass/fail signals
                             ▼
                    ┌─────────────────┐
                    │  sdd-benchmark  │
                    │  (re-evaluate)   │
                    └─────────────────┘
```

1. **Benchmark** detects a regression in sdd-propose risk coverage
2. **Prompt compiler** runs optimization loop on the failing samples
3. **Assertions** enforce that the optimized prompt still passes hard constraints
4. **Benchmark** re-evaluates to confirm the fix and check for new regressions

---

## Running Benchmarks in CI

### Configuration

```yaml
ci_benchmark:
  trigger: on_skill_change  # Run when any SKILL.md is modified
  phases: all
  max_samples: 10           # Subset for CI speed (full suite runs nightly)
  fail_on_regression: true  # Block merge if regression detected
  regression_threshold: 0.3 # Score drop that constitutes a regression
  judge_model: claude-haiku  # Cheaper model for CI, full model for nightly
  timeout_per_sample: 60s
```

### CI Pipeline Steps

```
1. Detect which SKILL.md files changed
2. Load eval sets for affected phases only
3. Run benchmark (subset of samples for speed)
4. Compare against baseline
5. If regression detected:
   a. Report failing samples and dimensions
   b. Block merge
   c. Suggest running prompt-compiler on failing samples
6. If no regression:
   a. Update baseline if scores improved
   b. Approve merge
```

---

## Critical Rules

1. Every SDD phase MUST have a benchmark dataset — no phase ships without eval coverage.
2. Reference outputs must be written by humans, not generated by the model being benchmarked.
3. Minimum 10 samples per phase — fewer gives unreliable signal.
4. Score each dimension independently — do not let one score influence another.
5. Run pairwise judge comparisons in BOTH orderings to detect position bias.
6. Baselines are immutable once set — create a new baseline version, do not edit existing ones.
7. Regression threshold of 0.3 points is the default — adjust per project but document why.
8. CI benchmarks use sample subsets for speed — full benchmarks run nightly.
9. Difficulty distribution must be intentional — do not let easy samples inflate average scores.
10. Feed benchmark regressions to prompt-compiler — do not fix regressions by hand-tuning prompts.
