---
name: contradiction-detector
description: >
  Detect contradictions when synthesizing or consolidating notes. Flags factual disagreements,
  date conflicts, and outdated info with [!contradiction] callouts.
  Trigger: When consolidating notes, merging knowledge, or user says "find contradictions", "check conflicts", "contradiction scan".
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
  source: AgriciDaniel/claude-obsidian
---

# Contradiction Detector

Flag contradictions when synthesizing information from multiple notes. When two sources disagree, surface them explicitly so the human resolves them — never silently pick a winner.

---

## Core Principle

Knowledge bases accumulate contradictions over time. A note from January says "use REST", a note from June says "migrate to GraphQL". Both are true in their context but contradict each other if read without dates. The Contradiction Detector surfaces these conflicts explicitly using `[!contradiction]` callouts so synthesis products are trustworthy.

---

## Contradiction Types

### 1. Factual Disagreements

Two notes make incompatible claims about the same subject.

**Detection**:
- Identify shared entities or topics across notes (same tags, same wikilinks, same subject headings)
- Extract factual claims: definitions, specifications, quantities, statuses
- Compare claims about the same entity — if they differ, flag as contradiction

**Examples**:
- Note A: "The API rate limit is 100 req/s" vs Note B: "Rate limit: 50 req/s"
- Note A: "We use PostgreSQL" vs Note B: "Database: MySQL"

### 2. Date/Timeline Conflicts

Events or decisions placed at incompatible points in time.

**Detection**:
- Extract dates and temporal markers ("before X", "after migrating to Y", "in Q2 2025")
- Build a timeline of events per topic
- Flag when the same event has conflicting dates or when temporal ordering is impossible

**Examples**:
- Note A: "Migrated to v2 in March" vs Note B: "v2 migration planned for Q4"
- Note A: "Deprecated in 2024" vs Note B: "Added support in 2025" (for the same feature)

### 3. Outdated Information

A newer note supersedes an older one, but the older note is still referenced.

**Detection**:
- Compare notes about the same topic with different modification dates
- If the newer note explicitly contradicts or updates the older one, flag the older as potentially outdated
- Check if the older note has incoming links — if yes, those links may be spreading stale info

**Examples**:
- Note from 2024: "Auth uses JWT tokens" → Note from 2025: "Migrated auth to OAuth2"
- Note from January: "Team size: 5" → Note from June: "Team grew to 12"

### 4. Definition Drift

The same term is defined differently in different contexts.

**Detection**:
- Find notes that define the same concept (shared title words, aliases, or explicit "definition" sections)
- Compare definitions — if they differ in substance (not just phrasing), flag as definition drift

**Examples**:
- Glossary note: "SLA = 99.9% uptime" vs Architecture note: "Our SLA target is 99.95%"
- Style guide: "Components use PascalCase" vs Onboarding doc: "Name components with kebab-case"

---

## Detection Process

### Step 1: Scope Selection

Accept input as:
- A list of specific notes to compare
- A tag or folder to scan (e.g., all notes tagged `#architecture`)
- A topic query (e.g., "everything about authentication")
- Entire vault (expensive — warn the user)

### Step 2: Claim Extraction

For each note in scope:
1. Parse the note content into sections
2. Extract explicit claims — statements of fact, decisions, specifications
3. Tag each claim with: `source_note`, `section`, `date` (from frontmatter or inline), `confidence`
4. Normalize claims for comparison (lowercase entities, resolve aliases)

### Step 3: Cross-Reference

Compare claims across notes:
1. Group claims by topic/entity
2. For each group, identify pairs that conflict
3. Score conflict severity: `definite` (mutually exclusive), `likely` (different but possibly compatible), `possible` (ambiguous phrasing)

### Step 4: Report Generation

Produce a structured contradiction report with `[!contradiction]` callouts.

---

## Output Format

### Inline Callouts (for note synthesis)

When producing a synthesized note, embed contradictions inline:

