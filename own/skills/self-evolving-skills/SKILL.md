---
name: self-evolving-skills
description: >
  Learning protocol that makes skills improve with usage — log outcomes to engram after execution, load past learnings before next invocation.
  Trigger: When executing any skill that should learn from past usage, when user says "evolving skills", "skill learning", or when adopting the learning protocol.
metadata:
  author: javi-ai
  version: "1.0"
  tags: [learning, engram, skills, self-improvement, memory]
  category: workflow
allowed-tools: Read, Bash, Glob, Grep
---

# Self-Evolving Skills

Skills that remember what worked and what failed, improving with every use.

---

## Core Principle

Static skills repeat the same mistakes. A skill that logged "Hypothesis H2 was always wrong for auth bugs" last session can skip that dead end next time. **Learnings compound** — each execution makes the next one faster and more accurate.

```
Execute Skill --> Capture Outcome --> Save to Engram
                                          |
Next Invocation --> Load Learnings --> Better Execution
```

---

## When to Activate

- Before executing ANY skill that has adopted the learning protocol
- After completing a skill execution with meaningful outcomes
- When wiring the learning protocol into a new or existing skill

**Do NOT activate** for trivial skill invocations (simple reads, formatting).

---

## Pre-Execution Protocol: Load Learnings

Add this block at the START of any skill's execution, after loading the skill file itself.

### Steps

1. **Check engram availability** — if `mem_search` is not available, skip silently
2. **Search for past learnings**:
   ```
   mem_search(
     query: "skill-learning/{skill-name}",
     project: "{project}",
     limit: 5
   )
   ```
3. **Retrieve full content** for each result:
   ```
   mem_get_observation(id: {id})
   ```
4. **Inject as context** — prepend to your working context:
   ```
   ## Past Learnings for {skill-name}
   
   {learning 1 content}
   {learning 2 content}
   ...
   
   Use these learnings to avoid past mistakes and apply proven approaches.
   ```

### Decision Tree

```
Engram available?
├── No  → Skip pre-execution, proceed normally
└── Yes → mem_search("skill-learning/{skill-name}")
          ├── No results → Proceed normally (first-time execution)
          └── Results found → Retrieve full content (max 5)
                              → Inject as "Past Learnings" context
                              → Proceed with skill execution
```

---

## Post-Execution Protocol: Capture Outcome

Add this block at the END of any skill's execution, before returning to the orchestrator.

### Steps

1. **Check engram availability** — if `mem_save` is not available, skip silently
2. **Assess outcome** — determine success/partial/failure
3. **Compose learning entry** using the structured format below
4. **Save to engram**:
   ```
   mem_save(
     title: "skill-learning/{skill-name}: {brief-description}",
     topic_key: "skill-learning/{skill-name}/{YYYY-MM-DD-slug}",
     type: "learning",
     project: "{project}",
     content: "{structured learning entry}"
   )
   ```

### Decision Tree

```
Skill execution complete?
├── Trivial execution (no meaningful outcome) → Skip capture
└── Meaningful execution → Assess outcome
    ├── Success   → Capture what worked and why
    ├── Partial   → Capture what worked + what failed
    └── Failure   → Capture what went wrong + improvement ideas
```

---

## Learning Entry Format

Every learning entry MUST follow this structure. Keep total content under 200 words.

```markdown
**Skill**: {skill-name}
**Outcome**: success | partial | failure
**Context**: {what task was being done — 1 sentence}
**What worked**: {techniques, approaches, or patterns that succeeded}
**What failed**: {what didn't work and why — or "N/A" if full success}
**Improvement**: {concrete suggestion for next invocation}
```

### Example: debug-mode learning

```markdown
**Skill**: debug-mode
**Outcome**: success
**Context**: Investigating 401 cascade after token refresh in auth middleware
**What worked**: Starting with H1 (stale token in store) was correct — checking Redux state first saved 20 min vs network-level debugging
**What failed**: N/A
**Improvement**: For auth bugs, always check client-side state before network traces
```

### Example: sdd-apply learning

```markdown
**Skill**: sdd-apply
**Outcome**: partial
**Context**: Implementing Phase 2 tasks for analytics dashboard feature
**What worked**: Reading existing patterns in src/components before writing new ones matched project conventions
**What failed**: Assumed Tailwind v3 classes — project uses Tailwind v4 with CSS-first config
**Improvement**: Always check tailwind.config or CSS files for version before writing styles
```

---

## Engram Topic Key Convention

| Purpose | Topic Key Pattern | Example |
|---------|------------------|---------|
| Individual learning | `skill-learning/{skill}/{YYYY-MM-DD-slug}` | `skill-learning/debug-mode/2026-03-31-auth-401-fix` |
| Search all learnings | `skill-learning/{skill}` (query prefix) | `skill-learning/debug-mode` |

The `{slug}` is a lowercase, hyphenated summary of the task (max 5 words). Combined with date, this prevents collisions while remaining searchable.

---

## Critical Rules

1. **NEVER skip pre-execution load** if engram is available — past learnings are the whole point
2. **NEVER modify SKILL.md files** based on learnings — learnings live in engram only
3. **ALWAYS degrade gracefully** — if engram is unavailable, skill works normally without learning
4. **ALWAYS cap at 5 learnings** in pre-execution to prevent context bloat
5. **ALWAYS keep entries under 200 words** — concise entries are more useful than verbose ones
6. **ALWAYS include the Improvement field** — it's the most actionable part
7. **NEVER save trivial learnings** — "it worked fine" with no insight wastes context
8. **ALWAYS use the structured format** — unstructured learnings are hard to parse and inject

---

## Adoption Checklist

To wire the learning protocol into an existing skill:

- [ ] Add pre-execution block after "Step 1: Load Skills" (or equivalent)
- [ ] Add post-execution block before the return/summary step
- [ ] Verify engram graceful degradation (skill works without engram)
- [ ] Test: execute skill, check engram for learning entry
- [ ] Test: execute skill again, verify learnings are loaded

See [references/integration.md](references/integration.md) for detailed integration guide.
