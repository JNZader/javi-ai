# Competitive Planning -- Code Examples

## Claude Code Task Orchestration

### Full Competitive Planning Flow

```
# Step 1: Gather context
context = """
  Change: auth-redesign
  Proposal: Replace session-based auth with JWT + refresh tokens
  Specs: Must support SSO, MFA, token rotation, session revocation
  Affected files: src/auth/, src/middleware/, src/routes/login.ts
"""

# Step 2: Dispatch BOTH competitors in ONE message (parallel)
Task(
  description: 'competitive-planning: competitor A (simplicity) for auth-redesign',
  prompt: '{competitor_a_prompt}

  ## Change Context
  ' + context
)

Task(
  description: 'competitive-planning: competitor B (extensibility) for auth-redesign',
  prompt: '{competitor_b_prompt}

  ## Change Context
  ' + context
)

# Step 3: Both return. Randomize order for judge.
# (flip a coin or use deterministic hash of change name)
plan_alpha = competitor_b_response  # randomized
plan_beta = competitor_a_response

# Step 4: Dispatch judge
Task(
  description: 'competitive-planning: judge for auth-redesign',
  prompt: '{judge_prompt}

  ## Plan Alpha
  ' + plan_alpha + '

  ## Plan Beta
  ' + plan_beta + '

  ## Spec Requirements
  ' + specs
)

# Step 5: Judge returns verdict + selected plan
# Feed into sdd-propose as the Approach section
```

---

### Minimal Integration with SDD Orchestrator

```
# In the SDD orchestrator, when processing /sdd-new for a critical change:

if change.is_critical and config.competitive_planning.enabled:
    # Gather same context sdd-propose would use
    context = gather_context(change_name)

    # Launch competitive planning
    Task(
      description: 'competitive-planning for ' + change_name,
      prompt: 'You are a competitive planning orchestrator.
      Read ~/.claude/skills/competitive-planning/SKILL.md FIRST.

      CONTEXT:
      - Project: {project_path}
      - Change: ' + change_name + '
      - Artifact store mode: engram

      Execute the full competitive planning pipeline:
      1. Dispatch two competitors with the context below
      2. Collect both plans
      3. Dispatch judge
      4. Return the judge report

      CHANGE CONTEXT:
      ' + context
    )

    # Use the winning plan in the proposal
    winning_plan = judge_report.selected_plan
    # Pass to sdd-propose as additional context
```

---

## OpenCode Agent Configuration

```yaml
# .opencode/agents.yaml
agents:
  competitive-planner:
    description: "Orchestrates competitive planning for critical changes"
    model: anthropic/claude-sonnet-4-20250514
    system_prompt: |
      You orchestrate competitive planning. Dispatch two competitors
      with opposing lenses, then a judge to evaluate.

  competitor-simplicity:
    description: "Plans with simplicity optimization lens"
    model: anthropic/claude-sonnet-4-20250514
    system_prompt: |
      You are Competitor A. Optimize for simplicity: fewest moving parts,
      lowest risk, minimal abstractions, YAGNI-first.

  competitor-extensibility:
    description: "Plans with extensibility optimization lens"
    model: anthropic/claude-sonnet-4-20250514
    system_prompt: |
      You are Competitor B. Optimize for extensibility: clean abstractions,
      future growth, plugin points, open-closed principle.

  planning-judge:
    description: "Evaluates competing plans on structured criteria"
    model: anthropic/claude-sonnet-4-20250514
    system_prompt: |
      You are the Judge. Compare two plans on feasibility, risk,
      token cost, and spec alignment. Select the best or merge.
```

---

## Example Output: Judge Report

```markdown
## Competitive Planning -- Judge Report

### Comparison Matrix

| Criterion | Plan Alpha | Plan Beta | Winner |
|-----------|-----------|----------|--------|
| Feasibility | 8/10 -- Uses existing middleware pattern, low effort | 6/10 -- Requires new abstraction layer, more setup | Alpha |
| Risk | 7/10 -- Tight coupling to current auth lib | 8/10 -- Clean interfaces allow swapping auth provider | Beta |
| Token Cost | 9/10 -- 3 files modified, 0 new | 5/10 -- 3 modified, 4 new files | Alpha |
| Spec Alignment | 8/10 -- All requirements met, MFA via middleware chain | 9/10 -- All requirements met, MFA as pluggable strategy | Beta |

### Verdict: Merged

### Rationale
Alpha wins on feasibility and token cost (pragmatic, low effort).
Beta wins on risk and spec alignment (cleaner long-term, better MFA design).

Merged approach: Use Alpha's middleware-based structure (fewer files) but
adopt Beta's MFA strategy pattern (pluggable, spec-aligned).

- [from Alpha] Modify existing `src/auth/middleware.ts` instead of creating new abstraction layer
- [from Alpha] Keep `src/routes/login.ts` modification scope minimal
- [from Beta] Extract MFA into `src/auth/strategies/mfa.ts` with strategy interface
- [from Beta] Add `src/auth/types.ts` for shared auth interfaces (enables future provider swaps)

### Selected Plan
(merged plan content follows with full file changes table and implementation order)
```

---

## Bash Helper: Randomize Plan Order

```bash
#!/usr/bin/env bash
# randomize-plans.sh -- Prevent ordering bias for the judge
# Usage: source randomize-plans.sh "$PLAN_A" "$PLAN_B"

PLAN_A="$1"
PLAN_B="$2"

# Deterministic shuffle based on timestamp parity
if (( $(date +%s) % 2 == 0 )); then
  PLAN_ALPHA="$PLAN_A"
  PLAN_BETA="$PLAN_B"
else
  PLAN_ALPHA="$PLAN_B"
  PLAN_BETA="$PLAN_A"
fi

echo "Plan Alpha assigned from: $([ "$PLAN_ALPHA" = "$PLAN_A" ] && echo 'A' || echo 'B')"
```