```markdown
## Authentication

The system uses OAuth2 for authentication.

> [!contradiction] Conflicting sources
> - [[Auth Design Doc]] (2025-06): "OAuth2 with PKCE flow"
> - [[API Spec v1]] (2024-11): "JWT bearer tokens"
> - **Resolution needed**: Which is current? Check with the auth team.
```

### Standalone Contradiction Report

When scanning a set of notes, produce a full report:

```markdown
# Contradiction Report

> Generated: {DATE}
> Scope: {notes/tags/folder scanned}
> Notes Analyzed: {count}
> Contradictions Found: {count}

## Summary

| Severity | Count | Type |
|----------|-------|------|
| 🔴 Definite | {n} | Mutually exclusive claims |
| ⚠️ Likely | {n} | Different claims, probably conflicting |
| ℹ️ Possible | {n} | Ambiguous, needs human review |

## Contradictions

### 1. {Topic}: {Brief description}

**Severity**: 🔴 Definite
**Type**: Factual Disagreement

| Source | Claim | Date |
|--------|-------|------|
| [[Note A]] | "Rate limit is 100 req/s" | 2025-01-15 |
| [[Note B]] | "Rate limit is 50 req/s" | 2025-06-20 |

**Suggested Resolution**: Note B is newer — verify if the limit was changed. Update the older note or mark it as superseded.

---

### 2. {Topic}: {Brief description}
...

## Recommended Actions

1. {Highest priority contradiction to resolve}
2. {Second priority}
...
```

---

## Resolution Strategies

When contradictions are found, suggest one of these resolution strategies:

| Strategy | When to Use | Action |
|----------|-------------|--------|
| **Supersede** | Newer note clearly updates older | Mark older note as `[outdated]`, link to newer |
| **Merge** | Both notes have partial truth | Create a single authoritative note |
| **Contextualize** | Both are true in different contexts | Add context markers (e.g., "In v1..." vs "In v2...") |
| **Escalate** | Cannot determine which is correct | Flag for human review, add `[!contradiction]` callout |
| **Archive** | Older note is fully obsolete | Move to archive folder, remove incoming links |

---

## Configuration

```yaml
contradiction-detector:
  severity_threshold: likely  # possible | likely | definite — minimum severity to report
  scope: tags                 # notes | tags | folder | vault
  scope_value: "#architecture"
  include_outdated: true      # flag outdated info as contradictions
  date_weight: high           # how much to trust newer notes over older
  output: report              # report | inline | both
```

---

## Integration with Other Skills

- **obsidian-consolidation**: Run contradiction detection DURING consolidation to prevent merging conflicting info
- **wiki-lint**: Duplicate entities from wiki-lint are prime candidates for contradiction scanning
- **auto-wikilink**: After resolving contradictions, auto-wikilink can connect the authoritative notes

---

## Anti-Patterns

1. **Auto-resolving contradictions** — NEVER silently pick one version. Always surface the conflict for human decision.
2. **Ignoring dates** — Temporal context is critical. A claim from 2024 vs 2025 is likely an update, not an error.
3. **Scanning the entire vault** — Start with a focused scope (tag, folder, topic). Full vault scans are noisy and expensive.
4. **Treating all disagreements as contradictions** — Different perspectives on the same topic are not contradictions. Only flag when claims are mutually exclusive or factually incompatible.
5. **One-shot analysis** — Run contradiction detection as part of every consolidation, not as a one-time cleanup.

---

## Critical Rules

1. NEVER auto-resolve contradictions — always surface them for human review
2. ALWAYS include source notes, dates, and specific quotes in contradiction reports
3. ALWAYS use `[!contradiction]` callout format for Obsidian compatibility
4. ALWAYS suggest a resolution strategy for each contradiction
5. ALWAYS consider temporal context — newer notes may intentionally supersede older ones
6. NEVER flag stylistic differences as contradictions — only factual, definitional, or temporal conflicts
7. ALWAYS group contradictions by topic for easier triage
