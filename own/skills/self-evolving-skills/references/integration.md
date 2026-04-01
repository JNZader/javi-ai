# Integration Guide: Self-Evolving Skills Protocol

How to wire the learning protocol into any existing skill.

---

## Before / After Comparison

### Before (static skill)

```markdown
## What to Do

### Step 1: Load Skills
Read the skill file and follow instructions.

### Step 2: Do the Work
{... skill-specific work ...}

### Step 3: Return Summary
Return structured output to orchestrator.
```

### After (self-evolving skill)

```markdown
## What to Do

### Step 1: Load Skills
Read the skill file and follow instructions.

### Step 1.5: Load Past Learnings (Self-Evolving Protocol)
IF engram is available:
  1. `mem_search(query: "skill-learning/{skill-name}", project: "{project}", limit: 5)`
  2. For each result: `mem_get_observation(id: {id})`
  3. Inject as context:
     ```
     ## Past Learnings for {skill-name}
     {retrieved learnings}
     Use these to avoid past mistakes and apply proven approaches.
     ```
IF engram is not available: skip silently.

### Step 2: Do the Work
{... skill-specific work — now informed by past learnings ...}

### Step 2.5: Capture Learning (Self-Evolving Protocol)
IF engram is available AND execution had meaningful outcome:
  ```
  mem_save(
    title: "skill-learning/{skill-name}: {brief}",
    topic_key: "skill-learning/{skill-name}/{YYYY-MM-DD-slug}",
    type: "learning",
    project: "{project}",
    content: "**Skill**: {skill-name}
    **Outcome**: success | partial | failure
    **Context**: {1-sentence task description}
    **What worked**: {what succeeded}
    **What failed**: {what didn't work}
    **Improvement**: {suggestion for next time}"
  )
  ```
IF engram is not available OR outcome was trivial: skip silently.

### Step 3: Return Summary
Return structured output to orchestrator.
```

---

## Concrete Example: Wiring into debug-mode

### Pre-Execution Addition

Insert after the skill's "Phase 1: Observe" and before hypothesis generation:

```markdown
### Phase 0.5: Load Debug Learnings

IF engram is available:
1. Search: `mem_search(query: "skill-learning/debug-mode", project: "{project}", limit: 5)`
2. Retrieve: `mem_get_observation(id)` for each result
3. Review learnings — do any past debug sessions cover similar symptoms?
4. Adjust hypothesis ranking based on past outcomes (e.g., if H2 was always wrong for auth bugs, rank it lower)

IF engram is unavailable: proceed to Phase 1 normally.
```

### Post-Execution Addition

Insert after the final debug report, before cleanup:

```markdown
### Phase 5: Capture Debug Learning

IF engram is available AND the root cause was found:

```
mem_save(
  title: "skill-learning/debug-mode: {root-cause-summary}",
  topic_key: "skill-learning/debug-mode/{YYYY-MM-DD-slug}",
  type: "learning",
  project: "{project}",
  content: "**Skill**: debug-mode
  **Outcome**: {success/partial/failure}
  **Context**: {bug description in 1 sentence}
  **What worked**: {which hypothesis was correct, what evidence confirmed it}
  **What failed**: {hypotheses that were wrong, why they seemed plausible}
  **Improvement**: {how to rank hypotheses better next time for similar symptoms}"
)
```

IF engram is unavailable: skip silently.
```

---

## Quick Reference: Where to Insert

| Skill Pattern | Pre-Execution Insert Point | Post-Execution Insert Point |
|--------------|---------------------------|----------------------------|
| SDD skills (sdd-apply, etc.) | After "Step 1: Load Skills" | Before "Step N: Return Summary" |
| Debug mode | Before "Phase 2: Hypothesize" | After final report, before cleanup |
| Compound loop | Before "Step 2: Reflection" | After "Step 5: Persist to Engram" |
| Any skill | After initial setup/load | Before final return/summary |

---

## Graceful Degradation Verification

To confirm your wired skill degrades gracefully:

1. Disable engram (stop the MCP server)
2. Execute the skill normally
3. Verify: no errors, no warnings, skill works as before
4. Re-enable engram
5. Execute again
6. Verify: learning entry appears in engram
