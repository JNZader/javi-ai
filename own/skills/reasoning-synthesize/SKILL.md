---
name: reasoning-synthesize
description: >
  Meta-reasoning skill that connects disparate findings into coherent, actionable insight.
  Injectable into any SDD phase to merge multiple analyses, resolve conflicts, and surface emergent patterns.
  Trigger: When combining outputs from multiple skills, merging perspectives, or resolving conflicting analyses.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
  category: reasoning
  injectable: true
  injects_into:
    - sdd-explore
    - sdd-propose
    - sdd-design
    - sdd-verify
    - sdd-archive
---

# Synthesize

"What's the common thread?" -- Connect disparate findings, resolve conflicts, and surface patterns that only emerge from combination.

## Core Principle

Individual analyses are narrow by design. A security review sees threats. A quality review sees maintainability. A stress test sees failure modes. Each is correct within its lens but incomplete alone. Synthesize is the meta-operation that takes N separate analyses and produces insight that NO single analysis could generate. The value is not in summarizing -- it is in finding emergent patterns, resolving contradictions, and producing a single coherent recommendation from multiple conflicting signals.

```
  Analysis A    Analysis B    Analysis C
      |             |             |
      v             v             v
    [1] Identify Findings Across All Inputs
                    |
                    v
    [2] Build Agreement Matrix
                    |
                    v
    [3] Resolve Conflicts (evidence-based)
                    |
                    v
    [4] Surface Emergent Insights
                    |
                    v
    [5] Produce Integrated Recommendation
                    |
                    v
        Synthesized Insight
```

---

## When to Inject

| SDD Phase | Injection Point | What It Synthesizes |
|-----------|----------------|-------------------|
| explore | After multi-perspective exploration | Merge perspective reports into unified exploration |
| propose | After Antithesize + Excavate run | Merge challenge + assumption analysis into proposal refinement |
| design | After design + stress-test | Merge architecture decisions with failure analysis |
| verify | After all verification checks | Merge test results, spec compliance, and review findings |
| archive | During retrospective | Merge lessons learned across all phases |

---

## Configuration

Enable in `openspec/config.yaml`:

```yaml
reasoning:
  synthesize:
    enabled: true
    auto_inject:
      - sdd-explore   # Auto-run after multi-perspective explore
      - sdd-verify    # Auto-run to merge all verification signals
    min_inputs: 2     # Minimum analyses required (default: 2)
    conflict_resolution: evidence  # evidence (default) | majority | conservative
```

**Conflict resolution strategies**:
- `evidence`: The view with stronger evidence wins (default, recommended)
- `majority`: The view shared by most analyses wins (use when analyses are equally rigorous)
- `conservative`: The most cautious view wins (use for safety-critical systems)

---

## Protocol

### Step 1: Identify Findings

Extract every distinct finding from all input analyses. A "finding" is a claim, recommendation, risk, or observation.

Rules:
- Deduplicate: if two analyses say the same thing, merge into one finding and note agreement
- Preserve attribution: track which analysis produced each finding
- Capture nuance: "Analysis A says X with caveat Y" is different from "Analysis A says X"

### Step 2: Build Agreement Matrix

For each finding, mark how each input analysis relates to it:

| Symbol | Meaning |
|--------|---------|
| **Agrees** | Analysis explicitly supports this finding |
| **Disagrees** | Analysis explicitly contradicts this finding |
| **Partial** | Analysis partially supports with caveats or conditions |
| **Silent** | Analysis did not address this topic |

**Confidence levels** (derived from the matrix):

| Pattern | Confidence |
|---------|-----------|
| All agree | **High** -- strong consensus |
| Majority agree, some partial | **Medium** -- consensus with nuance |
| Split (agree vs disagree) | **Low -- needs resolution** |
| Single source | **Unvalidated** -- one perspective only |

### Step 3: Resolve Conflicts

For every "Low -- needs resolution" finding, apply the configured resolution strategy:

**Evidence-based** (default):
1. What evidence does each side cite?
2. Which evidence is more concrete (data > logic > opinion)?
3. Which evidence is more relevant to the specific context?
4. Document the resolution AND the losing argument (for transparency)

**Majority**:
1. Count supporting vs opposing analyses
2. Majority wins, but document the minority view
3. Flag if the minority view is from the most domain-relevant analysis

**Conservative**:
1. The most cautious recommendation wins
2. Document what the aggressive option would have gained
3. Flag the cost of being conservative

