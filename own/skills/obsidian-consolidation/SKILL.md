---
name: obsidian-consolidation
description: >
  Periodic synthesis of scattered notes into frameworks and insights.
  Trigger: When user says consolidate, weekly synthesis, knowledge review, or wants to summarize recent notes.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.3"
---

## Purpose

Synthesize scattered braindumps, notes, and captures from a time period into a structured consolidation note. Identifies patterns, connections, and actionable insights across multiple notes. This is the "think about what you've been thinking about" workflow.

## When to Invoke

Trigger this skill when the user says any of:
- "consolidate", "consolidate notes"
- "weekly synthesis", "weekly review"
- "knowledge review", "review my notes"
- "summarize this week", "what did I capture"
- "find patterns in my notes"
- "connect the dots", "synthesize"

## Process Flow

1. **Determine time period** — Ask the user for the review period (default: last 7 days). Accept "this week", "last 2 weeks", "this month", etc.
2. **Gather source notes** — The user provides context about their recent notes (braindumps, meeting notes, coding sessions, etc.). If vault access is available, scan `inbox/` and dated notes from the period.
3. **Identify patterns** — Group related thoughts by theme. Look for:
   - Recurring topics or concerns
   - Decisions that connect to each other
   - Unresolved questions that appear multiple times
   - Contradictions or evolving perspectives
4. **Generate consolidation note** — Fill the `consolidation.md` template with synthesized insights.
5. **Create wiki-links** — Reference ALL source notes using `[[wiki-link]]` syntax.
6. **Surface action items** — Extract any implied or explicit next steps from the source material.
7. **Generate Mind Map** — Build a `markmap` fenced code block from the entities and connections identified in steps 3-6. Use 2-3 levels: period as root, insight themes as branches, individual entities as leaves. **Leaf nodes MUST use `[[wikilinked entity]]` syntax** — never plain text. Reuse the exact same `[[wikilinks]]` extracted in the `## Entities` section; do NOT introduce new entities. This serves dual purpose: visual tree structure in markmap AND Obsidian graph connectivity when the note is opened. Keep it concise (max 3 levels deep, max 15 leaf nodes). Place it in a `## Mind Map` section after `## Entities`.
8. **Save or output** — Write to `knowledge/` directory if vault is accessible, otherwise output inline.

## Role-Aware Behavior

The consolidation adapts its synthesis lens based on active role packs:

### Core Only (no role packs detected)
Use the base template exactly:
```markdown
---
title: "Consolidation: <period>"
date: "{{date}}"
tags:
  - consolidation
  - weekly
---

## Period

<start date> to <end date>

## Top Insights

- <insight 1 with [[source-note]] reference>
- <insight 2 with [[source-note]] reference>
- <insight 3>

## Connections Made

- [[note-a]] relates to [[note-b]] because <explanation>
- Theme: <identified pattern across multiple notes>

## Open Questions

- <unresolved question from the period>
- <contradiction noticed between notes>

## Action Items

- [ ] <actionable next step derived from insights>
- [ ] <follow-up on open question>

## Entities

- **Technologies**: [[tech-1]], [[tech-2]]
- **Architecture**: [[pattern-1]]
- **Themes**: [[theme-1]], [[theme-2]]

## Mind Map

> Wikilinks in markmap nodes serve dual purpose: visual tree structure AND Obsidian graph connectivity when the note is opened.

(markmap code block — use triple backticks with `markmap` language identifier)
# <Period>

## <Insight Theme A>
- [[entity-1]]
- [[entity-2]]

## <Insight Theme B>
- [[entity-3]]

## Connections
- [[entity-1]] → root cause of [[entity-3]]
(end markmap code block)
```

### Developer Pack Active
When developer templates are detected, add a technical synthesis lens:

- Add a `## Technical Patterns` section:
  ```markdown
  ## Technical Patterns

  - **Recurring architecture decision**: <pattern noticed across ADRs, coding sessions>
  - **Tech debt trend**: <growing areas identified from debug journals, tech-debt notes>
  - **Tool/library mentions**: <frequently referenced technologies>
  - Source notes: [[coding-session-01-12]], [[adr-jwt-auth]], [[debug-memory-leak]]
  ```
- Add a `## Code Health Signals` section:
  ```markdown
  ## Code Health Signals

  - Areas with repeated bugs: <modules mentioned in multiple debug journals>
  - Refactoring candidates: <code areas flagged in tech-debt notes>
  - Positive patterns: <approaches that worked well in coding sessions>
  ```
