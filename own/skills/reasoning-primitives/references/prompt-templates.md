# Reasoning Primitives — Prompt Templates

Full prompt templates for each primitive. Copy-paste into agent prompts or sub-agent dispatch.

---

## Antithesize

```markdown
You are applying the ANTITHESIZE reasoning primitive.

Your job: generate the STRONGEST possible counter-argument to the proposal/finding below. Do NOT play devil's advocate weakly — find the argument that would genuinely make someone reconsider.

## Input

<proposal>
{PROPOSAL_OR_FINDING}
</proposal>

## Process

1. Identify the CORE CLAIM being made (state it in one sentence)
2. Find the strongest EVIDENCE AGAINST this claim — from first principles, empirical data, known failure cases, or logical contradictions
3. Construct a STEEL-MAN counter-argument (the best version, not a straw man)
4. Determine what would need to be TRUE for the counter-argument to win
5. Rate how much this UNDERMINES the original confidence (None / Slight / Moderate / Significant / Fatal)

## Output Format

### Core Claim
{The original claim in one sentence}

### Counter-Argument
{The strongest argument against the claim — 2-4 sentences}

### Evidence Against
| Evidence | Source/Reasoning | Strength |
|----------|-----------------|----------|
| {fact or logic} | {where this comes from} | Strong/Moderate/Weak |

### Confidence Underminer
**Impact**: {None / Slight / Moderate / Significant / Fatal}
**What would need to be true**: {conditions for the counter-argument to win}

### Steel-Man Rebuttal
{The best defense of the ORIGINAL claim, having now considered the counter-argument — stronger than before because it addresses the objection}

### Verdict
{Should the original claim stand, be modified, or be abandoned? One sentence.}
```

---

## Excavate

```markdown
You are applying the EXCAVATE reasoning primitive.

Your job: dig BENEATH the surface of this analysis. Find the hidden assumptions, real root causes, and second-order effects that the analysis takes for granted or ignores.

## Input

<analysis>
{SURFACE_ANALYSIS}
</analysis>

## Process

1. List EVERY assumption the analysis makes without stating it explicitly
2. For each assumption, ask: "What if this is WRONG?" — what changes?
3. Trace the CAUSAL CHAIN backwards: what actually CAUSES the stated problem?
4. Identify SECOND-ORDER EFFECTS — consequences of the proposed solution that aren't mentioned
5. State THE REAL PROBLEM — what's actually going on beneath the stated problem?

## Output Format

### Hidden Assumptions
| # | Assumption | Stated? | What If Wrong? |
|---|-----------|---------|----------------|
| 1 | {assumption} | No | {consequence if wrong} |
| 2 | {assumption} | Partially | {consequence if wrong} |

### Root Cause Chain
```
Stated problem: {what the analysis says the problem is}
    ↑ caused by
{intermediate cause}
    ↑ caused by
{deeper cause}
    ↑ caused by
ROOT CAUSE: {the actual root cause}
```

### Second-Order Effects
| Effect | Likelihood | Severity | Addressed? |
|--------|-----------|----------|------------|
| {unintended consequence} | High/Med/Low | High/Med/Low | No |

### The Real Problem
{1-3 sentences: what is the ACTUAL problem beneath the surface? How does this change the solution approach?}
```

---

## Dimensionalize

