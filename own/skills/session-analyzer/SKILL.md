---
name: session-analyzer
description: >
  Analyzes a session summary and extracts reusable patterns as proposed SKILL.md drafts.
  Trigger: /analyze-session, or user says "extract patterns", "make this a skill", "what can we reuse from this session".
metadata:
  author: javi-ai
  version: "1.0"
  tags: [learning, skills, patterns, meta]
  category: workflow
allowed-tools: Read, Write, mcp__plugin_engram_engram__mem_search, mcp__plugin_engram_engram__mem_get_observation
---

## Purpose

After a productive session, extract repeatable patterns and propose them as new SKILL.md files.
The user reviews and approves; approved skills are saved to ~/.claude/skills/ via `javi-ai propose approve`.

---

## Extraction Algorithm

### Step 1: Load session context

If triggered post-session, load the session summary from Engram:
```
mem_search(query: "session summary", project: "{project}")
```

If triggered manually, ask the user: "Share the session summary or describe what pattern you want to capture."

### Step 2: Identify patterns

Look for:
- **Repeated solutions** — same approach used 3+ times in the session
- **Non-obvious conventions** — decisions that required research or deliberation
- **Tool combinations** — specific sequences of tools that solved a class of problem
- **Anti-patterns avoided** — things explicitly NOT done and why

### Step 3: For each pattern found, draft a SKILL.md

Use this structure:
```markdown
---
name: {kebab-case-name}
description: >
  {one-line description of when to use this skill}
  Trigger: {trigger phrases}
metadata:
  author: javi-ai
  version: "0.1-proposed"
  tags: [{relevant tags}]
  category: {workflow|testing|architecture|debugging}
allowed-tools: {tools the skill needs}
---

## Purpose
{why this skill exists — the problem it solves}

## Steps
{numbered steps}

## Rules
1. {critical constraint}
2. {critical constraint}
```

### Step 4: Propose via javi-ai

Save each draft to `~/.javi-ai/proposed/{skill-name}.md` and report:

```
Extracted {N} patterns from session:

1. {skill-name} — {one-line description}
   → Save proposal: javi-ai propose approve {skill-name}
   → Discard: javi-ai propose reject {skill-name}

2. ...
```

---

## Rules

1. **Quality over quantity** — propose 1-3 high-quality skills, not 10 mediocre ones
2. **Specificity wins** — "how to configure Biome for Ink projects" beats "linting"
3. **Include trigger phrases** — a skill with no trigger is never loaded
4. **Version as 0.1-proposed** — marks it as unreviewed
5. **Don't propose duplicates** — check existing skills first with mem_search
