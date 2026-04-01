---
name: knowledge-graph
description: >
  Maintain markdown-based codebase knowledge graphs with [[wiki links]] and navigable engram relationship linking.
  Trigger: When documenting codebase architecture, linking related concepts, auditing knowledge consistency, or building structural memory beyond session-level.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

# Knowledge Graph

Structural codebase knowledge that survives across sessions. Separate from engram (session memory) — this is **architectural knowledge**: module responsibilities, conventions, decisions, and their relationships.

---

## When to Use

- Documenting module responsibilities and how they connect
- Recording architectural decisions with cross-references to affected modules
- Creating navigable relationship chains in engram observations
- Auditing knowledge consistency (dead links, orphan concepts)
- Onboarding to a codebase with structured concept maps

---

## Core Principle

```
Session Memory (engram)  = WHAT happened (decisions, bugs, discoveries)
Knowledge Graph          = HOW things relate (modules, conventions, dependencies)
```

Engram answers "what did we decide?". Knowledge graph answers "what depends on what and why?".

---

## Critical Patterns

### Pattern 1: Markdown Knowledge Graph

Store codebase concepts as markdown files in `.knowledge/` with `[[wiki links]]` for cross-references.

```
.knowledge/
  _index.md              # Master index of all concepts
  auth/
    jwt-middleware.md     # [[auth/session-store]], [[api/rate-limiter]]
    session-store.md      # [[auth/jwt-middleware]], [[db/redis-config]]
  api/
    rate-limiter.md       # [[auth/jwt-middleware]]
  db/
    redis-config.md       # [[auth/session-store]]
```

#### Entry Template

```markdown
# {Concept Name}

**Domain**: {domain}
**Type**: module | convention | decision | pattern
**Related**: [[domain/concept-a]], [[domain/concept-b]]
**Engram**: kg/{domain}/{concept-slug}

## Description

{What this concept IS and WHY it exists. 2-3 sentences max.}

## Relationships

- **depends-on**: [[domain/concept-x]] — {why}
- **used-by**: [[domain/concept-y]] — {how}
- **supersedes**: [[domain/old-concept]] — {migration note, if any}

## Conventions

{Key rules agents MUST follow when working with this concept.}

## Gotchas

{Non-obvious constraints or traps. Things that waste time if unknown.}
```

### Pattern 2: Engram Relationship Linking

Use hierarchical topic keys to create navigable graphs in engram:

```
kg/{domain}/{concept}              — concept entry
kg/{domain}/{concept}/decision     — architectural decision
kg/{domain}/{concept}/gotcha       — known gotcha
kg/{domain}/{concept}/convention   — coding convention
kg/_index                          — master index
```

#### Linking Protocol

When saving to engram, embed explicit `**Links**` in content:

```
mem_save(
  title: "kg/auth/jwt-middleware",
  topic_key: "kg/auth/jwt-middleware",
  type: "architecture",
  project: "{project}",
  content: "**What**: JWT middleware validates tokens on all /api/* routes
**Type**: module
**Links**: [[kg/auth/session-store]], [[kg/api/rate-limiter]]
**Where**: src/middleware/auth.ts
**Conventions**: Always call next() after validation, never throw directly"
)
```

To follow links: `mem_search(query: "kg/auth/session-store")` then `mem_get_observation(id)`.

### Pattern 3: Consistency Checks

Run these audits periodically or before major changes:

| Check | How | Fix |
|-------|-----|-----|
| Dead links | Scan `[[links]]`, verify target exists | Create missing entry or remove link |
| Orphan concepts | Find entries with zero incoming links | Connect to related concepts or archive |
| Stale entries | Check if referenced files still exist | Update paths or mark as deprecated |
| Duplicate concepts | Search for similar names/descriptions | Merge into canonical entry |

---

## Decision Tree

```
Need to document a module?           -> Create knowledge graph entry
Need to record a decision?           -> Create entry + link to affected modules
Need to find related concepts?       -> Follow [[wiki links]] or mem_search kg/{domain}
Need to audit knowledge?             -> Run consistency checks
Need quick session note?             -> Use session-memory, NOT knowledge graph
Need to capture a fleeting thought?  -> Use obsidian-braindump, NOT knowledge graph
```

---

## Commands

```bash
# Create new concept entry
# Agent creates .knowledge/{domain}/{concept}.md following template

# Link concepts in engram
# mem_save with topic_key: "kg/{domain}/{concept}" and **Links** in content

# Audit dead links
# Scan all .knowledge/**/*.md for [[links]], verify each target file exists

# Find orphans
# List all .knowledge/**/*.md, find entries not referenced by any other entry

# Search related concepts
# mem_search(query: "kg/{domain}", project: "{project}")
```

---

## Integration with Other Skills

| Skill | Integration |
|-------|------------|
| session-memory | Session = working memory, KG = structural memory. Promote important session discoveries to KG entries. |
| codebase-cartography | Codemap = file structure overview. KG = semantic concept relationships. KG entries can reference codemap regions. |
| obsidian-braindump | Braindump = quick capture. KG = structured knowledge. Consolidate braindumps into KG entries. |
| sdd-explore | During exploration, create KG entries for discovered architectural concepts. |
| engram | KG uses engram as persistent backend via `kg/` topic key prefix. |

---

## Resources

- **Code Examples**: See [references/code-examples.md](references/code-examples.md) for engram linking patterns and wiki link syntax
- **Prompt Templates**: See [references/prompt-templates.md](references/prompt-templates.md) for graph operations
