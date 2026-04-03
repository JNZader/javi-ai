---
name: reasoning-stress-test
description: >
  Meta-reasoning skill that systematically finds failure modes, breaking points, and edge cases.
  Injectable into any SDD phase to identify where designs, specs, and implementations collapse under pressure.
  Trigger: When evaluating robustness, planning for scale, reviewing critical paths, or before shipping.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
  category: reasoning
  injectable: true
  injects_into:
    - sdd-spec
    - sdd-design
    - sdd-tasks
    - sdd-verify
---

# Stress-Test

"Where does this break?" -- Systematically probe for failure modes, edge cases, and breaking points that optimistic analysis ignores.

## Core Principle

Proposals and designs describe how things WORK. Stress-Test describes how things BREAK. Every system has a failure envelope -- a set of conditions under which it degrades or collapses. Most analyses only explore the happy path. Stress-Test forces exploration of the edges: what happens at 10x load, with bad input, when dependencies fail, when the team changes, when requirements shift.

```
  Design / Spec / Implementation
              |
              v
    [1] Identify Stress Dimensions
              |
              v
    [2] Apply Pressure on Each Dimension
              |
              v
    [3] Find Breaking Points
              |
              v
    [4] Map Failure Cascades
              |
              v
    [5] Classify and Prioritize
              |
              v
  Stress Report (failure map + mitigations)
```

---

## When to Inject

| SDD Phase | Injection Point | What It Stresses |
|-----------|----------------|-----------------|
| spec | After requirements are drafted | "Which requirements break under edge cases?" |
| design | After architecture is defined | "Where does the architecture collapse under load/failure?" |
| tasks | After task breakdown | "Which tasks have hidden complexity that will blow estimates?" |
| verify | During validation | "Are we testing the failure modes, not just the happy paths?" |

---

## Configuration

Enable in `openspec/config.yaml`:

```yaml
reasoning:
  stress-test:
    enabled: true
    auto_inject:
      - sdd-design    # Auto-run after architecture decisions
      - sdd-verify    # Auto-run during verification
    dimensions:        # Which stress dimensions to apply (default: all)
      - scale
      - failure
      - adversarial
      - temporal
      - human
```

---

## Stress Dimensions

### 1. Scale Stress

Push quantities to extremes.

| Factor | Normal | Stress | What Breaks? |
|--------|--------|--------|-------------|
| Data volume | 1K records | 1M records | ? |
| Concurrent users | 10 | 10,000 | ? |
| Payload size | 1KB | 100MB | ? |
| Frequency | 1 req/s | 1000 req/s | ? |
| History depth | 1 month | 5 years | ? |

**Ask**: "What happens at 10x? At 100x? At 1000x? Where is the cliff?"

### 2. Failure Stress

Remove things the system depends on.

| Dependency | Failure Mode | Impact |
|-----------|-------------|--------|
| Database | Connection timeout | ? |
| External API | Returns 500 | ? |
| Cache | Eviction storm | ? |
| File system | Disk full | ? |
| Network | Partition between services | ? |

**Ask**: "What happens when each dependency fails? Do we degrade gracefully or cascade?"

### 3. Adversarial Stress

Assume a hostile actor.

| Vector | Attack | Impact |
|--------|--------|--------|
| Input | Malformed/oversized payloads | ? |
| Auth | Expired/stolen tokens | ? |
| Race conditions | Concurrent conflicting operations | ? |
| State | Manipulated client-side state | ? |
| Timing | Slowloris / resource exhaustion | ? |

**Ask**: "How could someone intentionally break this? What is the cheapest attack?"

### 4. Temporal Stress

Apply the pressure of time.

| Factor | Stress | Impact |
|--------|--------|--------|
| Requirements change | Core assumption invalidated after 3 months | ? |
| Team turnover | Original author leaves | ? |
| Dependency decay | Major dependency releases breaking version | ? |
| Data drift | Input distribution shifts over time | ? |
| Tech debt compound | 6 months of "quick fixes" accumulate | ? |

**Ask**: "Is this still viable in 6 months? In 2 years? What rots first?"

### 5. Human Stress

Apply the reality of people.

| Factor | Stress | Impact |
|--------|--------|--------|
| Onboarding | New developer, no context | ? |
| Misuse | Developer uses API incorrectly | ? |
| Config error | Wrong environment variable | ? |
| Partial knowledge | Only understands half the system | ? |
| Fatigue | 3am incident, reading this code for the first time | ? |

