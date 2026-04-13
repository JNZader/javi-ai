---
name: skill-generator
description: >
  Generates a SKILL.md from documentation URLs, markdown files, or raw text — extracts patterns, rules, examples, and anti-patterns automatically.
  Trigger: When user wants to create a skill from docs, says "generate skill from", "skill from docs", "convert docs to skill", or provides a URL/file to turn into a skill.
metadata:
  author: javi-ai
  version: "1.0"
  tags: [skills, generation, documentation, automation]
  category: workflow
allowed-tools: Read, Write, Bash, Glob, Grep, WebFetch, WebSearch
---

# Skill Generator

Create production-ready SKILL.md files from any documentation source.

---

## Purpose

Manually writing skills from documentation is tedious and error-prone. This skill automates extraction of patterns, rules, examples, and anti-patterns from docs into a properly formatted SKILL.md following the Agent Skills spec.

---

## When to Activate

- User provides a documentation URL and wants a skill from it
- User provides a markdown file path to convert into a skill
- User pastes raw text and asks to generate a skill
- User says "generate skill from", "skill from docs", "create skill from URL"

**Do NOT activate** when:
- User wants to manually write a skill (use `skill-creator` instead)
- The source is not documentation (e.g., a code file — analyze differently)
- A skill for the technology already exists (check `own/skills/` first)

---

## Input Modes

| Mode | Input | How to Acquire |
|------|-------|----------------|
| **URL** | `https://docs.example.com/guide` | Use `WebFetch` to retrieve content |
| **File path** | `/path/to/docs.md` or relative path | Use `Read` to load content |
| **Raw text** | Pasted documentation text | Use directly from user message |

### Step 0: Validate Input

```
1. If URL → WebFetch the page. If fetch fails, report error and stop.
2. If file path → Read the file. If not found, report error and stop.
3. If raw text → Use directly.
4. If input exceeds 50,000 chars → summarize sections, don't load everything.
```

---

## Extraction Pipeline

### Step 1: Identify the Technology

From the source content, extract:

| Field | How to Find |
|-------|-------------|
| **Name** | Title, H1, package name, library name |
| **Version** | Version numbers, "v4", "latest", changelog headers |
| **Category** | Framework, library, tool, platform, API |
| **Language** | Programming language(s) used |

### Step 2: Extract Patterns

Scan the documentation for these pattern types:

| Pattern Type | Signals in Docs | Priority |
|-------------|-----------------|----------|
| **Critical rules** | "MUST", "NEVER", "ALWAYS", "required", "breaking change" | HIGH |
| **Best practices** | "recommended", "best practice", "prefer", "should" | HIGH |
| **Configuration** | Config files, env vars, setup steps | MEDIUM |
| **API patterns** | Function signatures, method chains, hooks | MEDIUM |
| **Anti-patterns** | "don't", "avoid", "deprecated", "common mistake" | HIGH |
| **Migration notes** | "changed in", "breaking", "upgrade from", "renamed" | HIGH |
| **Code examples** | Code blocks, snippets, usage examples | MEDIUM |

### Step 3: Classify and Prioritize

```
1. Group findings by: Critical Rules > Patterns > Examples > Configuration
2. Deduplicate — merge overlapping rules
3. Prioritize by impact:
   - Breaking changes / migration traps → top of Critical Rules
   - Common mistakes / anti-patterns → immediately after
   - Best practices → Core Patterns section
   - Code examples → keep only the most illustrative 3-5
4. Discard: installation steps, changelog noise, contributor guides
```

### Step 4: Structure the Output

Apply the format from `_conventions/AGENT_SKILLS_SPEC.md`:

```markdown
---
name: {extracted-name}
description: >
  {One sentence: what the technology is and what the skill covers}.
  Trigger: When {conditions based on technology usage}.
metadata:
  author: javi-ai
  version: "1.0"
  tags: [{technology}, {language}, {category}]
  category: {detected category}
---

## Purpose

{What this skill helps the AI do correctly with this technology.}

## When to Activate

- {Condition 1 — e.g., "When writing React components"}
- {Condition 2}
- {Condition 3}

## Critical Rules

1. {Most important rule — e.g., breaking change from previous version}
2. {Second most important rule}
3. {Continue...}

## Core Patterns

### {Pattern Group 1}

{Table or concise explanation}

### {Pattern Group 2}

{Table or concise explanation}

## Anti-Patterns

| Don't | Do Instead | Why |
|-------|-----------|-----|
| {bad pattern} | {good pattern} | {explanation} |

## Code Examples

{Minimal, focused examples — max 5}

## Resources

- **Source**: {URL or file path of the documentation used}
```

---

## Step 5: Validate Output

Before writing the file, verify:

- [ ] Frontmatter has `name`, `description` (with trigger), `metadata.author`, `metadata.version`
- [ ] `name` is lowercase with hyphens only
- [ ] Critical Rules section has at least 3 rules
- [ ] No duplicate information across sections
- [ ] Code examples are minimal (no full app boilerplate)
- [ ] Anti-patterns include the "Do Instead" column
- [ ] Source URL/path is preserved in Resources

---

## Step 6: Write and Report

```
1. Determine skill name from technology (lowercase, hyphens)
2. Check own/skills/{name}/ doesn't already exist
3. Create own/skills/{name}/SKILL.md with generated content
4. Report to user:
   - Skill name and path
   - Number of rules/patterns extracted
   - Any gaps (e.g., "docs had no anti-patterns listed")
   - Suggest manual review for accuracy
```

---

## Multi-Page Documentation

When docs span multiple pages:

```
1. Start with the main/overview page
2. Follow links to: Getting Started, API Reference, Migration Guide
3. Prioritize: Migration Guide > API Reference > Getting Started > Tutorials
4. Cap at 5 pages maximum — extract patterns, don't read everything
5. If the technology has a "Cheat Sheet" or "Quick Reference" page, prioritize that
```

---

## Critical Rules

1. **ALWAYS preserve the source URL/path** in the Resources section — provenance matters
2. **NEVER include installation steps** in the skill — those change constantly and belong in docs
3. **ALWAYS check for existing skills** before generating — don't create duplicates
4. **Prioritize breaking changes and migration traps** — those cause the most AI errors
5. **Keep code examples under 20 lines each** — skills are instructions, not tutorials
6. **ALWAYS suggest manual review** — AI extraction is imperfect, human verification catches hallucinated rules
