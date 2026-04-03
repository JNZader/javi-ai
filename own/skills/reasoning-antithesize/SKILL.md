---
name: reasoning-antithesize
description: >
  Meta-reasoning skill that challenges assumptions by generating the strongest possible counter-argument.
  Injectable into any SDD phase to force adversarial thinking before committing to an approach.
  Trigger: When validating proposals, reviewing designs, or any decision point where confirmation bias is a risk.
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
    - sdd-verify
---

# Antithesize

"What if we do the OPPOSITE?" -- Force the strongest counter-argument to any proposal, finding, or decision.

## Core Principle

Confirmation bias is the silent killer of good architecture. Once someone proposes an approach, the team gravitates toward validating it rather than challenging it. Antithesize is a structured protocol that forces genuine adversarial thinking -- not weak devil's advocacy, but steel-man counter-arguments that could genuinely change the decision.

```
  Proposal / Finding / Decision
              |
              v
    [1] Identify Core Claim
              |
              v
    [2] Find Strongest Evidence AGAINST
              |
              v
    [3] Steel-Man Counter-Argument
              |
              v
    [4] Determine "What Must Be True" for Counter to Win
              |
              v
    [5] Rate Confidence Impact
              |
              v
  Verdict: Stand / Modify / Abandon
```

---

## When to Inject

| SDD Phase | Injection Point | What It Challenges |
|-----------|----------------|-------------------|
| explore | After initial approach identification | "Is this really the right direction?" |
| propose | Before proposal acceptance | "What's the strongest case for NOT doing this?" |
| spec | After requirements are drafted | "Which requirements are actually assumptions?" |
| design | After architecture decisions | "What if the opposite architectural choice is better?" |
| verify | After verification passes | "Are we verifying the right things?" |

---

## Configuration

Enable in `openspec/config.yaml`:

```yaml
reasoning:
  antithesize:
    enabled: true
    auto_inject:
      - sdd-propose   # Auto-run before proposal acceptance
      - sdd-design    # Auto-run after architecture decisions
    severity_threshold: moderate  # Only flag if confidence impact >= moderate
```

When `auto_inject` is set, the orchestrator MUST run Antithesize at the specified phase's completion checkpoint before proceeding to the next phase.

---

## Protocol

### Step 1: Extract the Core Claim

Reduce the proposal/finding/decision to a single, falsifiable statement.

**Bad**: "We should use microservices"
**Good**: "Decomposing the monolith into 5 bounded-context services will reduce deployment coupling and enable independent team scaling"

The more specific the claim, the stronger the counter-argument can be.

### Step 2: Find Evidence Against

Search for evidence from these sources, in order of strength:

1. **Empirical data**: Past failures with this approach (in this codebase or industry)
2. **First principles**: Logical contradictions or violated axioms
3. **Known failure cases**: Documented anti-patterns that match
4. **Trade-off costs**: What the proposal sacrifices that it does not acknowledge
5. **Scale behavior**: How the approach degrades under growth (data, users, team size)

### Step 3: Construct Steel-Man Counter-Argument

The counter-argument MUST be the strongest possible version. Rules:

- NO straw men -- do not weaken the opposing position to make it easier to dismiss
- Assume the counter-argument is being made by an expert who has SEEN this fail
- Include specific scenarios where the counter-argument holds
- If no strong counter-argument exists, state that explicitly (this is valuable signal)

### Step 4: Determine Conditions

Answer: "What would need to be TRUE for the counter-argument to win?"

This is the most valuable output. It converts abstract disagreement into concrete, verifiable conditions that the team can actually check.

### Step 5: Rate Confidence Impact

| Impact Level | Meaning | Action |
|-------------|---------|--------|
| None | Counter-argument is theoretical, no real evidence | Proceed unchanged |
| Slight | Valid point but does not affect the core approach | Note and proceed |
| Moderate | Weakens confidence -- the approach needs a mitigation | Modify proposal to address |
| Significant | Counter-argument is strong -- approach may be wrong | Pause and investigate |
| Fatal | Counter-argument wins -- approach should be abandoned | Reject and reconsider |

---

## Output Format

```markdown
## Antithesize Report

### Core Claim
{The original claim reduced to one falsifiable statement}

### Counter-Argument
{2-4 sentences: the strongest argument against the claim}

### Evidence Against
| Evidence | Source | Strength |
|----------|--------|----------|
| {fact or logic} | {empirical/first-principles/failure-case/trade-off/scale} | Strong/Moderate/Weak |

### Confidence Impact
**Level**: {None / Slight / Moderate / Significant / Fatal}
**Conditions for counter to win**: {What must be true for the counter-argument to defeat the original}

### Steel-Man Rebuttal
{The best defense of the ORIGINAL claim, now STRONGER because it addresses the counter-argument}

### Verdict
{Stand / Modify / Abandon} -- {One sentence justification}

### Recommended Mitigations
{If Modify: specific changes to the proposal. If Abandon: alternative directions to explore.}
```

---

## Injection Protocol for Sub-Agents

When injected into an SDD phase, append this instruction to the sub-agent prompt:

```
REASONING INJECTION — ANTITHESIZE:
Before finalizing your output, apply the Antithesize protocol:
1. State your core recommendation as a single falsifiable claim
2. Generate the strongest counter-argument (steel-man, not straw man)
3. Rate the confidence impact (None/Slight/Moderate/Significant/Fatal)
4. If Moderate or higher: modify your recommendation to address it
5. Include the Antithesize Report as an appendix to your output
```

---

## Critical Rules

1. **Steel-man ONLY** -- weak counter-arguments are worse than no counter-arguments because they create false confidence
2. **Evidence required** -- every counter-argument must cite evidence (empirical, logical, or precedent). "It might not work" is not a counter-argument
3. **The verdict is honest** -- if the counter-argument wins, say so. The skill has no loyalty to the original proposal
4. **Conditions are concrete** -- "What must be true" conditions must be verifiable, not vague
5. **Injection is transparent** -- when auto-injected, the Antithesize Report is ALWAYS visible in the output, never hidden
6. **One claim at a time** -- if a proposal has multiple claims, run Antithesize on each independently
7. **Rebuttal strengthens** -- the steel-man rebuttal should make the original STRONGER by incorporating the valid parts of the counter-argument