**Ask**: "Can a tired, stressed developer at 3am understand and fix this?"

---

## Protocol

### Step 1: Identify Applicable Dimensions

Not all dimensions apply to every artifact. Select the relevant ones:

- **Spec**: Scale, Adversarial, Temporal
- **Design**: All 5 dimensions
- **Tasks**: Scale, Temporal, Human
- **Verify**: Scale, Failure, Adversarial

### Step 2: Apply Pressure

For each selected dimension, fill in the stress tables above with actual values from the current design/spec.

### Step 3: Find Breaking Points

A breaking point is where the system transitions from "works" to "fails." Describe each as:

```
Breaking Point: {what breaks}
Dimension: {which stress dimension}
Threshold: {the specific value/condition where it breaks}
Failure Mode: {what happens -- crash, data loss, degradation, silent corruption}
Detection: {how would you KNOW it broke -- monitoring, error, user report, silent}
```

### Step 4: Map Failure Cascades

For each breaking point, trace what ELSE fails as a consequence:

```
{Breaking point A}
    -> causes {Failure B}
        -> causes {Failure C}
            -> results in {User-visible impact}
```

Single-point failures that cascade into user-visible impact are CRITICAL.

### Step 5: Classify and Prioritize

| Priority | Criteria | Action |
|----------|---------|--------|
| P0 - Critical | Data loss or security breach | Must fix before shipping |
| P1 - High | User-visible failure with no workaround | Should fix before shipping |
| P2 - Medium | Degraded experience, workaround exists | Fix in next iteration |
| P3 - Low | Edge case, unlikely, limited impact | Document and monitor |

---

## Output Format

```markdown
## Stress-Test Report

### Dimensions Tested
{List of dimensions applied and why}

### Breaking Points
| # | What Breaks | Dimension | Threshold | Failure Mode | Detection | Priority |
|---|------------|-----------|-----------|-------------|-----------|----------|
| 1 | {description} | Scale/Failure/Adversarial/Temporal/Human | {specific value} | Crash/Degradation/Silent/Data Loss | Monitoring/Error/Silent | P0-P3 |

### Failure Cascades
```
BP-1: {breaking point}
    -> {consequence 1}
        -> {consequence 2}
            -> USER IMPACT: {what the user experiences}
```

### Resilience Gaps
| Gap | Current State | Required State | Effort to Fix |
|-----|-------------|---------------|---------------|
| {what's missing} | {no handling / partial} | {graceful degradation / circuit breaker / etc} | Low/Med/High |

### Mitigation Recommendations
| Priority | Breaking Point | Mitigation | Effort |
|----------|---------------|------------|--------|
| P0 | {ref} | {specific fix} | {estimate} |
| P1 | {ref} | {specific fix} | {estimate} |

### Stress Verdict
**Overall Resilience**: {Robust / Adequate / Fragile / Critical}
{1-3 sentences: summary assessment of how the system handles pressure}
```

---

## Injection Protocol for Sub-Agents

When injected into an SDD phase, append this instruction to the sub-agent prompt:

```
REASONING INJECTION — STRESS-TEST:
Before finalizing your output, apply the Stress-Test protocol:
1. Identify the top 3 failure modes for your design/spec/implementation
2. For each, state the breaking threshold and failure cascade
3. Flag any P0/P1 items that must be addressed before proceeding
4. If any P0 exists: your output MUST include mitigations, not just flags
5. Include the Stress-Test Report as an appendix to your output
```

---

## Critical Rules

1. **Quantify thresholds** -- "breaks under high load" is not a finding. "Breaks above 500 concurrent connections because the connection pool is capped at 100" is a finding
2. **Detection is mandatory** -- every breaking point must state how you would KNOW it happened. Silent failures are the worst kind
3. **Cascades are the priority** -- a single breaking point is manageable; a cascade is catastrophic. Always trace the chain
4. **All 5 dimensions for design** -- when stress-testing architecture, never skip a dimension. Partial stress-testing creates false confidence
5. **Mitigations are specific** -- "add monitoring" is not a mitigation. "Add a circuit breaker on the payment API call with 5s timeout and 3-retry fallback" is a mitigation
6. **P0 blocks progress** -- if a P0 breaking point is found, the phase output MUST address it. No kicking P0 issues to "later"
7. **Stress-Test is NOT pessimism** -- the goal is informed confidence, not paralysis. A system that passes stress testing is one you can ship with clear eyes
