---
name: reasoning-primitives
description: >
  Composable reasoning primitives for enhancing AI analysis depth in explore, review, and decision workflows.
  Trigger: When exploring ideas deeply, reviewing proposals, validating decisions, or needing structured counter-arguments and hidden assumption analysis.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

# Reasoning Primitives

Composable prompt patterns that force deeper analysis. Each primitive is a structured reasoning template that transforms shallow analysis into rigorous insight.

Inspired by [FUTURE_TOKENS](https://github.com/daveshap/FUTURE_TOKENS) — structured cognitive operations for LLMs.

---

## Core Principle

Surface-level analysis misses hidden assumptions, missing dimensions, and unexplored counter-arguments. These 5 primitives compose into workflows that systematically eliminate blind spots.

```
Input (proposal, finding, analysis)
         │
    ┌────┴────┐
    ▼         ▼
Antithesize  Excavate
    │         │
    ▼         ▼
Negspace   Dimensionalize
    │         │
    └────┬────┘
         ▼
     Synthesize
         ▼
  Integrated Insight
```

Primitives are independent — use one alone or chain many. Order is flexible; the diagram shows one common flow.

---

## Quick Reference

| Primitive | Question It Answers | Input | Output |
|-----------|-------------------|-------|--------|
| **Antithesize** | "What's the strongest argument AGAINST this?" | Proposal/finding | Counter-argument, evidence, rebuttal |
| **Excavate** | "What's hiding BENEATH the surface?" | Analysis/conclusion | Hidden assumptions, root causes, second-order effects |
| **Dimensionalize** | "What dimensions are we NOT considering?" | Review/exploration | Missing perspectives, blind spots, dimension interactions |
| **Negspace** | "What's NOT being said or done?" | Plan/design/decision | Absent elements, implicit assumptions, missing failure modes |
| **Synthesize** | "How do these analyses fit together?" | 2+ primitive outputs | Agreement matrix, conflicts resolved, actionable insight |

---

## The 5 Primitives

### 1. Antithesize

**Purpose**: Generate the strongest possible counter-argument to any proposal or finding.

**When to use**: Before committing to an approach. After writing a proposal. During explore phase when evaluating options.

**Process**:
1. Identify the core claim or recommendation
2. Find the strongest evidence AGAINST it
3. Construct a steel-man counter-argument
4. Assess what would need to be true for the counter-argument to win
5. Rate confidence impact (how much does this weaken the original?)

**Output sections**: `Counter-Argument`, `Evidence Against`, `Confidence Underminer`, `Steel-Man Rebuttal`, `Verdict`

> Full template: [references/prompt-templates.md](references/prompt-templates.md#antithesize)

---

### 2. Excavate

**Purpose**: Dig beneath surface-level analysis to find hidden assumptions and root causes.

**When to use**: When an analysis feels "too clean." When conclusions jump from problem to solution without showing the reasoning chain. During explore to find real requirements.

**Process**:
1. List every assumption the analysis takes for granted
2. For each assumption, ask "What if this is wrong?"
3. Trace causal chains — what ACTUALLY causes the observed problem?
4. Identify second-order effects that the surface analysis ignores
5. Surface the "real" problem beneath the stated problem

**Output sections**: `Hidden Assumptions`, `Root Cause Chain`, `Second-Order Effects`, `The Real Problem`

> Full template: [references/prompt-templates.md](references/prompt-templates.md#excavate)

---

### 3. Dimensionalize

**Purpose**: Identify perspectives, dimensions, and viewpoints NOT being considered.

**When to use**: When a review covers only technical concerns. When exploration misses stakeholder perspectives. When design considers only happy paths.

**Process**:
1. List all dimensions currently being analyzed
2. Identify standard dimensions that are ABSENT (performance, security, DX, cost, maintenance, compliance, accessibility)
3. For each missing dimension, assess potential impact
4. Map interactions BETWEEN dimensions (e.g., security vs DX tradeoff)

**Output sections**: `Current Dimensions`, `Missing Dimensions` (table), `Blind Spot Analysis`, `Dimension Interaction Matrix`

> Full template: [references/prompt-templates.md](references/prompt-templates.md#dimensionalize)

---

### 4. Negspace

**Purpose**: Explore what is NOT being said, done, or considered — the negative space of the analysis.

**When to use**: When a plan feels complete but something nags. When reviewing a design that only describes what it DOES. During risk assessment.

**Process**:
1. What questions are NOT being asked?
2. What stakeholders are NOT represented?
3. What failure modes are NOT addressed?
4. What constraints are assumed but NOT stated?
5. What alternatives were NOT considered (and why)?

**Output sections**: `Unasked Questions`, `Absent Stakeholders`, `Unaddressed Failure Modes`, `Implicit Constraints`, `Unconsidered Alternatives`

> Full template: [references/prompt-templates.md](references/prompt-templates.md#negspace)

---

### 5. Synthesize

**Purpose**: Combine insights from multiple analyses (including other primitives) into a coherent, actionable whole.

**When to use**: After running 2+ primitives. After multi-perspective explore. When merging conflicting analyses.

**Process**:
1. Build agreement matrix — where do analyses agree/disagree?
2. For each conflict, determine which view has stronger evidence
3. Identify insights that ONLY emerged from combination (emergent properties)
4. Produce a single integrated recommendation with confidence level

**Output sections**: `Agreement Matrix`, `Conflict Resolution`, `Emergent Insights`, `Integrated Recommendation`, `Confidence & Caveats`

> Full template: [references/prompt-templates.md](references/prompt-templates.md#synthesize)

---

## Composition

Primitives chain naturally — the output of one feeds as input to the next. See the [Composition Guide](references/composition-guide.md) for 3 ready-to-use workflow patterns:

| Workflow | Chain | Use Case |
|----------|-------|----------|
| Deep Explore | Excavate → Dimensionalize → Synthesize | Thorough topic investigation |
| Decision Validation | Antithesize → Negspace → Synthesize | Validate a proposed approach |
| Adversarial Enhancement | Antithesize + Negspace (parallel) → Excavate → Synthesize | Strengthen review findings |

---

## Critical Rules

1. **Each primitive is INDEPENDENT** — never require a specific predecessor
2. **Synthesize requires 2+ inputs** — it is the only primitive with a minimum input count
3. **Output is structured markdown** — every section header is mandatory, even if the content is "None identified"
4. **Never skip the process steps** — the value is in the REASONING, not just the output format
5. **Primitives enhance, not replace** — they augment existing explore/review workflows, not substitute them
6. **Composition is optional** — a single primitive alone delivers value