- Add tags: `#dev-review`, `#tech-patterns`

### PM/Tech Lead Pack Active
When PM templates are detected, add a management synthesis lens:

- Add a `## Team Patterns` section:
  ```markdown
  ## Team Patterns

  - **Recurring blockers**: <patterns from meeting notes, sprint reviews>
  - **Risk trends**: <evolving risks from risk registry entries>
  - **Stakeholder themes**: <repeated concerns from stakeholder updates>
  - Source notes: [[meeting-01-12]], [[sprint-review-week-2]], [[risk-registry]]
  ```
- Add a `## Leadership Actions` section:
  ```markdown
  ## Leadership Actions

  - [ ] Address recurring blocker: <specific action>
  - [ ] Escalate risk: <risk that has increased over the period>
  - [ ] Communicate to stakeholders: <key theme to share>
  - [ ] Team recognition: <positive patterns to reinforce>
  ```
- Add a `## Shareable Summary` section (suitable for pasting into Slack/email):
  ```markdown
  ## Shareable Summary

  > This week's key themes: <2-3 sentence summary suitable for stakeholders>
  ```
- Add tags: `#team-review`, `#leadership-patterns`

### Both Packs Active
Merge all sections. The consolidation becomes a comprehensive review covering both technical and team dimensions. Group insights by whether they are technical, organizational, or cross-cutting.

## Template Reference

Uses: `consolidation.md` from `GentlemanNvim/obsidian-brain/core/templates/consolidation.md`

Template structure:
```yaml
---
title:
date: "{{date}}"
tags:
  - consolidation
  - weekly
---
```
Sections: `## Period`, `## Top Insights`, `## Connections Made`, `## Open Questions`, `## Action Items`, `## Mind Map`

## Output Format

The generated file should be saved as:
```
.obsidian-brain/knowledge/YYYY-MM-DD-consolidation-<period>.md
```

Example filename: `2025-01-15-consolidation-week-02.md`

### Complete Example (Core Only)

```markdown
---
title: "Consolidation: Week 2, Jan 2025"
date: "2025-01-15"
tags:
  - consolidation
  - weekly
---

## Period

2025-01-08 to 2025-01-15

## Top Insights

- The [[JWT]] auth migration keeps coming up in different contexts — it's blocking both the [[api-gateway]] work and the [[mobile-app-team]]. See [[migrate-auth-to-jwt]] and [[api-gateway-design]].
- We're spending more time on debugging than building. Three separate debug sessions this week on [[memory-management]] issues. See [[debug-memory-leak]], [[debug-oom-staging]], [[debug-gc-pressure]].
- The new [[onboarding-v2]] is getting positive early feedback but needs [[accessibility]] review. See [[onboarding-v2-feedback]].

## Connections Made

- [[migrate-auth-to-jwt]] relates to [[api-gateway-design]] — the [[JWT]] decision directly simplifies the gateway routing layer.
- [[debug-memory-leak]] and [[debug-gc-pressure]] share a root cause: the [[connection-pool]] configuration in the new database driver.
- Theme: [[infrastructure-stability]] is the hidden blocker for feature velocity this sprint.

## Open Questions

- Should we pause feature work to address the [[memory-management]] issues first?
- Who owns the [[accessibility]] review for [[onboarding-v2]]?
- Is the [[JWT]] migration timeline realistic given current blockers?

## Action Items

- [ ] Create ADR for [[connection-pool]] configuration
- [ ] Schedule [[accessibility]] review for [[onboarding-v2]]
- [ ] Re-estimate [[JWT]] migration with the memory fix dependency

## Entities

- **Technologies**: [[JWT]]
- **Architecture**: [[connection-pool]], [[api-gateway]]
- **Components**: [[onboarding-v2]]
- **Teams**: [[mobile-app-team]]
- **Themes**: [[memory-management]], [[infrastructure-stability]], [[accessibility]]

## Mind Map

(markmap code block — use triple backticks with `markmap` language identifier)
# Week 2, Jan 2025

## Auth Migration
- [[JWT]] migration blocking [[api-gateway]]
- [[mobile-app-team]] waiting on auth

## Infrastructure Stability
- [[connection-pool]] → root cause of [[memory-management]]
- [[infrastructure-stability]] blocking feature velocity

## User Experience
- [[onboarding-v2]] needs [[accessibility]] review
(end markmap code block)
```