### Step 4: Surface Emergent Insights

Emergent insights are findings that NO single analysis produced but that ONLY become visible when combining them. Look for:

- **Pattern convergence**: Multiple analyses point at the same root cause from different angles
- **Hidden dependencies**: Analysis A's recommendation conflicts with Analysis B's constraint
- **Amplification**: A minor finding in Analysis A becomes critical when combined with Analysis B's context
- **Blind spot revelation**: The GAP between analyses reveals something none of them addressed

This is the highest-value output. If you cannot find at least one emergent insight, state that explicitly -- it means either the analyses were too similar or the combination was not informative.

### Step 5: Produce Integrated Recommendation

One coherent recommendation that:
- Incorporates the high-confidence agreements
- Addresses the resolved conflicts
- Includes mitigations for emergent risks
- States its confidence level and caveats

---

## Output Format

```markdown
## Synthesis Report

### Input Analyses
| # | Source | Type | Key Contribution |
|---|--------|------|-----------------|
| 1 | {analysis name/phase} | {type: explore/review/stress-test/etc} | {1-sentence summary} |

### Agreement Matrix
| Finding | Analysis 1 | Analysis 2 | Analysis N | Confidence |
|---------|:----------:|:----------:|:----------:|:----------:|
| {finding} | Agrees/Disagrees/Partial/Silent | ... | ... | High/Medium/Low/Unvalidated |

### Conflict Resolution
| Conflict | Position A | Position B | Resolution | Strategy Used | Rationale |
|----------|-----------|-----------|------------|--------------|-----------|
| {what they disagree on} | {view A} | {view B} | {which wins} | Evidence/Majority/Conservative | {why} |

### Emergent Insights
{Insights visible ONLY from combination. Each as a bullet with:}
- **{Insight title}**: {2-3 sentences explaining what emerged and why it matters}

### Integrated Recommendation
**Recommendation**: {1-3 sentences -- the synthesized, actionable conclusion}
**Confidence**: {High / Medium / Low}
**Incorporates**: {List which analyses' key findings are reflected}
**Caveats**: {What could invalidate this recommendation}

### Open Questions
| # | Question | Raised By | Why Unresolved |
|---|---------|-----------|---------------|
| 1 | {question} | {conflict or emergent insight} | {what additional information is needed} |
```

---

## Injection Protocol for Sub-Agents

When injected into an SDD phase, append this instruction to the sub-agent prompt:

```
REASONING INJECTION — SYNTHESIZE:
If your output incorporates findings from multiple sources (prior phases, reviews, tests):
1. Build an agreement matrix for the key findings
2. Explicitly resolve any conflicts (state which view wins and why)
3. Identify at least one emergent insight from the combination
4. State your recommendation's confidence level
5. Include the Synthesis Report as an appendix to your output
```

---

## Composition with Other Reasoning Skills

Synthesize is the natural TERMINAL operation when chaining reasoning skills:

```
[Antithesize] ──┐
                 ├──> [Synthesize] ──> Integrated Insight
[Excavate] ─────┘

[Stress-Test] ──┐
                 ├──> [Synthesize] ──> Resilience Assessment
[Excavate] ─────┘

[Antithesize] ──┐
[Excavate] ─────┤
[Stress-Test] ──┼──> [Synthesize] ──> Comprehensive Validation
```

When composing:
- Run independent skills in PARALLEL (Antithesize + Excavate + Stress-Test)
- Run Synthesize LAST -- it needs all inputs
- Pass the FULL output of each skill, not summaries

---

## Critical Rules

1. **Minimum 2 inputs** -- Synthesize with 1 input is just paraphrasing. Refuse to run with fewer than 2 analyses
2. **Agreement matrix is mandatory** -- even if all analyses agree, the matrix makes that explicit
3. **Conflicts must be RESOLVED, not listed** -- every conflict row must have a resolution and rationale
4. **Emergent insights are the point** -- if you only summarize without finding emergent patterns, the synthesis added no value
5. **Attribution is preserved** -- every finding traces back to its source analysis. No orphan claims
6. **The integrated recommendation is ONE thing** -- not a list of "consider A and also B." One coherent direction with confidence
7. **Silent is signal** -- when an analysis is "Silent" on a finding, that IS information. It means that perspective did not consider it important or did not examine it
8. **Open questions are honest** -- if the synthesis cannot resolve something, say so. Unresolved questions are better than false resolutions
