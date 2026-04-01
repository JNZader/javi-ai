# Competitive Planning -- Configuration Reference

## Orchestrator Config

### Minimum Configuration

```yaml
# In orchestrator config or openspec/config.yaml
competitive_planning:
  enabled: true
```

### Full Configuration

```yaml
competitive_planning:
  enabled: true
  trigger: critical_only        # critical_only | always | manual
  lenses:                       # Override default lenses (exactly 2)
    - name: "performance"
      goal: "Optimize for runtime performance, minimal allocations, O(1) lookups"
      mindset: "You are a performance engineer. Every allocation counts."
    - name: "maintainability"
      goal: "Optimize for readability, team onboarding, clear naming"
      mindset: "You are a tech lead hiring junior devs next quarter."
  criteria:                     # Override evaluation weights (must sum to 100)
    feasibility: 30
    risk: 25
    token_cost: 20
    spec_alignment: 25
  judge:
    bias_prevention: true       # Randomize plan presentation order (default: true)
    allow_merge: true           # Allow judge to merge plans (default: true)
    require_unanimity: false    # Require 4/4 criteria win to skip merge consideration
```

---

## Integration with SDD Propose

### How the Orchestrator Triggers Competitive Planning

The orchestrator (NOT sdd-propose) decides when to invoke competitive planning:

```
Orchestrator receives: /sdd-new {change-name}
  │
  ├── Is competitive_planning.enabled? ──► No → normal sdd-propose
  │
  ├── Is trigger == "always"? ──► Yes → invoke competitive planning
  │
  ├── Is trigger == "critical_only"?
  │     ├── Is change marked critical? ──► Yes → invoke competitive planning
  │     └── Not critical ──► normal sdd-propose
  │
  └── Is trigger == "manual"? ──► Wait for user to say "compete"
```

### Orchestrator Dispatch Pattern

```
# Step 1: Gather context (same as normal sdd-propose)
context = gather_proposal_context(change_name)

# Step 2: Dispatch competitors in PARALLEL (single message)
Task(competitor_a_prompt + context)  # Simplicity lens
Task(competitor_b_prompt + context)  # Extensibility lens

# Step 3: Wait for both to complete

# Step 4: Dispatch judge (sequential, after both return)
Task(judge_prompt + plan_alpha + plan_beta + specs)

# Step 5: Feed winning plan into sdd-propose as the Approach
Task(sdd_propose_prompt + winning_plan)
```

### Marking a Change as Critical

The orchestrator marks changes as critical based on:

| Signal | Threshold |
|--------|-----------|
| Files affected | 8+ files |
| New interfaces/APIs | 3+ |
| Cross-module boundaries | 2+ |
| Database schema changes | Any |
| User explicitly says "critical" | Always |

Or via explicit flag:
```
User: /sdd-new auth-redesign --critical
```

---

## Custom Lenses

Override default simplicity/extensibility with any optimization pair:

```yaml
lenses:
  - name: "security-first"
    goal: "Minimize attack surface, defense in depth, principle of least privilege"
    mindset: "Assume every input is malicious. Every boundary is a potential breach."
  - name: "velocity-first"
    goal: "Ship fastest, minimize files touched, leverage existing patterns"
    mindset: "Time to production is the metric. Reuse everything possible."
```

Constraints:
- Exactly 2 lenses (not more, not fewer)
- Lenses MUST be meaningfully different (opposing trade-offs)
- Custom lenses replace defaults entirely

---

## Anti-Patterns

### 1. Using for Trivial Changes
**Wrong**: Competitive planning for a typo fix. **Right**: Reserve for architectural decisions and critical changes.

### 2. More Than 2 Competitors
Diminishing returns at exponential token cost. Two opposing lenses capture the primary design tension.

### 3. Judge Seeing Lens Names
If the judge knows "this is the simplicity plan", bias is introduced. Always use neutral labels (Alpha/Beta).

### 4. Skipping the Judge
Just reading two plans yourself defeats the purpose. The judge applies structured criteria, not vibes.

### 5. Always-On Mode
Competitive planning doubles planning tokens. Use `trigger: critical_only` unless the project has budget for `always`.

### 6. Identical Lenses
Two competitors with the same optimization goal produce the same plan. Lenses MUST pull in opposing directions.

### 7. Ignoring the Losing Plan
The losing plan's trade-offs section contains valuable information about what the winning plan sacrifices. Document it.
