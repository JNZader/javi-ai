---
name: obsidian-braindump
description: >
  Quick capture of thoughts and decisions into Obsidian vault.
  Trigger: When user says braindump, capture thought, quick note, record idea, or wants to dump unstructured thoughts.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.1"
---

## Purpose

Capture raw thoughts, decisions, and ideas quickly into an Obsidian Brain vault using the `braindump.md` template. This skill prioritizes speed over structure — get the thought down first, organize later.

## When to Invoke

Trigger this skill when the user says any of:
- "braindump", "brain dump"
- "capture this thought", "capture this idea"
- "quick note", "jot this down"
- "record this decision", "log this idea"
- "dump this", "I want to remember this"
- "save this thought for later"

## Process Flow

1. **Identify the thought** — Extract the core idea from the user's message. If vague, ask ONE clarifying question maximum.
2. **Detect vault location** — Look for `.obsidian-brain/` in the current project or `~/.config/obsidian/` as fallback. If neither exists, generate the note content inline.
3. **Generate frontmatter** — Create YAML frontmatter with `title`, `date`, and `tags`.
4. **Fill template sections** — Populate `## Thought`, `## Context`, and `## Related Notes`.
5. **Suggest tags** — Auto-suggest 2-4 tags based on the content (always include `braindump` and `inbox`).
6. **Suggest related notes** — If the vault context is available, suggest `[[wiki-links]]` to potentially related notes.
7. **Save or output** — Write to `inbox/` directory if vault is accessible, otherwise output the full markdown.

## Role-Aware Behavior

The braindump adapts its output based on which role packs are active in the vault:

### Core Only (no role packs detected)
Use the base template exactly:
```markdown
---
title: <concise title>
date: "{{date}} {{time}}"
tags:
  - braindump
  - inbox
---

## Thought

<raw thought content>

## Context

<what prompted this thought — current task, conversation, article, etc.>

## Related Notes

- [[related-note-1]]
```

### Developer Pack Active
When developer templates are detected (e.g., `adr.md`, `coding-session.md`, `debug-journal.md` exist in the vault), enrich the braindump:

- Add a `## Code Reference` section for code-related thoughts:
  ```markdown
  ## Code Reference

  - File: `path/to/file.go:42`
  - Pattern: <relevant pattern or anti-pattern>
  - Impact: <how this affects the codebase>
  ```
- Add a `## Technical Decision` section if the thought is an architecture/design decision:
  ```markdown
  ## Technical Decision

  - Decision: <what was decided>
  - Rationale: <why>
  - Alternatives: <what else was considered>
  - Follow-up: Consider creating a full [[ADR]] for this.
  ```
- Add additional tags: `#dev`, `#architecture`, `#pattern`, `#tech-debt` as relevant.

### PM/Tech Lead Pack Active
When PM templates are detected (e.g., `meeting-notes.md`, `sprint-review.md`, `stakeholder-update.md` exist in the vault), enrich the braindump:

- Add a `## Stakeholder Impact` section:
  ```markdown
  ## Stakeholder Impact

  - Who is affected: <teams, stakeholders>
  - Priority signal: <urgent, important, informational>
  - Share with: <names or teams>
  ```
- Add a `## Action Required` section if the thought implies action:
  ```markdown
  ## Action Required

  - [ ] <next step>
  - Owner: <who should act>
  - Deadline: <when>
  ```
- Add additional tags: `#stakeholder`, `#priority`, `#team`, `#decision` as relevant.

### Both Packs Active
Merge all sections. Technical braindumps get both `## Code Reference` and `## Stakeholder Impact` when relevant (e.g., a tech decision that affects team timelines).

## Template Reference

Uses: `braindump.md` from `GentlemanNvim/obsidian-brain/core/templates/braindump.md`

Template structure:
```yaml
---
title:
date: "{{date}} {{time}}"
tags:
  - braindump
  - inbox
---
```
Sections: `## Thought`, `## Context`, `## Related Notes`

## Output Format

The generated file should be saved as:
```
.obsidian-brain/inbox/YYYY-MM-DD-<slugified-title>.md
```

Example filename: `2025-01-15-migrate-auth-to-jwt.md`

### Complete Example (Developer Pack Active)

