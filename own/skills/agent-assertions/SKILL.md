---
name: agent-assertions
description: >
  DSPy-inspired declarative output constraints for SDD sub-agents. When outputs violate assertions,
  agents self-refine automatically. Adds runtime guardrails without manual review bottlenecks.
  Trigger: When adding output constraints to SDD agents, enforcing artifact quality, or building self-correction loops.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
  inspired-by: stanfordnlp/dspy
  depends-on: prompt-compiler
---

## Core Principle

An assertion is a contract between the orchestrator and the sub-agent. If the output violates a constraint, the agent does NOT return — it self-corrects and retries. No human intervention needed for mechanical failures.

---

## DSPy Assertions Mapped to SDD

| DSPy Concept | SDD Equivalent | Description |
|-------------|----------------|-------------|
| `dspy.Assert` | Hard assertion | Output MUST satisfy — failure triggers retry with feedback |
| `dspy.Suggest` | Soft assertion | Output SHOULD satisfy — failure logs warning, does not retry |
| `backtrack` | Self-correction | Re-run the agent with the violation message as additional context |
| `max_backtrack` | Retry limit | Maximum self-correction attempts before escalating to user |

---

## Assertion Types

### Hard Assertions (MUST)

Violations trigger automatic self-correction. The agent re-runs with the violation message injected.

```yaml
assertions:
  hard:
    - id: PROP-RISK-COUNT
      phase: sdd-propose
      rule: "proposal MUST contain at least 3 risks"
      check: count_sections("## Risks", min=3)
      max_retries: 2
      feedback_template: |
        Your proposal contains only {actual_count} risks. 
        The minimum is 3. Add risks covering: technical debt, 
        team impact, and timeline risk at minimum.

    - id: TASK-SPEC-REF
      phase: sdd-tasks
      rule: "every task MUST reference at least one spec ID"
      check: all_tasks_reference_pattern("SPEC-\\d+")
      max_retries: 2
      feedback_template: |
        Tasks {violating_tasks} do not reference any spec IDs.
        Every task must trace back to a requirement (e.g., SPEC-001).

    - id: APPLY-TEST-COVERAGE
      phase: sdd-apply
      rule: "code changes MUST have corresponding tests"
      check: every_source_file_has_test()
      max_retries: 1
      feedback_template: |
        Files {untested_files} were modified but have no corresponding tests.
        Write tests before marking the task complete.
```

### Soft Assertions (SHOULD)

Violations are logged as warnings but do NOT trigger retries.

```yaml
assertions:
  soft:
    - id: PROP-ALTERNATIVES
      phase: sdd-propose
      rule: "proposal SHOULD present at least 2 alternative approaches"
      check: count_sections("### Alternative", min=2)
      warning: "Only {actual_count} alternatives presented. Consider adding more."

    - id: DESIGN-ADR
      phase: sdd-design
      rule: "design SHOULD include ADR for each major decision"
      check: has_section("## ADR") and count_subsections(min=1)
      warning: "No ADRs found. Document architectural decisions for future reference."

    - id: EXPLORE-METRICS
      phase: sdd-explore
      rule: "exploration SHOULD include measurable success criteria"
      check: contains_pattern("metric|measure|KPI|threshold|benchmark")
      warning: "No measurable criteria found. Quantify success where possible."
```

---

## Self-Correction Loop

### Algorithm

```
ASSERT_AND_CORRECT(agent_output, assertions, max_retries=2):
  for attempt in 1..max_retries + 1:
    violations = check_all_hard_assertions(agent_output, assertions)
    warnings = check_all_soft_assertions(agent_output, assertions)

    # Log soft violations (no retry)
    for warning in warnings:
      log_warning(warning)

    # If no hard violations, return
    if violations.is_empty():
      return agent_output, {attempts: attempt, warnings: warnings}

    # If max retries exceeded, escalate
    if attempt > max_retries:
      escalate_to_user(violations)
      return agent_output, {attempts: attempt, escalated: true}

    # Self-correct: re-run with violation feedback
    feedback = build_feedback(violations)
    agent_output = rerun_agent(
      original_prompt + "\n\nASSERTION VIOLATIONS:\n" + feedback +
      "\n\nFix these violations and regenerate the output."
    )

  return agent_output
```

