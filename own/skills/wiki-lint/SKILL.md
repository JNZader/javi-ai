---
name: wiki-lint
description: >
  Detect knowledge base health issues in an Obsidian vault — orphan notes, dead wikilinks, missing backlinks,
  duplicate entities, uncategorized notes, and stale content.
  Trigger: When auditing vault health, cleaning up notes, or user says "wiki lint", "vault health", "orphan notes".
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
  source: AgriciDaniel/claude-obsidian
---

# Wiki Lint

Detect structural health issues in an Obsidian vault. Surfaces orphans, dead links, duplicates, and stale content so the vault stays navigable and trustworthy.

---

## Core Principle

A knowledge base degrades silently. Notes accumulate without links, concepts fragment across duplicates, and stale content misleads. Wiki-lint runs a structured audit and produces an actionable health report — fix the issues or accept them consciously.

---

## Health Checks

### 1. Orphan Notes

Notes with **zero incoming links** from other notes. These are invisible to graph navigation.

**Detection**:
- Scan all `.md` files in the vault
- Build an incoming-link index: for every `[[Target]]` or `[[Target|alias]]`, record `Target` as having an incoming link
- Notes with zero entries in the incoming-link index are orphans
- **Exclude** from orphan detection: daily notes (`YYYY-MM-DD.md`), templates folder, `_index.md`, README, and any path matching `exclude_patterns` in config

**Output**:
```markdown
## Orphan Notes (no incoming links)
| Note | Folder | Last Modified | Tags |
|------|--------|---------------|------|
| [[Forgotten Idea]] | inbox/ | 2025-03-01 | #fleeting |
```

### 2. Dead Wikilinks

Links pointing to notes that **do not exist** in the vault.

**Detection**:
- Extract all `[[Target]]` references from every note
- Normalize targets: strip heading anchors (`[[Note#Section]]` → `Note`), strip aliases (`[[Note|display]]` → `Note`)
- Check if `Target.md` exists at any path in the vault (Obsidian resolves shortest path)
- Links to non-existent notes are dead

**Output**:
```markdown
## Dead Wikilinks
| Source Note | Dead Link | Line |
|-------------|-----------|------|
| [[Project Plan]] | [[Deprecated API]] | 42 |
```

### 3. Missing Backlinks

Asymmetric links: Note A links to Note B, but Note B does not link back to Note A. Not always a problem, but flags potential navigation gaps.

**Detection**:
- Build a directed link graph from all `[[wikilinks]]`
- For each edge A→B, check if B→A exists
- Report unidirectional links, sorted by note with most missing backlinks

**Output**:
```markdown
## Missing Backlinks
| Note | Links To | But No Backlink From |
|------|----------|---------------------|
| [[Architecture]] | [[Clean Code]] | [[Clean Code]] → [[Architecture]] missing |
```

### 4. Duplicate Entities

Multiple notes about the **same concept** — detected by title similarity and content overlap.

**Detection**:
- Normalize titles: lowercase, strip punctuation, collapse whitespace
- Flag exact matches after normalization (e.g., `React Hooks` vs `react-hooks`)
- Flag titles where one is a substring of the other (e.g., `JWT` and `JWT Authentication`)
- Check aliases in YAML frontmatter — if Note A's alias matches Note B's title, flag as potential duplicate

**Output**:
```markdown
## Potential Duplicates
| Note A | Note B | Reason |
|--------|--------|--------|
| [[JWT]] | [[JWT Authentication]] | Substring match |
| [[React Hooks]] | [[react-hooks]] | Normalized title match |
```

### 5. Uncategorized Notes

Notes with **no tags and no meaningful folder placement** (sitting in vault root or inbox).

**Detection**:
- No tags in frontmatter or inline (`#tag`)
- Located in vault root or a designated "inbox" folder
- No `category`, `type`, or `MOC` property in frontmatter

**Output**:
```markdown
## Uncategorized Notes
| Note | Location | Created |
|------|----------|---------|
| [[Random Thought]] | / | 2025-01-15 |
```

### 6. Stale Content

Notes not modified in more than **N days** (default: 90). Configurable threshold.

**Detection**:
- Check file modification date
- Compare against `stale_days` config (default: 90)
- Exclude daily notes and archived folders from stale check

**Output**:
```markdown
## Stale Notes (>90 days)
| Note | Last Modified | Days Stale | Links In |
|------|---------------|------------|----------|
| [[Old API Docs]] | 2024-06-01 | 310 | 5 |
```

---

## Execution Steps

1. **Locate vault**: Accept vault path as input or detect from current directory (look for `.obsidian/` folder)
2. **Scan all `.md` files**: Build file index with paths, modification dates, frontmatter
3. **Parse wikilinks**: Extract all `[[Target]]` references, build link graph
4. **Run all 6 checks** in order
5. **Generate health report**: Combine all findings into a single structured report
6. **Calculate health score**: Percentage of notes passing all checks

---

## Health Report Format

```markdown
# Vault Health Report

> Generated: {DATE}
> Vault: {path}
> Total Notes: {count}

## Health Score: {X}%

| Check | Issues | Severity |
|-------|--------|----------|
| Orphan Notes | {count} | ⚠️ Medium |
| Dead Wikilinks | {count} | 🔴 High |
| Missing Backlinks | {count} | ℹ️ Low |
| Duplicate Entities | {count} | ⚠️ Medium |
| Uncategorized Notes | {count} | ℹ️ Low |
| Stale Content | {count} | ℹ️ Low |

{detailed sections for each check}

## Recommended Actions
1. {highest priority fix}
2. {second priority fix}
...
```

---

## Configuration

Accept configuration via frontmatter in a `wiki-lint-config.md` note or as parameters:

```yaml
wiki-lint:
  stale_days: 90
  exclude_patterns:
    - "templates/"
    - "daily/"
    - "archive/"
  ignore_orphans:
    - "README"
    - "Home"
  severity_overrides:
    missing_backlinks: ignore  # ignore | low | medium | high
```

---

## Severity Levels

| Severity | Meaning | Action |
|----------|---------|--------|
| 🔴 High | Broken structure — dead links confuse readers and AI | Fix immediately |
| ⚠️ Medium | Degraded navigability — orphans and duplicates fragment knowledge | Fix in next review |
| ℹ️ Low | Informational — stale or uncategorized notes need triage | Review periodically |

---

## Anti-Patterns

1. **Treating all orphans as bad** — Index notes and MOCs are often intentionally not linked to. Use `ignore_orphans` config.
2. **Auto-fixing dead links** — Deleting dead links loses intent. Report them, let the human decide.
3. **Running without exclusions** — Templates and daily notes produce noise. Always configure `exclude_patterns`.
4. **Ignoring stale content** — Stale notes with many incoming links are especially dangerous — they spread outdated info.
5. **One-time audit** — Schedule periodic linting (weekly or monthly) to prevent drift.

---

## Integration with Other Skills

- **auto-wikilink** (skill): Run wiki-lint FIRST to find dead links, then auto-wikilink to fix missing connections
- **obsidian-consolidation** (skill): Use orphan list as input for consolidation — orphans are candidates for merging
- **contradiction-detector** (skill): Feed duplicate entities into contradiction detection — duplicates often carry conflicting info

---

## Critical Rules

1. NEVER modify vault notes during linting — this is a read-only audit
2. ALWAYS normalize wikilink targets before comparison (case-insensitive, strip anchors and aliases)
3. ALWAYS exclude configured patterns before reporting issues
4. ALWAYS sort results by severity (high → low) in the health report
5. NEVER flag daily notes or templates as orphans unless explicitly configured
6. ALWAYS include the health score as a single trackable metric
