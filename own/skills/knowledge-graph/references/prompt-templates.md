# Knowledge Graph — Prompt Templates

Reusable prompts for AI agents performing knowledge graph operations.

---

## 1. Create Concept Entry

```
You are documenting a codebase concept for the knowledge graph.

CONCEPT: {concept name}
DOMAIN: {domain}
FILES: {relevant file paths}

Create a knowledge graph entry following this template:

# {Concept Name}
**Domain**: {domain}
**Type**: module | convention | decision | pattern
**Related**: [[links to related concepts]]
**Engram**: kg/{domain}/{concept-slug}

## Description
{2-3 sentences: what it IS and WHY it exists}

## Relationships
- **depends-on**: [[concept]] — {why}
- **used-by**: [[concept]] — {how}

## Conventions
{Key rules for working with this concept}

## Gotchas
{Non-obvious traps}

RULES:
- Keep description under 3 sentences
- Every relationship MUST have a reason (the "why")
- Conventions are rules, not descriptions — use imperative voice
- Gotchas must be specific and actionable, not generic warnings
```

---

## 2. Link Related Observations

```
You are linking engram observations to build a navigable knowledge graph.

OBSERVATION just saved: {topic_key}
CONTENT: {brief summary}

Search engram for related observations:
1. mem_search(query: "kg/{domain}", project: "{project}")
2. For each result, check if it's genuinely related (not just same domain)
3. Update the new observation's **Links** to reference related ones
4. Update related observations to back-link to the new one

RULES:
- Only link genuinely related concepts — not everything in the same domain
- Always create bidirectional links (A links to B AND B links to A)
- Use mem_update to add back-links to existing observations
```

---

## 3. Audit Knowledge Graph

```
You are auditing the knowledge graph for consistency.

PROJECT: {project}
GRAPH LOCATION: .knowledge/ (markdown) and kg/* (engram)

Perform these checks IN ORDER:

1. DEAD LINKS: Scan .knowledge/**/*.md for [[links]] pointing to non-existent files
2. ORPHANS: Find entries with zero incoming links (not referenced by anyone)
3. STALE PATHS: Check if **Where** file paths in entries still exist in the codebase
4. ENGRAM SYNC: Verify each .knowledge entry has a matching kg/ engram observation

Report format:
## Audit Results

### Dead Links ({count})
| Source | Broken Link | Suggested Fix |
|--------|------------|---------------|

### Orphans ({count})
| Entry | Suggested Fix |
|-------|---------------|

### Stale Paths ({count})
| Entry | Old Path | Status |
|-------|----------|--------|

### Engram Sync ({count} missing)
| Entry | Missing In |
|-------|-----------|

RULES:
- Do NOT auto-fix — report findings for human review
- Suggest specific fixes, not generic "update this"
- _index.md is excluded from orphan detection
```

---

## 4. Promote Discovery to Knowledge Graph

```
You completed a task and discovered something non-obvious about the codebase.

DISCOVERY: {what you found}
CONTEXT: {what you were doing}
FILES: {affected files}

Decide if this should be promoted to the knowledge graph:

Is this STRUCTURAL knowledge?
├── YES (module responsibility, convention, dependency) → Promote to KG
└── NO (one-time bug, session decision, personal preference) → Keep in engram only

If promoting:
1. Check if a related .knowledge entry already exists
2. If YES → Add to existing entry's Conventions or Gotchas section
3. If NO → Create new entry following the concept template
4. Save/update the engram observation with kg/ topic key
5. Update [[wiki links]] in related entries

RULES:
- Not every discovery deserves a KG entry — be selective
- Prefer adding to existing entries over creating new ones
- Always link back to the originating engram observation
```

---

## 5. Onboard to Codebase via Knowledge Graph

```
You are starting work on an unfamiliar part of the codebase.

AREA: {domain or module}

Before writing any code:
1. mem_search(query: "kg/{domain}", project: "{project}") — find existing knowledge
2. For each result: mem_get_observation(id) — read full content
3. Follow [[links]] to understand relationships
4. Check .knowledge/{domain}/ for markdown entries
5. Read _index.md for the full concept map

Build a mental model:
- What are the key modules?
- What depends on what?
- What conventions MUST I follow?
- What gotchas should I avoid?

If knowledge is sparse or missing:
- Flag it: "Knowledge gap found for {domain}"
- After completing your task, create/update KG entries for what you learned
```
