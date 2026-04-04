---
name: project-memory
description: >
  Auto-generates CLAUDE.md capturing project knowledge, flags irreversible decisions (one-way-door), and generates LESSONS.md retrospectives.
  Trigger: When onboarding to a project, after major changes, user says "generate CLAUDE.md", "capture learnings", "one-way door", or "retrospective".
metadata:
  author: javi-ai
  version: "1.0"
  tags: [memory, documentation, knowledge, retrospective]
  category: workflow
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

## Purpose

Three capabilities for project-level knowledge management:
1. **Auto-generate CLAUDE.md** from codebase analysis
2. **One-way-door hook** that flags irreversible decisions
3. **Project retrospective** that generates LESSONS.md

---

## Capability 1: Auto-Generate CLAUDE.md

Analyze the codebase and generate a project-specific CLAUDE.md:

### Analysis Steps

1. **Detect stack** — package.json, go.mod, Cargo.toml, etc.
2. **Map structure** — key directories, entry points, config files
3. **Extract conventions** — naming patterns, file organization, test patterns
4. **Find existing docs** — README, CONTRIBUTING, ADRs
5. **Identify tools** — linters, formatters, test runners, CI

### Generated CLAUDE.md Structure

```markdown
# CLAUDE.md — Auto-generated project context

## Project
- Name: [from package.json/go.mod]
- Stack: [detected]
- Entry: [main file]

## Conventions
- [detected naming convention]
- [detected test pattern]
- [detected commit convention]

## Commands
- Build: [detected]
- Test: [detected]
- Lint: [detected]

## Architecture
- [key module descriptions]

## Rules
- [project-specific rules extracted from existing docs]
```

### Update Protocol

Re-run generation when:
- New module added
- Major dependency change
- Architecture change
- User explicitly requests update

Always **merge** with existing CLAUDE.md (don't overwrite custom sections).

---

## Capability 2: One-Way-Door Hook

Flag decisions that are hard or impossible to reverse:

### One-Way-Door Examples

| Decision | Reversibility | Action |
|----------|--------------|--------|
| Database schema migration (destructive) | Hard | BLOCK — require explicit confirmation |
| npm publish | Impossible | BLOCK — versions can't be unpublished after 72h |
| Deleting git branches with unmerged work | Hard | WARN — show unmerged commits |
| Changing public API contract | Hard | WARN — show consumers |
| Dropping a database table | Impossible | BLOCK — require backup proof |
| Switching auth provider | Hard | WARN — show migration complexity |

### Detection

Before committing, check for:

```
1. Migration files with DROP, ALTER (destructive)
2. Public API signature changes (breaking)
3. Config changes to auth/payment/identity providers
4. Deletion of data stores or collections
5. Changes to encryption keys or algorithms
```

### Output

```
## One-Way-Door Alert

This change contains irreversible operations:

1. [DESTRUCTIVE] migrations/003_drop_legacy_users.sql
   - Drops table `legacy_users` (1.2M rows)
   - Suggestion: Create backup first: pg_dump -t legacy_users > backup.sql

2. [BREAKING] src/api/v2/users.ts
   - Removes `GET /api/v2/users/:id/legacy` endpoint
   - 3 known consumers in frontend

Proceed? (y/N)
```

---

## Capability 3: Project Retrospective

Generate LESSONS.md documenting what worked and what didn't:

### Trigger

- After completing a significant feature
- After resolving a complex bug
- End of sprint/milestone
- User asks for "retrospective" or "lessons learned"

### Generated LESSONS.md Structure

```markdown
# LESSONS.md — Project Retrospective

## Session: [date] — [feature/fix name]

### What Worked
- [approach that succeeded]
- [tool/pattern that helped]

### What Didn't Work
- [approach that failed and why]
- [time wasted on wrong path]

### Key Decisions
- [decision]: [why] — [outcome]

### For Next Time
- [actionable improvement]
- [thing to do differently]

### Metrics
- Time spent: [estimate]
- Files changed: [count]
- Tests added: [count]
```

### Rules for Retrospectives

1. Be specific — "tests helped" is useless, "testing the auth middleware caught the token expiry bug" is useful
2. Include the failed approaches — they save time for future sessions
3. Reference files and line numbers — not just concepts
4. Save key findings to Engram — cross-project learning

---

## Capability 4: Polyhierarchy

The same note or observation can belong to multiple contexts simultaneously without duplication.

### When to Apply

Use polyhierarchy when a piece of knowledge is genuinely relevant to multiple domains:
- A bug fix that affects both security and performance
- An architectural decision that spans frontend and backend
- A convention that applies to multiple projects

### How It Works

Instead of duplicating the content, create ONE canonical observation with multiple topic keys in the `contexts` metadata field:

```
mem_save(
  title: "canonical title",
  topic_key: "primary/context",          ← primary key for recovery
  type: "architecture",
  project: "project-name",
  content: "the actual content",
  metadata: {
    contexts: ["primary/context", "secondary/context", "tertiary/context"]
  }
)
```

When searching any of the listed contexts, the same observation surfaces — no copies, no drift.

### Retrieval

When loading context for a specific domain, search both the primary topic_key AND any secondary context that might hold cross-cutting observations:

```
mem_search(query: "primary/context", project: "x")    ← direct hit
mem_search(query: "secondary/context", project: "x")  ← also surfaces the same obs
```

### Rules for Polyhierarchy

1. **One source of truth** — never duplicate. If the same fact belongs in two places, use contexts[], not two saves.
2. **Primary context = most specific** — choose the most precise topic_key as primary for targeted recovery.
3. **Max 4 contexts per observation** — beyond that, the observation is too broad and should be split.
4. **Update in one place** — updating the primary observation updates all contexts automatically.

---

## Rules

1. **Never overwrite custom CLAUDE.md sections** — merge, don't replace
2. **One-way-door is a warning, not a veto** — user decides after seeing the alert
3. **Retrospectives are honest** — include what went wrong, not just what went right
4. **Save to Engram** — all four capabilities should persist across sessions
5. **Polyhierarchy over duplication** — one observation, multiple contexts