### Feedback Injection

When an assertion fails, the feedback is injected into the agent's prompt as a structured block:

```markdown
## ASSERTION VIOLATIONS (auto-detected)

The following constraints were violated in your output:

1. **PROP-RISK-COUNT** (HARD): proposal MUST contain at least 3 risks
   - Found: 1 risk
   - Required: >= 3
   - Action: Add at least 2 more risks covering different dimensions (technical, team, timeline)

2. **TASK-SPEC-REF** (HARD): every task MUST reference at least one spec ID
   - Violating tasks: Task 2.1, Task 3.2
   - Action: Add spec references (e.g., SPEC-001) to each task

Fix ALL violations above and regenerate your complete output.
```

---

## Assertion Library — SDD Phase Defaults

### sdd-explore

| ID | Type | Rule |
|----|------|------|
| `EXP-AREAS` | HARD | Must identify at least 2 affected areas |
| `EXP-APPROACHES` | HARD | Must present at least 2 approaches with tradeoffs |
| `EXP-CURRENT` | HARD | Must describe current state of the codebase |
| `EXP-METRICS` | SOFT | Should include measurable success criteria |

### sdd-propose

| ID | Type | Rule |
|----|------|------|
| `PROP-INTENT` | HARD | Must contain "## Intent" section |
| `PROP-SCOPE` | HARD | Must contain "## Scope" section |
| `PROP-RISKS` | HARD | Must contain at least 3 risks with mitigations |
| `PROP-ALTS` | SOFT | Should present at least 2 alternatives |
| `PROP-EFFORT` | SOFT | Should estimate effort (T-shirt size or hours) |

### sdd-spec

| ID | Type | Rule |
|----|------|------|
| `SPEC-IDS` | HARD | Every requirement must have a unique ID (SPEC-NNN) |
| `SPEC-SCENARIOS` | HARD | Must include at least 2 scenarios per requirement |
| `SPEC-ACCEPTANCE` | HARD | Must define acceptance criteria for each requirement |
| `SPEC-EDGE` | SOFT | Should cover edge cases and error scenarios |

### sdd-design

| ID | Type | Rule |
|----|------|------|
| `DES-PROPOSAL-REF` | HARD | Must reference the proposal by name |
| `DES-PATTERNS` | HARD | Must specify design patterns used |
| `DES-ADR` | SOFT | Should include ADR for major decisions |
| `DES-DIAGRAM` | SOFT | Should include at least one architectural diagram |

### sdd-tasks

| ID | Type | Rule |
|----|------|------|
| `TASK-SPEC-REF` | HARD | Every task must reference at least one spec ID |
| `TASK-ORDER` | HARD | Tasks must be ordered by dependency |
| `TASK-ESTIMATE` | SOFT | Should include effort estimate per task |
| `TASK-PHASE` | SOFT | Should group tasks into implementation phases |

### sdd-apply

| ID | Type | Rule |
|----|------|------|
| `APPLY-TESTS` | HARD | Code changes must have corresponding tests |
| `APPLY-TASK-REF` | HARD | Must reference which task is being implemented |
| `APPLY-NO-SKIP` | HARD | Must not skip tasks without explicit justification |
| `APPLY-LINT` | SOFT | Should pass linting without new warnings |

### sdd-verify

| ID | Type | Rule |
|----|------|------|
| `VER-SPEC-CHECK` | HARD | Must verify each spec requirement individually |
| `VER-EVIDENCE` | HARD | Must provide evidence (test results, screenshots) for each check |
| `VER-COVERAGE` | SOFT | Should report test coverage percentage |

---

## Custom Assertions

Teams can define project-specific assertions in `openspec/assertions.yaml`:

```yaml
custom_assertions:
  - id: CUSTOM-I18N
    phase: sdd-apply
    type: hard
    rule: "all user-facing strings MUST use i18n keys"
    check: no_hardcoded_strings_in_components()
    max_retries: 2
    feedback_template: |
      Found hardcoded strings in {files}. 
      Replace with i18n keys using the t() function.

  - id: CUSTOM-ACCESSIBILITY
    phase: sdd-apply
    type: hard
    rule: "all interactive elements MUST have aria labels"
    check: all_interactive_have_aria()
    max_retries: 1
    feedback_template: |
      Elements {violations} missing aria labels.
      Add appropriate aria-label or aria-labelledby attributes.
```

---

## Check Functions

Assertions reference check functions that evaluate the output programmatically.

| Function | Parameters | Returns |
|----------|-----------|---------|
| `count_sections(heading, min)` | Markdown heading text, minimum count | `{pass: bool, actual_count: int}` |
| `has_section(heading)` | Markdown heading text | `{pass: bool}` |
| `count_subsections(min)` | Minimum count under current section | `{pass: bool, actual_count: int}` |
| `contains_pattern(regex)` | Regex pattern to search | `{pass: bool, matches: list}` |
| `all_tasks_reference_pattern(regex)` | Pattern that must appear in every task | `{pass: bool, violating_tasks: list}` |
| `every_source_file_has_test()` | None | `{pass: bool, untested_files: list}` |
| `no_hardcoded_strings_in_components()` | None | `{pass: bool, files: list}` |
| `max_token_count(limit)` | Maximum token count | `{pass: bool, actual: int}` |
| `json_schema_valid(schema)` | JSON Schema to validate against | `{pass: bool, errors: list}` |

---

## Integration with Prompt Compiler

The `prompt-compiler` skill (Item #60) evaluates whether prompts produce outputs that pass assertions. The relationship:

1. **Assertions** define what good output looks like (constraints)
2. **Prompt compiler** optimizes prompts to produce outputs that satisfy assertions
3. **Eval sets** contain samples where assertion pass/fail is pre-scored

When the prompt compiler runs its optimization loop, assertion pass rate is a primary scoring dimension:

```yaml
scoring:
  assertion_pass_rate:
    weight: 0.40
    calculation: hard_assertions_passed / total_hard_assertions
  soft_assertion_rate:
    weight: 0.10
    calculation: soft_assertions_passed / total_soft_assertions
  quality_score:
    weight: 0.50
    calculation: average(completeness, clarity, actionability)
```

---

## Orchestrator Integration

When the SDD orchestrator launches a sub-agent, it includes applicable assertions:

```
Task(
  description: 'propose for {change-name}',
  prompt: '...
    ASSERTIONS (auto-enforced):
    - HARD: proposal MUST contain at least 3 risks [PROP-RISKS]
    - HARD: proposal MUST contain "## Intent" section [PROP-INTENT]
    - HARD: proposal MUST contain "## Scope" section [PROP-SCOPE]
    - SOFT: proposal SHOULD present at least 2 alternatives [PROP-ALTS]

    If your output violates a HARD assertion, you will be asked to self-correct.
    Check your output against these constraints BEFORE returning.
    ...'
)
```

---

## Critical Rules

1. Hard assertions ALWAYS trigger self-correction — never silently pass a violation.
2. Soft assertions NEVER trigger retries — log and move on.
3. Maximum 2 retries per hard assertion — if still failing after 2, escalate to user.
4. Feedback injection must be structured and actionable — not just "you failed".
5. Custom assertions override defaults when IDs collide.
6. Assertion checks must be deterministic — no LLM calls in the check function itself.
7. Track assertion pass rates over time — a dropping rate signals prompt degradation.
8. Never disable assertions to "make it work" — fix the output or fix the assertion.
9. Self-correction context must include the ORIGINAL prompt plus violation feedback, not just the feedback alone.
10. Assertions are contracts, not suggestions — treat HARD assertions like type errors.
