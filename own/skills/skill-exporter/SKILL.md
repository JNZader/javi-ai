---
name: skill-exporter
description: >
  Converts SKILL.md files to other AI assistant formats — .cursorrules, .windsurfrules, AGENTS.md, and raw markdown.
  Trigger: When user wants to export skills for Cursor, Windsurf, or other AI tools, says "export skill", "convert to cursorrules", or "generate AGENTS.md".
metadata:
  author: javi-ai
  version: "1.0"
  tags: [skills, export, cursor, windsurf, agents, interoperability]
  category: workflow
allowed-tools: Read, Write, Bash, Glob, Grep
---

# Skill Exporter

Convert SKILL.md files to formats consumed by other AI coding assistants.

---

## Purpose

Skills written for Claude Code follow the Agent Skills spec (YAML frontmatter + progressive disclosure). Other tools — Cursor, Windsurf, generic agents — use different formats. This skill bridges the gap by converting SKILL.md into target-specific formats without losing critical information.

---

## When to Activate

- User wants to use javi-ai skills in Cursor (`.cursorrules`)
- User wants to use javi-ai skills in Windsurf (`.windsurfrules`)
- User wants a generic `AGENTS.md` for cross-tool compatibility
- User says "export skill", "convert skill to", "cursorrules from skill"
- User wants to share skills with a team using different tools

**Do NOT activate** when:
- User wants to create a new skill (use `skill-creator`)
- User wants to generate a skill from docs (use `skill-generator`)
- Target format is already SKILL.md (no conversion needed)

---

## Supported Targets

| Target | Output File | Placement | Notes |
|--------|------------|-----------|-------|
| Cursor | `.cursorrules` | Project root | Single file, all rules concatenated |
| Windsurf | `.windsurfrules` | Project root | Single file, similar to Cursor |
| AGENTS.md | `AGENTS.md` | Project root or per-directory | Markdown with structured agent instructions |
| Raw markdown | `{name}.rules.md` | User-specified | Stripped frontmatter, plain markdown |

---

## Export Pipeline

### Step 1: Identify Source Skills

```
1. If user specifies skill name(s) → load those from own/skills/{name}/SKILL.md
2. If user says "all" or "export everything" → scan own/skills/*/SKILL.md
3. If user specifies a file path → load that specific SKILL.md
4. Validate each file has proper YAML frontmatter (name + description)
```

### Step 2: Parse SKILL.md

Extract these components from each skill:

| Component | Source | Required |
|-----------|--------|----------|
| Name | `name` from frontmatter | YES |
| Description | `description` from frontmatter | YES |
| Rules | `## Critical Rules` section, numbered items | YES |
| Patterns | `## Core Patterns` or similar sections | YES |
| Anti-patterns | `## Anti-Patterns` section | if present |
| Code examples | `## Code Examples` section | if present |
| Activation conditions | `## When to Activate` section | for AGENTS.md |

### Step 3: Transform to Target Format

---

### Target: `.cursorrules`

Cursor reads a single `.cursorrules` file at the project root. Format:

```markdown
# Project Rules

## {Skill Name 1}

{Description}

### Rules
{Numbered list from Critical Rules}

### Patterns
{Core patterns, tables converted to lists if needed}

### Anti-Patterns
{Anti-pattern list}

---

## {Skill Name 2}
...
```

**Conversion rules:**
- Strip YAML frontmatter entirely
- Flatten progressive disclosure — put everything at the same depth
- Convert tables to bullet lists (Cursor handles lists better)
- Remove `## When to Activate` (Cursor doesn't route by context)
- Remove `## Resources` (local paths won't resolve in Cursor)
- Concatenate all skills into ONE file with `---` separators
- Cap total output at 10,000 lines — prioritize Critical Rules if trimming

---

### Target: `.windsurfrules`

Windsurf uses the same format as Cursor with minor differences:

```markdown
# Windsurf Rules

## {Skill Name}

{Description}

### Key Rules
{Numbered rules}

### Patterns
{Patterns with code blocks preserved}

### Avoid
{Anti-patterns as bullet list}

---
```

**Conversion rules:**
- Same as `.cursorrules` with these adjustments:
- Use `### Key Rules` instead of `### Rules`
- Use `### Avoid` instead of `### Anti-Patterns`
- Windsurf handles code blocks well — preserve them as-is
- Keep tables if they're simple (2-3 columns)

---

### Target: `AGENTS.md`

AGENTS.md is a cross-tool format for agent instructions. Structure:

```markdown
# AGENTS.md

> Auto-generated from javi-ai skills. Do not edit manually.
> Generated: {ISO date}

## Available Skills

| Skill | Description | Category |
|-------|-------------|----------|
| {name} | {one-line description} | {category} |
| ... | ... | ... |

---

## {Skill Name}

**Trigger**: {trigger conditions from description}
**Category**: {metadata.category}

### Rules

{Critical rules as numbered list}

### Patterns

{Core patterns}

### Anti-Patterns

{Anti-patterns}

---
```

**Conversion rules:**
- Keep YAML metadata in a structured header (not raw YAML)
- Preserve `## When to Activate` as the trigger description
- Include a table of contents at the top
- Keep tables and code blocks as-is
- Add generation timestamp and source notice

---

### Target: Raw Markdown

Minimal transformation — just strip YAML frontmatter:

```
1. Remove everything between the opening and closing `---`
2. Keep all markdown content as-is
3. Write to {skill-name}.rules.md
```

---

## Step 4: Write Output

```
1. Determine output path:
   - .cursorrules → project root
   - .windsurfrules → project root
   - AGENTS.md → project root (or user-specified)
   - Raw markdown → user-specified or own/skills/{name}/
2. If file exists → warn user before overwriting
3. Write the converted content
4. Report: target format, skills included, output path, any content trimmed
```

---

## Multi-Skill Export

When exporting multiple skills to a single-file format (Cursor, Windsurf):

```
1. Sort skills by category, then alphabetically
2. Add a header comment with generation date
3. Separate skills with `---` horizontal rules
4. If total size exceeds limit:
   a. Include only Critical Rules for each skill
   b. Add a note: "Full patterns available in own/skills/{name}/SKILL.md"
```

---

## Critical Rules

1. **NEVER modify the source SKILL.md** — export is read-only, always generates new files
2. **ALWAYS add a generation notice** — so users know the file is auto-generated and shouldn't be edited manually
3. **ALWAYS warn before overwriting** existing `.cursorrules`, `.windsurfrules`, or `AGENTS.md`
4. **Strip internal references** — paths like `own/skills/`, `references/`, `assets/` won't resolve in target tools
5. **Preserve code examples verbatim** — don't reformat or truncate code blocks
6. **Cap output size** — single-file formats (Cursor, Windsurf) should stay under 10,000 lines; trim patterns before rules
