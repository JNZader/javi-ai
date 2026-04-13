---
name: auto-wikilink
description: >
  Process markdown notes to auto-insert [[wikilinks]] for key concepts and create stub concept notes.
  Trigger: When linking notes, extracting concepts, or user says "auto wikilink", "link concepts", "extract entities".
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
  source: Jacobinwwey/obsidian-NotEMD
  depends_on: wiki-lint
---

# Auto Wikilink

Process markdown notes to automatically insert `[[wikilinks]]` for recognized concepts, entities, and technical terms. Optionally creates stub notes for newly discovered concepts. Preserves existing formatting and avoids over-linking.

---

## Core Principle

Manual wikilinking is tedious and inconsistent. Auto-wikilink scans note content, identifies key concepts that match existing notes or known entities, and inserts `[[wikilinks]]` without disrupting formatting. The goal is a well-connected knowledge graph — not maximum link density.

---

## Processing Pipeline

### Step 1: Build Concept Index

Before linking, build an index of known concepts from the vault:

1. **Existing notes**: Every `.md` file title is a linkable concept
2. **Aliases**: Frontmatter `aliases` field provides alternate names for the same note
3. **Tags as concepts**: Notes tagged with common tags share a concept namespace
4. **Custom dictionary**: Optional `wikilink-dictionary.md` note with additional terms to recognize

```yaml
# Example concept index entry
- canonical: "Clean Architecture"
  aliases: ["clean arch", "hexagonal architecture", "ports and adapters"]
  note_exists: true
  path: "architecture/Clean Architecture.md"
```

### Step 2: Smart Chunking

For large documents, process in chunks to maintain context without overwhelming:

1. Split by heading sections (h2 or h3 boundaries)
2. Each chunk retains its heading hierarchy for context
3. Process chunks independently but deduplicate links across chunks
4. **First-mention rule**: Only wikilink the first occurrence of a concept per section (not per sentence)

### Step 3: Entity Detection

Identify linkable entities in the text:

**Always link**:
- Exact matches to existing note titles (case-insensitive)
- Exact matches to note aliases
- Terms from the custom dictionary

**Detect and suggest**:
- Technical terms: CamelCase words, acronyms (3+ uppercase letters), terms with special characters (`API`, `REST`, `OAuth2`)
- Proper nouns: Capitalized multi-word phrases not at sentence start
- Domain terms: Words that appear in multiple notes as key concepts

**Never link**:
- Common English words (the, is, with, etc.)
- Single-character words or numbers alone
- Words inside existing `[[wikilinks]]`, code blocks, or URLs
- Words inside YAML frontmatter
- Image alt text or embed syntax (`![[...]]`)

### Step 4: Link Insertion

Insert `[[wikilinks]]` following these rules:

1. **Exact match**: `Clean Architecture` → `[[Clean Architecture]]`
2. **Alias match**: `ports and adapters` → `[[Clean Architecture|ports and adapters]]`
3. **Plural/variant**: `components` when `Component` note exists → `[[Component|components]]` (preserve original casing in display)
4. **No nested links**: Never create `[[link inside [[another]] link]]`
5. **Preserve formatting**: If the term is bold or italic, keep the formatting: `**[[Clean Architecture]]**`

### Step 5: Stub Note Creation (Optional)

When a detected entity has no matching note:

1. Ask the user before creating stubs (never auto-create without consent)
2. Stub format:

```markdown
---
aliases: []
tags: [stub, concept]
created: {DATE}
---

# {Concept Name}

> [!stub] This note was auto-generated
> Fill in the definition and context for this concept.

## Related
- {backlink to source note}
```

3. Place stubs in a configurable folder (default: `concepts/`)
4. Report all created stubs in the output

---

## Execution Steps

1. **Pre-flight**: Run wiki-lint dead link check to ensure current link health
2. **Build concept index** from vault contents
3. **Select target notes**: Accept a single note, folder, or tag as scope
4. **For each target note**:
   a. Parse content, identify protected zones (code blocks, frontmatter, existing links, URLs)
   b. Chunk by sections
   c. Detect entities in each chunk
   d. Insert wikilinks (first-mention-per-section rule)
   e. Validate: ensure no broken formatting, no nested links
5. **Generate report** with all changes made
6. **Optionally create stub notes** for unmatched entities

---

## Output Format

### Change Report

