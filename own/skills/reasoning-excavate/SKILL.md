---
name: reasoning-excavate
description: >
  Meta-reasoning skill that surfaces hidden assumptions, implicit decisions, and unexamined premises.
  Injectable into any SDD phase to prevent building on unvalidated foundations.
  Trigger: When analysis feels "too clean," conclusions jump to solutions, or requirements seem obvious.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
  category: reasoning
  injectable: true
  injects_into:
    - sdd-explore
    - sdd-propose
    - sdd-spec
    - sdd-design
    - sdd-tasks
---

# Excavate

"What hidden assumptions are we making?" -- Dig beneath the surface to expose the foundations your analysis stands on without examining.

## Core Principle

Every analysis rests on a stack of assumptions. Most are invisible -- they are the "obvious" things nobody questions. Excavate systematically surfaces these assumptions, traces causal chains to root causes, and identifies second-order effects that surface-level thinking misses. The goal is NOT to slow things down -- it is to prevent building a feature on a foundation nobody verified.

```
  Surface Analysis / Conclusion
              |
              v
    [1] List Every Unstated Assumption
              |
              v
    [2] "What If Each Is Wrong?"
              |
              v
    [3] Trace Causal Chain to Root
              |
              v
    [4] Identify Second-Order Effects
              |
              v
    [5] State the REAL Problem
              |
              v
  Excavated Analysis (deeper, honest)
```

---

## When to Inject

| SDD Phase | Injection Point | What It Excavates |
|-----------|----------------|------------------|
| explore | After initial investigation | "What are we taking for granted about this domain?" |
| propose | Before scope is locked | "What implicit constraints shaped this scope?" |
| spec | After requirements are written | "Which requirements are actually unstated assumptions?" |
| design | After tech stack decisions | "What assumptions about our infra drive these choices?" |
| tasks | After task breakdown | "What dependencies are we assuming exist?" |

---

## Configuration

Enable in `openspec/config.yaml`:

```yaml
reasoning:
  excavate:
    enabled: true
    auto_inject:
      - sdd-explore   # Auto-run during exploration
      - sdd-spec      # Auto-run after spec drafting
    depth: standard    # standard (3 levels) or deep (5+ levels)
```

When `depth: deep`, the causal chain analysis MUST go at least 5 levels before declaring a root cause.

---

## Protocol

### Step 1: Surface Unstated Assumptions

For every statement in the analysis, ask: "What must be TRUE for this to hold?"

Categories of hidden assumptions:

| Category | Example |
|----------|---------|
| **Technical** | "The database can handle this query volume" |
| **Organizational** | "The team has capacity to maintain this" |
| **Temporal** | "This requirement won't change in 6 months" |
| **Environmental** | "Users have stable internet connections" |
| **Dependency** | "This third-party API will remain available and compatible" |
| **Knowledge** | "The team understands this pattern well enough to implement it" |

### Step 2: Inversion Test

For each assumption, ask: "What if this is WRONG?"

- If the answer is "nothing changes" -- the assumption is cosmetic, skip it
- If the answer is "the approach breaks" -- the assumption is LOAD-BEARING and must be validated
- If the answer is "we'd need a different approach" -- the assumption is a HIDDEN DECISION that was never explicitly made

### Step 3: Trace Causal Chains

Start from the stated problem and trace backwards:

```
Stated problem: "API responses are slow"
    ^ caused by
"N+1 queries in the resolver"
    ^ caused by
"ORM defaults to lazy loading"
    ^ caused by
"Schema was designed for a different access pattern"
    ^ caused by
ROOT CAUSE: "No data access pattern analysis was done during design"
```

Rules:
- Minimum 3 levels for `standard` depth
- Minimum 5 levels for `deep` depth
- Stop when you reach a decision point (someone chose this) or an environmental constraint (nobody chose this)

### Step 4: Map Second-Order Effects

For every proposed solution in the analysis, identify consequences that the analysis does NOT mention:

- **Maintenance burden**: Who maintains this after the feature ships?
- **Cognitive load**: Does this make the codebase harder to understand?
- **Coupling introduced**: What new dependencies does this create?
- **Migration debt**: What future changes does this make harder?
- **Team impact**: Does this require knowledge only one person has?

### Step 5: State the Real Problem

After excavation, write a statement of the ACTUAL problem in 1-3 sentences. This often differs significantly from the stated problem.

Compare:
- **Stated**: "We need to add caching to improve performance"
- **Real**: "Our data access patterns were designed for a read model that no longer matches our query profile. Caching masks the symptom but the schema needs to evolve."

---

## Output Format

```markdown
## Excavation Report

### Hidden Assumptions
| # | Assumption | Category | Load-Bearing? | What If Wrong? |
|---|-----------|----------|---------------|----------------|
| 1 | {assumption} | Technical/Org/Temporal/Env/Dep/Knowledge | Yes/No | {consequence} |

### Root Cause Chain
```
Stated problem: {what the analysis says}
    ^ caused by
{level 1}
    ^ caused by
{level 2}
    ^ caused by
{level 3}
    ^ caused by
ROOT CAUSE: {the actual root cause}
```

### Second-Order Effects
| Effect | Category | Likelihood | Severity | Mentioned in Analysis? |
|--------|----------|-----------|----------|----------------------|
| {consequence} | Maintenance/Cognitive/Coupling/Migration/Team | High/Med/Low | High/Med/Low | Yes/No |

### The Real Problem
{1-3 sentences: what is ACTUALLY going on beneath the surface?}

### Validation Checklist
| # | Load-Bearing Assumption | How to Validate | Effort |
|---|------------------------|-----------------|--------|
| 1 | {assumption} | {concrete validation step} | Low/Med/High |
```

---

## Injection Protocol for Sub-Agents

When injected into an SDD phase, append this instruction to the sub-agent prompt:

```
REASONING INJECTION — EXCAVATE:
Before finalizing your output, apply the Excavate protocol:
1. List the top 3-5 assumptions your analysis makes without stating
2. Mark which are load-bearing (analysis breaks if wrong)
3. For each load-bearing assumption, add a validation step
4. If any load-bearing assumption is unvalidated, flag it prominently
5. Include the Excavation Report as an appendix to your output
```

---

## Critical Rules

1. **Every assumption must be categorized** -- Technical, Organizational, Temporal, Environmental, Dependency, or Knowledge
2. **Load-bearing assumptions MUST have validation steps** -- if you cannot describe how to validate it, the assumption is too vague
3. **Causal chains have a minimum depth** -- 3 levels for standard, 5 for deep. "Because that's how it works" is not a root cause
4. **The Real Problem is mandatory** -- even if it matches the stated problem, explicitly confirm that
5. **Second-order effects focus on the UNMENTIONED** -- do not repeat what the analysis already covers
6. **Excavation is non-judgmental** -- the goal is to surface, not to criticize. Hidden assumptions are normal; unexamined ones are dangerous
7. **Validation checklist is actionable** -- each item must be something someone can DO, not something to "think about"
