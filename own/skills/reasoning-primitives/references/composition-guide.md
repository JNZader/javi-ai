# Reasoning Primitives — Composition Guide

Ready-to-use workflow patterns that chain primitives for specific use cases. Each workflow describes when to use it, the chain order, and how outputs flow between primitives.

---

## Workflow 1: Deep Explore

**Use case**: Thorough investigation of a topic before committing to an approach. Best for SDD explore phase.

**Chain**: `Excavate → Dimensionalize → Synthesize`

```
Topic / Initial Analysis
         │
         ▼
    [Excavate]
    Find hidden assumptions,
    root causes, real problem
         │
         ▼
    [Dimensionalize]
    Apply to Excavate output —
    what dimensions are STILL missing?
         │
         ▼
    [Synthesize]
    Combine Excavate + Dimensionalize
    into integrated exploration insight
         │
         ▼
  Deep Exploration Result
```

**How to dispatch**:

1. Run Excavate with the initial topic/analysis as input
2. Run Dimensionalize with the Excavate output as input (it will find dimensions the excavation missed)
3. Run Synthesize with BOTH Excavate and Dimensionalize outputs as input

**What you get**: An exploration that has surfaced hidden assumptions, identified the real problem, checked for missing perspectives, and integrated everything into a coherent recommendation.

---

## Workflow 2: Decision Validation

**Use case**: Validate a proposed approach BEFORE implementing. Best before SDD proposal acceptance or after design review.

**Chain**: `Antithesize → Negspace → Synthesize`

```
Proposed Decision / Approach
         │
    ┌────┴────┐
    ▼         ▼
[Antithesize] [Negspace]
 Counter-      What's NOT
 arguments     being said
    │         │
    └────┬────┘
         ▼
    [Synthesize]
    Combine counter-arguments
    with negative space findings
         │
         ▼
  Validated (or Invalidated) Decision
```

**How to dispatch**:

1. Run Antithesize and Negspace IN PARALLEL — both take the proposal as input
2. Run Synthesize with both outputs — it resolves conflicts and produces a verdict

**What you get**: A decision that has survived its strongest counter-argument AND been checked for what it's ignoring. If Synthesize still recommends proceeding, the decision is robust.

---

## Workflow 3: Adversarial Enhancement

**Use case**: Strengthen review findings before reporting. Best after adversarial-review or multi-perspective explore.

**Chain**: `Antithesize + Negspace (parallel) → Excavate → Synthesize`

```
Review Findings / Exploration Report
         │
    ┌────┴────┐
    ▼         ▼
[Antithesize] [Negspace]
 Challenge     Find what the
 each finding  review missed
    │         │
    └────┬────┘
         ▼
    [Excavate]
    Dig beneath the combined
    findings + counter-arguments
         │
         ▼
    [Synthesize]
    Produce final strengthened report
         │
         ▼
  Enhanced Review Report
```

**How to dispatch**:

1. Run Antithesize and Negspace IN PARALLEL on the review findings
2. Run Excavate with the combined outputs — find root causes beneath the counter-arguments and gaps
3. Run Synthesize with ALL three outputs — produce the final enhanced report

**What you get**: Review findings that have been stress-tested (Antithesize), gap-checked (Negspace), root-cause analyzed (Excavate), and integrated (Synthesize). Significantly stronger than single-pass review.

---

## Composition Rules

1. **Any primitive can follow any other** — there is no required ordering
2. **Synthesize should come LAST** — it needs 2+ inputs to add value
3. **Parallel dispatch is preferred** when primitives are independent (e.g., Antithesize and Negspace on the same input)
4. **Sequential dispatch is required** when one primitive's output is the next primitive's input
5. **Keep chains to 3-4 primitives max** — diminishing returns beyond that
6. **Each primitive in a chain should add NEW information** — if a primitive's output is redundant with its input, skip it

---

## Custom Workflows

Build your own by answering:

1. **What's the input?** (proposal, analysis, design, review findings)
2. **What's missing?** → Choose the primitive that addresses it:
   - Missing counter-arguments → Antithesize
   - Missing depth/root causes → Excavate
   - Missing perspectives → Dimensionalize
   - Missing awareness of gaps → Negspace
   - Need to merge multiple analyses → Synthesize
3. **What order?** Independent analyses go in parallel. Dependent analyses go in sequence. Synthesize goes last.