## Entity Extraction

During consolidation, perform an entity extraction pass across ALL source notes being synthesized. This is where entity extraction is MOST powerful — the consolidation connects entities across multiple notes, revealing the graph structure of your thinking.

### Extraction Rules

1. **Scan all generated sections** — Extract entities from `## Top Insights`, `## Connections Made`, `## Technical Patterns`, `## Team Patterns`, `## Code Health Signals`, and `## Leadership Actions`.
2. **Wrap in `[[wikilinks]]`** — Each extracted entity becomes a `[[wiki-link]]` inline where it naturally appears.
3. **Deduplicate** — If the same entity appears multiple times across sections, only wikilink the FIRST occurrence.
4. **Cross-note entities are high value** — Entities that appear in MULTIPLE source notes are the most important to extract. These reveal the hidden connections in the knowledge graph.
5. **Be more aggressive than braindumps** — Consolidations are synthesis artifacts. Extract more entities (5-15 per consolidation) since the whole point is connecting knowledge.

### Entity Types by Role Pack

**Core (always active):**
- Recurring themes and concepts
- People mentioned across notes
- Projects, products, and initiatives
- Tools and services referenced

**Developer Pack (when active):**
- Technologies appearing across multiple sessions (e.g., `[[Go]]`, `[[PostgreSQL]]`)
- Architecture patterns being discussed (e.g., `[[CQRS]]`, `[[event-sourcing]]`)
- Codebase areas with recurring issues (e.g., `[[auth-service]]`, `[[connection-pool]]`)
- Tech debt items surfacing repeatedly (e.g., `[[N+1-queries]]`, `[[memory-leaks]]`)

**PM/Tech Lead Pack (when active):**
- Team members and stakeholders (e.g., `[[platform-team]]`, `[[Sarah-PM]]`)
- Recurring blockers and risks (e.g., `[[vendor-dependency]]`, `[[hiring-bottleneck]]`)
- Strategic themes (e.g., `[[platform-migration]]`, `[[developer-experience]]`)
- Metrics trending over time (e.g., `[[deployment-frequency]]`, `[[lead-time]]`)

### Entities Section

After extraction, add an `## Entities` section at the end of the consolidation listing ALL extracted entities grouped by type. This section serves as a quick index for the consolidation:

```markdown
## Entities

- **Technologies**: [[Go]], [[PostgreSQL]], [[Redis]]
- **Architecture**: [[connection-pool]], [[JWT]], [[stateless-auth]]
- **Components**: [[auth-service]], [[api-gateway]], [[onboarding-v2]]
- **People**: [[platform-team]]
- **Themes**: [[infrastructure-stability]], [[memory-management]]
```

Only include categories that have entities. If a category would be empty, omit it.

## Critical Rules

1. **Always reference source notes** — Every insight in `## Top Insights` and `## Connections Made` MUST include at least one `[[wiki-link]]` to the source note.
2. **Synthesize, don't summarize** — The consolidation should surface NEW insights from connecting notes, not just repeat what each note said.
3. **Actionable output** — `## Action Items` must contain specific, actionable tasks, not vague observations.
4. **Respect the time period** — Only include notes from the specified period. Do not mix in older content unless it directly connects.
5. **No external dependencies** — Pure markdown generation. No API calls, no plugins.
6. **Ask for context** — If the user hasn't provided their recent notes, ask them to share or describe what they've been working on. Do not fabricate source material.
7. **One consolidation per period** — Each consolidation covers a specific time period. Do not mix periods in one note.
8. **Role sections are additions** — Role-aware sections supplement the core template, they never replace `## Top Insights`, `## Connections Made`, `## Open Questions`, or `## Action Items`.
9. **Entity extraction is mandatory** — Every consolidation MUST include an `## Entities` section. Extract entities inline as `[[wikilinks]]` in the body text AND list them grouped by type at the end. Be aggressive (5-15 entities) — consolidations are where graph connectivity shines.
10. **Mind Map is mandatory** — Every consolidation MUST include a `## Mind Map` section after `## Entities`. The mind map reuses entities already extracted — do NOT introduce new entities in the map. Keep it concise: max 3 levels deep, max 15 leaf nodes. **Leaf nodes MUST use `[[wikilinks]]`** matching the entities already extracted in the `## Entities` section — never plain text. Wikilinks in markmap nodes serve dual purpose: visual tree structure AND Obsidian graph connectivity when the note is opened.
