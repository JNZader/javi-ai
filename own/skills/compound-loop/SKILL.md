---
name: compound-loop
description: >
  Post-task learning capture workflow that documents what was learned, appends to learnings.md, and suggests CLAUDE.md improvements.
  Trigger: After completing a significant task, when user says "compound", "what did we learn", "document learnings", or invokes /compound.
metadata:
  author: javi-ai
  version: "1.0"
  tags: [learning, reflection, knowledge-management, compound-engineering]
  category: workflow
dependencies:
  - sdd-apply
  - sdd-explore
---

# Compound Engineering Loop

Post-task reflection workflow that captures learnings and compounds team knowledge over time.

---

## Core Principle

Each unit of engineering work should make subsequent units easier — not harder. Without deliberate capture, hard-won insights evaporate between sessions. This skill creates a structured reflection step after significant work, persisting learnings where they compound value.

```
Brainstorm --> Plan --> Work --> Review --> Compound --> Repeat
                                              ^
                                         YOU ARE HERE
```

---

## When to Activate

- After completing a significant task (feature, bug fix, refactor, migration)
- User says "compound", "what did we learn", "document learnings"
- User invokes `/compound` or `/compound [brief context]`
- After a debugging session that uncovered non-obvious root causes
- After establishing new conventions or patterns

**Do NOT activate** for trivial changes (typo fixes, single-line edits, formatting).

---

## Compound Loop Protocol

### Step 1: Context Gathering

Before prompting, silently gather context:

1. Review the conversation history for the most recent significant task
2. Identify files changed, decisions made, and problems solved
3. Note any errors encountered and how they were resolved

### Step 2: Reflection Prompts

Present these 4 reflection questions to the user. Use the platform's question tool if available (`AskUserQuestion` in Claude Code, `request_user_input` in Codex, `ask_user` in Gemini). If unavailable, present all 4 and wait for the user's reply.

**Questions:**

1. **What was done?** — Summarize the task in 1-2 sentences. What was the goal and what was delivered?
2. **What was learned?** — What key insight or technique was discovered? What would you tell your past self before starting?
3. **What was surprising?** — What unexpected behavior, gotcha, or edge case appeared? What assumption was wrong?
4. **What conventions were established?** — Were any new patterns, rules, or standards decided? Should they apply to future work?

If the user provides brief context with the command (e.g., `/compound fixed the auth race condition`), use that as a starting point and pre-fill what you can from conversation history. Still confirm with the user.

### Step 3: Format Learning Entry

Assemble the learning into this structure:

```markdown
## [YYYY-MM-DD] {Descriptive Title}

**What was done**: {1-2 sentence summary}
**What was learned**: {key insight}
**What was surprising**: {unexpected finding or "Nothing unexpected"}
**Conventions established**: {new rules/patterns or "None"}
**Tags**: {comma-separated: area, technology, pattern-type}
**Files affected**: {key file paths, max 5}

---
```

Use today's date. Derive the title from the task summary — keep it scannable and searchable.

### Step 4: Persist to learnings.md

1. Check if `learnings.md` exists in the project root
2. If it does NOT exist, create it with this header:

```markdown
# Project Learnings

Captured knowledge from engineering work. Newest entries first.
Search by tags, dates, or keywords to find relevant past learnings.

---

```

3. **Prepend** the new entry after the header (newest first)
4. Use Read to verify the file before editing — never overwrite existing entries

### Step 5: Persist to Engram (if available)

If engram MCP tools are available, save the learning for cross-session retrieval:

```
mem_save(
  title: "learning: {descriptive title}",
  topic_key: "learnings/{project}/{slug}",
  type: "learning",
  project: "{project}",
  content: "{the full learning entry markdown}"
)
```

If engram is not available, skip this step silently. The learnings.md file is the primary artifact.

### Step 6: Suggest CLAUDE.md Improvements

Analyze the captured learning and determine if it implies a CLAUDE.md change:

| Learning Type | CLAUDE.md Action |
|--------------|-----------------|
| New convention established | Suggest adding to Rules or Path-Scoped Rules |
| Recurring gotcha discovered | Suggest adding to a Gotchas/Pitfalls section |
| New tool/pattern adopted | Suggest adding to Expertise or Skills table |
| Architecture decision made | Suggest adding to project-specific instructions |
| Nothing actionable | Say "No CLAUDE.md changes suggested" |

**Output format:**

```
### Suggested CLAUDE.md Improvement

**Section**: {where it should go, e.g., "## Rules", "## Path-Scoped Rules"}
**Addition**:
{the exact text to add}

**Rationale**: {why this helps future sessions}
```

**NEVER auto-edit CLAUDE.md.** Always present the suggestion and let the user decide. CLAUDE.md changes affect all future AI behavior — the user must review and approve.

### Step 7: Output Summary

```
Compound loop complete.

Learning captured:
- Title: {title}
- Tags: {tags}
- File: learnings.md (entry prepended)
- Engram: {saved / not available}

CLAUDE.md: {suggestion presented / no changes suggested}

Ready for the next cycle: Brainstorm --> Plan --> Work --> Review --> Compound
```

---

## Learning Entry Examples

### Bug Fix Example

```markdown
## [2026-03-31] Race condition in auth token refresh

**What was done**: Fixed a race condition where multiple concurrent requests would each trigger a token refresh, causing 401 cascades.
**What was learned**: Token refresh must use a mutex/lock pattern — queue concurrent requests behind a single refresh call, then replay them with the new token.
**What was surprising**: The issue only manifested under HTTP/2 multiplexing. HTTP/1.1 connection limits accidentally serialized requests enough to hide the race.
**Conventions established**: All auth interceptors must use a refresh lock. Added to shared http-client config.
**Tags**: auth, race-condition, http-client, interceptor
**Files affected**: src/lib/http-client.ts, src/auth/refresh-lock.ts

---
```

### Convention Example

```markdown
## [2026-03-31] Adopted container-presentational pattern for dashboards

**What was done**: Refactored the analytics dashboard to separate data fetching (container) from rendering (presentational components).
**What was learned**: Container components own the data lifecycle. Presentational components receive props only — no hooks, no side effects.
**What was surprising**: Nothing unexpected.
**Conventions established**: All dashboard pages follow container-presentational. Containers in `containers/`, presentational in `components/`.
**Tags**: architecture, react, container-presentational, dashboard
**Files affected**: src/pages/analytics/container.tsx, src/components/analytics/chart.tsx

---
```

---

## Critical Rules

1. **NEVER auto-edit CLAUDE.md** — always present suggestions for user approval
2. **NEVER overwrite existing learnings.md entries** — always prepend new entries
3. **NEVER activate for trivial changes** — the signal-to-noise ratio matters
4. **ALWAYS use today's date** in the entry header
5. **ALWAYS include tags** — they enable searching across learnings
6. **ALWAYS gather context from conversation history** before prompting the user
7. **Keep entries concise** — each field should be 1-3 sentences max
8. **Prepend, never append** — newest learnings first for quick scanning
