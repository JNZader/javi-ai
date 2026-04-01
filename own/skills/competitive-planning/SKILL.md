---
name: competitive-planning
description: >
  Dual-dispatch competitive planning — two sub-agents generate competing implementation plans, then a judge picks the best.
  Trigger: When a critical change needs planning, user says "competitive plan", "compete", or orchestrator config enables it for sdd-propose.
license: MIT
metadata:
  author: javi-ai
  version: "1.0"
  tags: [planning, orchestration, competition, evaluation]
  category: orchestration
allowed-tools: Read, Bash, Glob, Grep, Task
---

# Competitive Planning

Dual-dispatch orchestration where two sub-agents generate COMPETING implementation plans from the same context but different optimization lenses, then a judge evaluates and selects (or merges) the best.

---

## Core Principle

A single plan has tunnel vision. Two plans with opposing optimization goals expose trade-offs that one perspective alone misses. The judge applies structured evaluation criteria — not gut feeling — to select the winner.

```
          Change Context
               │
    ┌──────────┴──────────┐
    ▼                     ▼
Competitor A          Competitor B
(simplicity)          (extensibility)
    │                     │
    └──────────┬──────────┘
               ▼
          Judge Agent
               │
     ┌─────────┼─────────┐
     ▼         ▼         ▼
   Pick A   Pick B    Merge
```

**Use for**: Critical changes, architecture decisions, multi-approach problems, high-risk refactors.
**Skip for**: Single-file edits, documentation, config changes, trivial tasks.

---

## When to Activate

- Change is marked `critical: true` in orchestrator config
- User explicitly requests: "competitive plan", "compete", "dual plan"
- Orchestrator detects high-risk change (6+ files, breaking changes, new architecture)
- During sdd-propose when `competitive_planning.enabled: true`

---

## The Competitive Planning Pipeline

```
1. CONTEXT   ──► Gather proposal, specs, design (same as sdd-propose)
2. DISPATCH  ──► Launch 2 competitor sub-agents IN PARALLEL (single message)
3. COMPETE   ──► Each generates a full implementation plan independently
4. JUDGE     ──► Judge agent compares on: feasibility, risk, token cost, spec alignment
5. SELECT    ──► Judge picks winner OR merges best parts of both
6. OUTPUT    ──► Structured comparison + selected plan returned to orchestrator
```

**Important**: Competitors MUST NOT know each other's lens. The judge MUST NOT know which lens produced which plan (use neutral labels: Plan Alpha / Plan Beta).

---

## Default Optimization Lenses

| Lens | Competitor | Optimization Goal |
|------|-----------|-------------------|
| Simplicity | A (Alpha) | Fewest moving parts, lowest risk, minimal abstractions, YAGNI-first |
| Extensibility | B (Beta) | Clean abstractions, future growth, plugin points, open-closed principle |

Custom lenses can override defaults via config (see configuration reference).

---

## Evaluation Criteria

The judge scores each plan on four dimensions:

| Criterion | Weight | What to Evaluate |
|-----------|--------|-----------------|
| **Feasibility** | 30% | Can this be implemented with current codebase? Realistic scope? |
| **Risk** | 25% | Breaking changes? Rollback complexity? Edge cases covered? |
| **Token Cost** | 20% | Implementation effort? Number of files/changes? Cognitive load? |
| **Spec Alignment** | 25% | Does the plan satisfy ALL spec requirements and scenarios? |

### Verdict Rules

```
Plan scores higher on 3+ criteria  → SELECT that plan
Plans within 1 criterion           → Judge MAY MERGE best elements
Plans tied on 2-2                  → Judge MUST justify merge or pick based on risk
```

---

## Competitor Output Format

Each competitor MUST return:

```markdown
## Plan: {Lens Name}

### Approach
{1-2 sentence summary of the overall strategy}

### File Changes
| File | Action | Description |
|------|--------|-------------|
| `path/to/file` | Create/Modify/Delete | {what and why} |

### Implementation Order
1. {Step 1}
2. {Step 2}
3. {Step N}

### Risk Assessment
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| {risk} | Low/Med/High | {mitigation} |

### Token Cost Estimate
{Low | Medium | High} — {justification}

### Trade-offs
- **Gains**: {what this approach optimizes for}
- **Sacrifices**: {what this approach gives up}
```

---

## Judge Output Format

```markdown
## Competitive Planning — Judge Report

### Comparison Matrix

| Criterion | Plan Alpha | Plan Beta | Winner |
|-----------|-----------|----------|--------|
| Feasibility | {score + note} | {score + note} | Alpha/Beta/Tie |
| Risk | {score + note} | {score + note} | Alpha/Beta/Tie |
| Token Cost | {score + note} | {score + note} | Alpha/Beta/Tie |
| Spec Alignment | {score + note} | {score + note} | Alpha/Beta/Tie |

### Verdict: {Alpha | Beta | Merged}

### Rationale
{Per-criterion justification for the verdict. If merged, explain which elements
came from which plan and WHY.}

### Selected Plan
{Full plan content — either the winning plan verbatim, or the merged plan
with clear attribution of which parts came from which competitor.}
```

---

## Integration with SDD

### As sdd-propose Enhancement

When `competitive_planning.enabled: true` and change is critical:

```
sdd-propose flow:
  1. Read exploration/context (normal)
  2. Instead of writing ONE proposal approach:
     a. Dispatch competitive planning
     b. Receive judge's selected plan
     c. Use selected plan as the proposal's Approach section
  3. Continue with normal proposal output
```

The orchestrator decides when to invoke competitive planning. The sdd-propose sub-agent receives the winning plan as input, not the full competition.

> @reference references/prompt-templates.md -- Load when constructing the actual sub-agent prompts for competitors and judge

> @reference references/configuration.md -- Load when configuring competitive planning, custom lenses, or sdd-propose integration

> @reference references/code-examples.md -- Load when implementing the orchestration pattern with Claude Code Task tool or OpenCode agents

---

## Rules

1. **Always dispatch both competitors in a SINGLE message** -- parallel execution is mandatory
2. **Competitors MUST NOT know each other's lens** -- no cross-contamination
3. **Judge sees neutral labels** (Alpha/Beta) -- prevent ordering bias
4. **Judge MUST justify every criterion** -- no unexplained scores
5. **Merge is allowed but not free** -- every merged element needs source attribution
6. **Cost awareness** -- this doubles planning tokens; only use for critical changes
7. **Max 2 competitors** -- more is diminishing returns at exponential cost
8. **Config overrides defaults** -- custom lenses replace, not append to, default lenses

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `competitive_planning.enabled: true` | Enable in orchestrator config |
| `competitive_planning.lenses` | Override default optimization lenses |
| `competitive_planning.criteria` | Override evaluation criteria weights |

| Component | Role |
|-----------|------|
| Competitor A | Simplicity-optimized plan |
| Competitor B | Extensibility-optimized plan |
| Judge | Structured comparison + selection |
