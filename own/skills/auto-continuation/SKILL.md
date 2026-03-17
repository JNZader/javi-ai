---
name: auto-continuation
description: >
  Recursive agent spawning with context preservation for tasks that exceed a single context window.
  Trigger: When a task is too large for one context, generating long documents, multi-file implementations, or user asks to "continue", "keep going", "don't stop".
metadata:
  author: javi-ai
  version: "1.0"
  tags: [continuation, long-tasks, context, orchestration]
  category: orchestration
allowed-tools: Read, Write, Edit, Bash, Task
---

## Purpose

Enable AI agents to work on tasks that exceed a single context window by spawning continuation agents with preserved state. Each agent completes a chunk and hands off to the next.

---

## When to Activate

- Task will produce output larger than ~15K tokens
- Multi-file implementation spanning 6+ files
- Long document generation (research reports, documentation)
- User explicitly asks to "continue" or "don't stop"
- Context window approaching 80% capacity during a task

---

## Continuation Protocol

### Step 1: Detect Need for Continuation

Check these signals:
- Output has grown beyond 10K tokens and task isn't complete
- Remaining work items > what can fit in current context
- Context usage > 70% and task has multiple phases remaining

### Step 2: Prepare Handoff State

Before spawning a continuation, write a handoff document:

```markdown
## Continuation State

### Task
[Original task description]

### Progress
- [x] Phase 1: [what was done]
- [x] Phase 2: [what was done]
- [ ] Phase 3: [what remains]
- [ ] Phase 4: [what remains]

### Context to Preserve
- **Themes**: [key themes/patterns established]
- **Style**: [writing style, code conventions used]
- **Decisions**: [key decisions made and why]
- **Quality metrics**: [any metrics being tracked]

### Files Written So Far
- path/to/file1.ts — [what it contains, status]
- path/to/file2.ts — [what it contains, status]

### Continuation Instructions
Start with Phase 3. Read files listed above for context.
Key constraint: [any constraint from earlier phases]
```

### Step 3: Spawn Continuation Agent

Use the Task tool to spawn a new agent:

```
Task(
  description="Continue: [task name] — Phase 3",
  prompt="[handoff document + remaining task]",
  subagent_type="development"
)
```

### Step 4: Verify Continuity

The continuation agent must:
1. Read the handoff state
2. Read files written by previous agents
3. Verify consistency with prior work before continuing
4. Continue from where the last agent stopped

---

## Quality Gates

Before each continuation handoff, verify:

| Gate | Check |
|------|-------|
| **Completeness** | Current phase fully done, not partially |
| **Consistency** | Style matches prior sections |
| **No regressions** | Tests still pass (if applicable) |
| **Word count** | Target reached for current section |
| **Citations** | All references valid (for research) |

If any gate fails, fix before handing off — don't pass problems forward.

---

## Anti-Fatigue Enforcement

Long documents degrade in quality over time. Enforce:

1. **Prose ratio >= 80%** — if bullet points exceed 20%, rewrite as prose
2. **No list degradation** — later sections shouldn't be bullet lists when earlier ones were prose
3. **Consistent depth** — all sections get equal treatment, no "wrapping up" shortcuts
4. **Re-read intro before writing conclusion** — maintain narrative arc

---

## Progressive File Assembly

For long documents, write sections to file immediately:

```
1. Write section 1 to output.md
2. Write section 2 — append to output.md  
3. [continuation agent spawns]
4. Read output.md for context
5. Write section 3 — append to output.md
6. Continue until complete
```

This prevents data loss on context resets and gives the user progressive output.

---

## Context Preservation Across Continuations

### Must Preserve
- Task description (verbatim)
- All files written/modified (paths and content summaries)
- Key decisions and their rationale
- Quality metrics and style conventions
- Error log (what went wrong and was fixed)

### Can Summarize
- Detailed analysis from earlier phases (use L1 summaries)
- Tool output logs
- Search results (keep only the findings)

### Can Drop
- Failed approaches that were abandoned
- Verbose intermediate reasoning
- Duplicate information

---

## Rules

1. **Never start a continuation without writing handoff state** — the next agent is blind without it
2. **Write to files progressively** — don't accumulate everything in context
3. **Verify before handoff** — don't pass broken state to the next agent
4. **Maximum 5 continuations** — if not done in 5 rounds, the task needs re-scoping
5. **Save handoff to Engram** — so manual continuation works too (not just Task tool)
6. **Anti-fatigue is mandatory** — quality must not degrade in later continuations
