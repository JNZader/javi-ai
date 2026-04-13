---
name: prompt-compiler
description: >
  DSPy-inspired prompt optimization loop for SDD skills. Defines phase signatures, runs eval sets against skill outputs,
  scores results, suggests prompt modifications, and tracks optimization history.
  Trigger: When optimizing SDD skill prompts, running eval loops, tuning system messages, or measuring skill output quality.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
  inspired-by: stanfordnlp/dspy
---

## Core Principle

Hand-tuning prompts is guesswork. A compiler treats prompts as programs — define inputs, outputs, and a scoring function, then let the optimization loop find the best prompt automatically.

---

## DSPy Concepts Mapped to SDD

| DSPy Concept | SDD Equivalent | Description |
|-------------|----------------|-------------|
| **Signature** | Phase contract | Typed inputs → outputs for each SDD phase |
| **Module** | Skill file | The SKILL.md that contains the system prompt |
| **Teleprompter** | Optimization loop | Iterates over eval sets, scores outputs, mutates prompts |
| **Metric** | Scoring function | Domain-specific quality check for each phase |
| **Trace** | Execution log | Full input/output/score record for each eval run |

---

## Phase Signatures

Define each SDD phase as a typed signature. The compiler uses these to validate inputs and score outputs.

### Signature Format

```yaml
signature:
  name: sdd-propose
  inputs:
    - name: exploration
      type: markdown
      required: true
      description: Output from sdd-explore phase
    - name: project_context
      type: object
      required: true
      description: Stack, conventions, file structure
  outputs:
    - name: proposal
      type: markdown
      required: true
      constraints:
        - contains_section: "## Intent"
        - contains_section: "## Scope"
        - contains_section: "## Risks"
        - min_risks: 3
        - max_length_tokens: 2000
    - name: status
      type: enum
      values: [ready, needs_input, blocked]
```

### Standard SDD Signatures

| Phase | Key Inputs | Key Outputs | Critical Constraints |
|-------|-----------|-------------|---------------------|
| `explore` | topic, project_context | exploration.md | Must identify affected areas, at least 2 approaches |
| `propose` | exploration | proposal.md | Must have Intent, Scope, Risks (>= 3) |
| `spec` | proposal | spec.md | Must have requirements with IDs, scenarios |
| `design` | proposal | design.md | Must reference proposal decisions, include ADRs |
| `tasks` | spec, design | tasks.md | Must reference spec IDs, ordered by dependency |
| `apply` | tasks, spec, design | code changes | Must have tests, follow design patterns |
| `verify` | apply output, spec | verify-report | Must check each spec requirement |

---

## Eval Set Structure

An eval set is a collection of sample inputs with scored reference outputs.

### Eval Set Format

```yaml
eval_set:
  name: propose-quality-v1
  phase: sdd-propose
  samples:
    - id: sample-001
      inputs:
        exploration: |
          ## Current State
          React app with Redux, no tests...
        project_context:
          stack: [react, typescript, redux]
      reference_output: |
        ## Intent
        Migrate state management from Redux to Zustand...
        ## Scope
        ...
        ## Risks
        1. Breaking changes in connected components
        2. Loss of Redux DevTools debugging
        3. Team unfamiliarity with Zustand patterns
      scores:
        completeness: 5
        clarity: 4
        risk_coverage: 5
        actionability: 4
      tags: [state-management, migration]
```

### Scoring Dimensions

| Dimension | Weight | What It Measures |
|-----------|--------|-----------------|
| **Completeness** | 0.30 | All required sections present, constraints satisfied |
| **Clarity** | 0.20 | Unambiguous language, concrete examples |
| **Risk Coverage** | 0.25 | Realistic risks identified, mitigations proposed |
| **Actionability** | 0.25 | Next steps are clear, no vague hand-waving |

---

## Optimization Loop

### Algorithm

```
COMPILE(skill_prompt, eval_set, max_iterations=10):
  best_prompt = skill_prompt
  best_score = evaluate(best_prompt, eval_set)
  history = []

  for i in 1..max_iterations:
    # 1. Run all samples through current prompt
    traces = run_eval_set(best_prompt, eval_set)

    # 2. Identify worst-performing samples
    failures = traces.where(score < threshold)

    # 3. Generate prompt mutations
    candidates = generate_mutations(best_prompt, failures)

    # 4. Score each candidate on full eval set
    for candidate in candidates:
      score = evaluate(candidate, eval_set)
      history.append({iteration: i, prompt: candidate, score: score})

      if score > best_score:
        best_score = score
        best_prompt = candidate

    # 5. Early stop if score plateaus
    if no_improvement_for(3, history):
      break

  return best_prompt, history
```

### Mutation Strategies