```markdown
# Auto-Wikilink Report

> Generated: {DATE}
> Scope: {notes processed}
> Links Inserted: {count}
> Stubs Created: {count}

## Changes Per Note

### [[Note Title]]
| Term | Linked To | Type | Line |
|------|-----------|------|------|
| Clean Architecture | [[Clean Architecture]] | Exact match | 15 |
| ports and adapters | [[Clean Architecture\|ports and adapters]] | Alias match | 23 |
| OAuth2 | [[OAuth2]] (stub created) | New concept | 41 |

### [[Another Note]]
...

## Stub Notes Created
| Stub | Created In | Referenced By |
|------|------------|---------------|
| [[OAuth2]] | concepts/ | [[Auth Design]], [[API Spec]] |

## Skipped Terms
| Term | Reason |
|------|--------|
| API | Too common, would over-link |
| the system | Common phrase |
```

---

## Protected Zones

NEVER insert wikilinks inside these regions:

| Zone | Detection |
|------|-----------|
| Code blocks | Between ``` fences or indented 4+ spaces |
| Inline code | Between single backticks |
| YAML frontmatter | Between `---` delimiters at file start |
| Existing wikilinks | Inside `[[...]]` |
| URLs | Inside `[text](url)` or raw URLs |
| Image embeds | Inside `![[...]]` or `![alt](url)` |
| HTML tags | Inside `<tag>...</tag>` |
| Callout syntax | The `> [!type]` line itself (content inside callouts IS linkable) |
| Math blocks | Between `$$` or `$` delimiters |

---

## Configuration

```yaml
auto-wikilink:
  scope: folder               # note | folder | tag | vault
  scope_value: "projects/"
  first_mention_only: true     # link only first occurrence per section
  create_stubs: ask            # ask | yes | no
  stub_folder: "concepts/"
  min_term_length: 3           # minimum characters for a linkable term
  max_links_per_section: 10    # prevent over-linking
  case_sensitive: false        # match "react" to "React" note
  link_plurals: true           # match "components" to "Component" note
  custom_dictionary: "wikilink-dictionary.md"
  exclude_terms:               # terms to never auto-link
    - "TODO"
    - "NOTE"
    - "FIXME"
```

---

## Conflict Resolution

When multiple concepts could match the same text:

1. **Longest match wins**: "Clean Architecture" matches before "Architecture"
2. **Exact match over partial**: "React" note beats "React Hooks" for the word "React"
3. **Existing note over stub**: Always prefer linking to an existing note
4. **Alphabetical tiebreak**: If truly ambiguous, link to the alphabetically first note and flag for review

---

## Integration with Other Skills

- **wiki-lint** (dependency): Run wiki-lint BEFORE auto-wikilink to identify dead links and orphans. Auto-wikilink can then focus on connecting orphans.
- **contradiction-detector**: After auto-wikilinking, newly connected notes may surface contradictions — run contradiction detection on linked clusters.
- **obsidian-consolidation**: Auto-wikilink enriches notes before consolidation, making synthesis more connected.

---

## Anti-Patterns

1. **Over-linking** — Linking every occurrence of every term makes notes unreadable. First-mention-per-section rule prevents this.
2. **Linking common words** — "System", "data", "process" are too generic. Set a minimum specificity threshold.
3. **Creating stubs without consent** — Stub notes pollute the vault if unwanted. Always ask first or use `create_stubs: no`.
4. **Ignoring protected zones** — Wikilinking inside code blocks or URLs breaks formatting. Always parse protected zones first.
5. **Running on the entire vault at once** — Start with a small scope, review results, then expand. Full-vault runs are hard to review.
6. **Not running wiki-lint first** — Auto-wikilink on a vault with existing dead links compounds the problem.

---

## Critical Rules

1. NEVER insert wikilinks inside protected zones (code blocks, frontmatter, URLs, existing links)
2. NEVER create stub notes without explicit user consent
3. ALWAYS apply the first-mention-per-section rule to prevent over-linking
4. ALWAYS build the concept index from the vault BEFORE processing notes
5. ALWAYS preserve existing formatting (bold, italic, headings) around inserted links
6. ALWAYS generate a change report showing every link inserted and why
7. ALWAYS run wiki-lint dead link check before auto-wikilinking (dependency on wiki-lint skill)
8. NEVER modify notes in code blocks, math blocks, or YAML frontmatter
9. ALWAYS prefer longest-match when multiple concepts could match the same text
10. ALWAYS validate output — no nested links, no broken markdown syntax
