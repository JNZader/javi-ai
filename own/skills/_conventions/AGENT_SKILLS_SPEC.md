# Agent Skills Spec — Convention Reference

Standard format that ALL skills in `own/skills/` MUST follow. Based on the official Agent Skills specification with adaptations for javi-ai.

---

## Directory Structure

```
own/skills/{skill-name}/
├── SKILL.md              # Required — main skill file
├── assets/               # Optional — templates, schemas, examples
│   ├── template.py
│   └── schema.json
└── references/           # Optional — links to local docs
    └── docs.md
```

---

## YAML Frontmatter (Required)

Every `SKILL.md` MUST begin with YAML frontmatter fenced by `---`:

```yaml
---
name: skill-name                    # Required — lowercase, hyphens only
description: >                      # Required — multiline block scalar
  One-sentence description of what the skill does.
  Trigger: When <conditions that activate this skill>.
license: Apache-2.0                 # Optional — default Apache-2.0
metadata:                           # Required block
  author: gentleman-programming     # Required — skill author
  version: "1.0"                    # Required — semver as quoted string
  tags: [tag1, tag2]                # Optional — lowercase, for discovery
  category: orchestration           # Optional — grouping label
allowed-tools: Read, Bash, Glob     # Optional — tool whitelist for skill
---
```

### Field Reference

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `name` | YES | string | Matches directory name. Lowercase, hyphens. |
| `description` | YES | string | First sentence = what. Second sentence = trigger keywords for AI activation. |
| `license` | no | string | Default `Apache-2.0`. |
| `metadata.author` | YES | string | `gentleman-programming` or `javi-ai`. |
| `metadata.version` | YES | string | Quoted semver (`"1.0"`, `"2.1"`). |
| `metadata.tags` | no | list | Lowercase tags for search/filtering. |
| `metadata.category` | no | string | One of: `orchestration`, `optimization`, `workflow`, `testing`, `analysis`, `memory`. |
| `allowed-tools` | no | string | Comma-separated tool names. Restricts what the skill can use. |

---

## Body Structure — Progressive Disclosure

Content MUST follow progressive disclosure: most critical information first, details later.

### Required Sections (in order)

```markdown
# {Skill Title}                     <!-- Optional H1 if you want a readable title -->

## Purpose / Core Principle          <!-- What problem this solves, in 2-3 sentences -->

## When to Activate                  <!-- Bullet list of activation conditions -->
                                     <!-- Include "Do NOT activate" anti-patterns -->

## {Core Content Sections}           <!-- The actual patterns, rules, workflows -->
                                     <!-- Use tables for decision trees -->
                                     <!-- Use code blocks for commands/examples -->
                                     <!-- Keep examples minimal and focused -->
```

### Optional Sections

| Section | When to Include |
|---------|----------------|
| `## Critical Rules` | Numbered list of MUST-follow rules |
| `## Code Examples` | Minimal, focused snippets |
| `## Commands` | Copy-paste CLI commands |
| `## Decision Trees` | Tables mapping conditions to actions |
| `## Anti-Patterns` | What NOT to do (with explanation) |
| `## Resources` | Links to `assets/` and `references/` |

---

## Naming Conventions

| Type | Pattern | Examples |
|------|---------|----------|
| Generic skill | `{technology}` | `pytest`, `playwright`, `typescript` |
| Project-specific | `{project}-{component}` | `myapp-api`, `myapp-ui` |
| Workflow skill | `{action}-{target}` | `skill-creator`, `pr-review` |
| SDD phase | `sdd-{phase}` | `sdd-apply`, `sdd-verify` |

---

## Gap Analysis — Current State

Audit of existing skills against this spec (sampled 6 skills):

| Skill | `name` | `description` | `metadata.author` | `metadata.version` | Trigger in desc | Notes |
|-------|--------|---------------|-------------------|--------------------|-----------------|----|
| `skill-creator` | ✅ | ✅ | ✅ `gentleman-programming` | ✅ `"1.0"` | ✅ | Has `license` field |
| `adversarial-review` | ✅ | ✅ | ✅ `gentleman-programming` | ✅ `"1.1"` | ✅ | Has `license` field |
| `blast-radius` | ✅ | ✅ | ✅ `javi-ai` | ✅ `"1.0"` | ✅ | Has `tags`, `category`. No `license`. |
| `complexity-router` | ✅ | ✅ | ✅ `javi-ai` | ✅ `"1.0"` | ✅ | Has `tags`, `category`. No `license`. |
| `self-evolving-skills` | ✅ | ✅ | ✅ `javi-ai` | ✅ `"1.0"` | ✅ | Has `tags`, `category`. No `license`. |
| `session-memory` | ✅ | ✅ | ✅ `gentleman-programming` | ✅ `"1.1"` | ✅ | Has `license`. No `tags`/`category`. |

### Gaps Found

1. **`license` field inconsistent** — Some skills include it (`Apache-2.0` or `MIT`), others omit it. Not critical since it's optional, but standardizing would be cleaner.
2. **`tags` and `category` inconsistent** — Newer skills (`blast-radius`, `complexity-router`) include them, older ones don't. Optional but recommended for discovery.
3. **No structural issues** — All sampled skills have the required `name`, `description` (with trigger), `metadata.author`, and `metadata.version`.
4. **Body structure varies** — Some use `## Purpose`, others `## Core Principle`, others `## When to Use` vs `## When to Activate`. Functionally equivalent but not uniform. Recommend standardizing on `## Purpose` + `## When to Activate`.

### Recommendations

- Add `tags` and `category` to older skills during routine maintenance
- Standardize section names: `## Purpose`, `## When to Activate`, `## Critical Rules`
- Keep `license` optional — not all skills have the same license
- No blocking issues — all skills are functionally compliant with the Agent Skills spec

---

## Checklist for New Skills

- [ ] Directory: `own/skills/{skill-name}/SKILL.md`
- [ ] Frontmatter: `name` matches directory name
- [ ] Frontmatter: `description` includes trigger keywords
- [ ] Frontmatter: `metadata.author` and `metadata.version` present
- [ ] Body: Starts with Purpose/Core Principle section
- [ ] Body: Has "When to Activate" with bullet conditions
- [ ] Body: Progressive disclosure (critical info first)
- [ ] Body: Tables for decision trees, minimal code examples
- [ ] Registered in skill registry after creation