| Strategy | Description | When to Use |
|----------|-------------|-------------|
| **Section reorder** | Move prompt sections around | When later instructions override earlier ones |
| **Constraint injection** | Add explicit "MUST" / "NEVER" rules | When outputs miss required elements |
| **Few-shot addition** | Insert example input/output pairs | When format compliance is low |
| **Specificity boost** | Replace vague instructions with concrete ones | When outputs are generic |
| **Redundancy removal** | Delete repeated instructions | When prompt is too long, causing drift |
| **Role reinforcement** | Strengthen the persona/role framing | When agent ignores its assigned perspective |

### Mutation Generation Prompt

When generating mutations, use this meta-prompt:

```
You are a prompt optimizer. Given:
1. The current system prompt for an SDD skill
2. Sample inputs that scored poorly
3. The scoring rubric

Suggest 3 prompt modifications that would improve scores on the failing samples
WITHOUT degrading performance on passing samples.

For each suggestion:
- Identify the specific failure mode
- Propose a concrete edit (not vague advice)
- Explain WHY this edit addresses the failure
- Rate the risk of regression (low/medium/high)
```

---

## Optimization History

Track every optimization run for reproducibility and rollback.

### History Record Format

```yaml
optimization_history:
  skill: sdd-propose
  runs:
    - run_id: opt-2024-001
      timestamp: "2024-01-15T10:30:00Z"
      eval_set: propose-quality-v1
      iterations: 7
      initial_score: 3.2
      final_score: 4.1
      improvement: "+28%"
      best_mutation: constraint-injection
      prompt_diff: |
        + CRITICAL: Every proposal MUST contain at least 3 concrete risks with mitigations.
        + Each risk MUST specify: likelihood (high/medium/low), impact, and mitigation strategy.
      regression_check:
        samples_improved: [sample-001, sample-003, sample-005]
        samples_unchanged: [sample-002, sample-004]
        samples_regressed: []
```

### History Commands

| Command | Action |
|---------|--------|
| `list-runs` | Show all optimization runs for a skill |
| `compare-runs <a> <b>` | Diff two runs — score changes, prompt diffs |
| `rollback <run_id>` | Revert skill prompt to a previous version |
| `export-best <skill>` | Export the highest-scoring prompt version |

---

## Integration with SDD Pipeline

### When to Run Optimization

| Trigger | Action |
|---------|--------|
| New SDD skill created | Build initial eval set, run baseline |
| Skill prompt edited manually | Re-run eval set, compare before/after |
| Quality regression detected | Run optimization loop to recover |
| New eval samples added | Re-evaluate current prompt against expanded set |

### Workflow

```
1. Define signature for the target SDD phase
2. Build eval set (minimum 10 samples for meaningful optimization)
3. Run baseline evaluation → record initial scores
4. Execute optimization loop
5. Review suggested mutations — human approves before applying
6. Apply approved mutations to SKILL.md
7. Re-run full eval set to confirm improvement
8. Record in optimization history
```

### Safety Rules

1. **Human-in-the-loop**: NEVER auto-apply prompt mutations. Always present diffs for approval.
2. **Regression testing**: Every mutation MUST be tested against the FULL eval set, not just failing samples.
3. **Rollback ready**: Keep the previous prompt version. If production quality drops, rollback immediately.
4. **Eval set integrity**: Eval samples must NOT be used as few-shot examples in the prompt being optimized (data leakage).
5. **Score threshold**: Do not apply mutations with improvement < 5% — noise is not signal.

---

## Building Eval Sets

### Minimum Requirements

- At least **10 samples** per phase (fewer gives unreliable signal)
- Cover **happy path**, **edge cases**, and **adversarial inputs**
- Each sample must have **human-scored reference output**
- Refresh eval sets quarterly — stale evals optimize for yesterday's problems

### Sample Categories

| Category | Percentage | Purpose |
|----------|-----------|---------|
| Happy path | 40% | Standard, well-formed inputs |
| Edge cases | 30% | Unusual inputs, boundary conditions |
| Adversarial | 20% | Ambiguous requirements, conflicting constraints |
| Regression | 10% | Previously failing samples that were fixed |

---

## Critical Rules

1. A signature without an eval set is decoration — build eval sets FIRST, then optimize.
2. Never optimize against fewer than 10 samples — you are fitting noise.
3. Human approval is mandatory before applying any prompt mutation.
4. Track ALL optimization history — you will need to rollback.
5. Eval samples must be independent of prompt content (no data leakage).
6. Score improvement below 5% is noise — do not apply.
7. Always run regression checks against the full eval set after mutation.
8. Optimization is iterative — expect 5-10 rounds, not one magic edit.
9. The compiler optimizes the prompt, not the architecture — if the skill design is wrong, no prompt will save it.
10. Treat optimization history as a first-class artifact — version it alongside the skill.