```markdown
---
title: Migrate auth to JWT
date: "2025-01-15 14:30"
tags:
  - braindump
  - inbox
  - dev
  - architecture
---

## Thought

We should migrate from session-based auth to [[JWT]]. The current session store is becoming a bottleneck with the new [[microservice-architecture]], and [[stateless-auth]] would simplify the [[api-gateway]].

## Context

Came up during the [[api-gateway]] design review. Current session store hits [[Redis]] for every request, adding ~15ms latency.

## Code Reference

- File: `services/auth/session.go:89`
- Pattern: [[stateless-auth]] via [[JWT]] access + refresh tokens
- Impact: Removes [[Redis]] dependency for auth, simplifies [[api-gateway]] routing

## Technical Decision

- Decision: Migrate to [[JWT]] with short-lived access tokens (15min) + refresh tokens (7d)
- Rationale: [[stateless-auth]] eliminates session store bottleneck
- Alternatives: Sticky sessions (rejected — breaks horizontal scaling), encrypted cookies (rejected — size limits)
- Follow-up: Consider creating a full [[ADR]] for this.

## Related Notes

- [[api-gateway-design]]
- [[redis-performance-issues]]

## Entities

- **Technologies**: [[JWT]], [[Redis]]
- **Patterns**: [[stateless-auth]], [[microservice-architecture]]
- **Components**: [[api-gateway]]
```

## Entity Extraction

After generating the braindump content, perform an entity extraction pass. Scan all sections for key entities and wrap them in `[[wikilinks]]` inline to build Obsidian graph connectivity.

### Extraction Rules

1. **Scan all generated sections** — Extract entities from `## Thought`, `## Context`, `## Code Reference`, `## Technical Decision`, `## Stakeholder Impact`, and `## Action Required`.
2. **Wrap in `[[wikilinks]]`** — Each extracted entity becomes a `[[wiki-link]]` inline where it naturally appears. Do NOT create a separate list of bare entities — they live in context.
3. **Deduplicate** — If the same entity appears multiple times, only wikilink the FIRST occurrence.
4. **Be selective** — Only extract entities that would be genuinely useful as standalone notes. Braindumps are fast and raw — don't over-link. Aim for 2-6 entities per braindump.

### Entity Types by Role Pack

**Core (always active):**
- People and authors mentioned
- Organizations and companies
- Specific products, tools, or services
- Concepts and methodologies

**Developer Pack (when active):**
- Technologies, languages, and frameworks (e.g., `[[Go]]`, `[[React]]`)
- Libraries and packages (e.g., `[[Bubbletea]]`, `[[pgx]]`)
- Design patterns and architecture concepts (e.g., `[[hexagonal-architecture]]`, `[[CQRS]]`)
- APIs, protocols, and infrastructure (e.g., `[[Redis]]`, `[[JWT]]`)

**PM/Tech Lead Pack (when active):**
- People and team members (e.g., `[[John-Smith]]`, `[[platform-team]]`)
- Companies and competitors (e.g., `[[Stripe]]`, `[[Vercel]]`)
- Products, features, and initiatives (e.g., `[[onboarding-v2]]`, `[[billing-module]]`)
- Metrics and KPIs (e.g., `[[p99-latency]]`, `[[NPS]]`)

### Entities Section

After extraction, add an `## Entities` section at the end of the note listing all extracted entities grouped by type:

```markdown
## Entities

- **Technologies**: [[Go]], [[Redis]]
- **Patterns**: [[JWT]], [[stateless-auth]]
- **Components**: [[api-gateway]], [[auth-service]]
```

Only include categories that have entities. If a category would be empty, omit it.

## Critical Rules

1. **Speed over perfection** — Capture first, refine later. Do NOT over-structure the braindump.
2. **Never skip frontmatter** — Always include `title`, `date`, and `tags` in YAML frontmatter.
3. **Always include `braindump` and `inbox` tags** — These are required for the inbox workflow.
4. **Use `[[wiki-link]]` syntax** — All related note references MUST use Obsidian wiki-link format.
5. **One thought per braindump** — If the user dumps multiple ideas, create separate notes for each.
6. **No external dependencies** — This skill generates pure markdown. No API calls, no plugins, no file system scanning beyond vault detection.
7. **Respect the template** — Role-aware sections are ADDITIONS, never replacements for the core template sections.
8. **Ask before writing** — If vault location is detected, confirm with the user before writing the file. If generating inline, just output the markdown.
9. **Entity extraction is mandatory** — Every braindump MUST include an `## Entities` section. Extract entities inline as `[[wikilinks]]` in the body text AND list them grouped by type at the end. Keep it light (2-6 entities) — speed over completeness.