```markdown
You are applying the DIMENSIONALIZE reasoning primitive.

Your job: identify every dimension or perspective that is MISSING from this analysis. What viewpoints are not being considered? What axes of evaluation are absent?

## Input

<review>
{REVIEW_OR_EXPLORATION}
</review>

## Process

1. List ALL dimensions currently present in the analysis
2. Compare against standard dimensions: performance, security, developer experience, cost, maintenance burden, compliance/legal, accessibility, scalability, observability, team impact, user impact, data integrity
3. For each MISSING dimension, assess: would including it change the conclusion?
4. Map INTERACTIONS between dimensions — where do tradeoffs exist?

## Output Format

### Current Dimensions
{Bullet list of dimensions the analysis already covers}

### Missing Dimensions
| Dimension | Relevant? | Potential Impact | Would It Change the Conclusion? |
|-----------|-----------|-----------------|-------------------------------|
| {dimension} | Yes/Maybe/No | High/Med/Low | Yes — {how} / No / Unknown |

### Blind Spot Analysis
{For each high-impact missing dimension, 2-3 sentences on what the analysis is missing by not considering it}

### Dimension Interaction Matrix
| Dimension A | Dimension B | Interaction | Tradeoff |
|-------------|-------------|------------|----------|
| {dim} | {dim} | {how they interact} | {what you sacrifice in A to gain in B} |
```

---

## Negspace

```markdown
You are applying the NEGSPACE reasoning primitive.

Your job: explore the NEGATIVE SPACE — what is NOT being said, NOT being done, NOT being considered. The absence of something is often more revealing than its presence.

## Input

<subject>
{PLAN_OR_DESIGN_OR_DECISION}
</subject>

## Process

1. What QUESTIONS are not being asked? (What should someone be asking that no one is?)
2. What STAKEHOLDERS are not represented? (Whose voice is missing?)
3. What FAILURE MODES are not addressed? (What could go wrong that isn't mentioned?)
4. What CONSTRAINTS are assumed but not stated? (What invisible walls exist?)
5. What ALTERNATIVES were not considered? (What options were silently discarded?)

## Output Format

### Unasked Questions
| # | Question | Why It Matters |
|---|---------|---------------|
| 1 | {question no one is asking} | {why the answer could change everything} |

### Absent Stakeholders
| Stakeholder | Why Absent | What They'd Say |
|-------------|-----------|-----------------|
| {who} | {why they're not in the conversation} | {their likely concern or objection} |

### Unaddressed Failure Modes
| Failure Mode | Likelihood | Impact | Why It's Missing |
|-------------|-----------|--------|-----------------|
| {what could go wrong} | High/Med/Low | High/Med/Low | {why no one mentioned it} |

### Implicit Constraints
| Constraint | Stated? | Effect on Solution Space |
|-----------|---------|------------------------|
| {invisible wall} | No | {how it limits options without anyone noticing} |

### Unconsidered Alternatives
| Alternative | Why Not Considered | Potential Merit |
|------------|-------------------|----------------|
| {option} | {reason it was silently dropped} | {what it could offer} |
```

---

## Synthesize

```markdown
You are applying the SYNTHESIZE reasoning primitive.

Your job: combine multiple analyses into ONE coherent, actionable insight. Find where they agree, where they conflict, and what EMERGES from their combination that no single analysis shows alone.

## Input

<analyses>
{ANALYSIS_1}
---
{ANALYSIS_2}
---
{ANALYSIS_N}
</analyses>

## Process

1. Build an AGREEMENT MATRIX — for each key finding, which analyses support it?
2. For each CONFLICT, determine which view has stronger evidence and why
3. Identify EMERGENT INSIGHTS — things visible only when combining analyses
4. Produce ONE integrated recommendation with confidence level

## Output Format

### Agreement Matrix
| Finding | Analysis 1 | Analysis 2 | Analysis N | Confidence |
|---------|:----------:|:----------:|:----------:|:----------:|
| {finding} | {agree/disagree/partial/silent} | ... | ... | High/Med/Low |

### Conflict Resolution
| Conflict | View A | View B | Resolution | Rationale |
|----------|--------|--------|------------|-----------|
| {what they disagree on} | {position A} | {position B} | {which wins} | {why — evidence} |

### Emergent Insights
{Insights that ONLY appear when combining the analyses — things no single analysis surfaced alone. 2-4 bullet points.}

### Integrated Recommendation
**Recommendation**: {1-3 sentences — the synthesized, actionable conclusion}
**Confidence**: {High / Medium / Low}
**Caveats**: {What could invalidate this recommendation}
```
