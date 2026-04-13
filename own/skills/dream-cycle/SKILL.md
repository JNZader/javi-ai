---
name: dream-cycle
description: >
  Autonomous nightly knowledge consolidation — entity deduplication, citation repair,
  orphan cleanup, and memory compression. Runs as a scheduled task via Claude Code's
  /schedule or cron, simulating how the brain consolidates memories during sleep.
  Trigger: When user says "dream cycle", "nightly consolidation", "knowledge cleanup",
  "run maintenance", or configures a scheduled consolidation task.
metadata:
  author: javi-ai
  version: "1.0"
  tags: [knowledge, consolidation, maintenance, scheduled, autonomous, memory, obsidian]
  category: knowledge
  source: garrytan/gbrain
  dependencies:
    - brain-first (item #41)
    - memory-compressor (item #42)
    - wiki-lint (item #69, optional — for health checks)
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, mcp__plugin_engram_engram__mem_search, mcp__plugin_engram_engram__mem_save, mcp__plugin_engram_engram__mem_get_observation, mcp__plugin_engram_engram__mem_session_summary
---

## Purpose

Knowledge bases decay. Duplicate entities accumulate, references break, orphan notes pile up, and session memories stay fragmented. The dream-cycle runs autonomous maintenance — like the brain's memory consolidation during sleep — to keep the knowledge graph healthy.

Inspired by how sleep consolidates short-term memory into long-term knowledge: strengthen important connections, prune noise, merge duplicates, and surface forgotten insights.

---

## 1. Core Principle

```
Awake (sessions):   Capture fast, create freely, don't slow down
Sleep (dream-cycle): Consolidate, deduplicate, repair, compress
                     ├─ Entity sweep      → merge duplicates
                     ├─ Citation fixes    → repair broken refs
                     ├─ Orphan cleanup    → connect or archive
                     ├─ Memory compress   → short-term → long-term
                     └─ Health check      → wiki-lint integration
```

---

## 2. Dream Cycle Phases

The cycle runs 5 phases in sequence. Each phase is idempotent — safe to re-run.

### Phase 1 — Entity Sweep (Deduplication)

Find and merge duplicate or near-duplicate entities across the knowledge base.

**Detection heuristics:**
| Signal | Example | Action |
|--------|---------|--------|
| Same name, different case | `[[React]]` vs `[[react]]` | Merge to canonical form |
| Singular/plural variants | `[[API]]` vs `[[APIs]]` | Merge to singular, add alias |
| Abbreviation vs full name | `[[DRF]]` vs `[[Django REST Framework]]` | Keep both, add alias link |
| Near-identical titles | `[[Auth Flow]]` vs `[[Authentication Flow]]` | Merge, keep longer as canonical |
| Same entity, different paths | `notes/React.md` vs `concepts/React.md` | Merge to canonical location |

**Merge protocol:**
1. Identify canonical entity (longer name, more backlinks, older creation date)
2. Consolidate content from duplicate into canonical
3. Update ALL references to point to canonical
4. Leave redirect note at old location (if Obsidian vault) or delete duplicate
5. Log every merge in the dream-cycle report

### Phase 2 — Citation Fixes (Reference Repair)

Find and repair broken references.

**What counts as broken:**
| Type | Detection | Repair |
|------|-----------|--------|
| Dead wiki-links | `[[Target]]` where Target.md doesn't exist | Create stub OR suggest removal |
| Broken file refs | `[text](./path.md)` where path doesn't exist | Search for moved file, update path |
| Orphaned embeds | `![[image.png]]` where image is missing | Flag for user review |
| Engram refs | Topic key references where observation was deleted | Remove reference, note in report |
| Stale URLs | External links returning 404 | Flag for user review (do NOT auto-remove) |

**Repair protocol:**
1. Scan all markdown files for links (wiki-links, relative links, embeds)
2. Verify each target exists
3. For missing targets: search for likely matches (renamed, moved)
4. Auto-fix when confidence > 90% (file was clearly renamed/moved)
5. Flag for user review when ambiguous
6. NEVER delete content — only update references or create stubs

### Phase 3 — Orphan Cleanup

Handle notes that have zero incoming links (no other note references them).

**Triage rules:**
| Orphan Type | Detection | Action |
|-------------|-----------|--------|
| Recent orphan (<7 days) | Created recently, no links yet | SKIP — too new to judge |
| Stub orphan | <50 words, no meaningful content | Archive to `_archive/orphans/` |
| Content orphan | Has real content but no links | Suggest connections, add to report |
| Index/MOC orphan | Is an index that nothing links TO | Normal — indexes link OUT |
| Daily note orphan | Date-named note pattern | Normal — daily notes are standalone |

**Connection suggestions:**
For content orphans, scan their content for terms that match existing entities. Suggest wiki-links that would connect them to the graph.

### Phase 4 — Memory Consolidation

Compress scattered session memories into structured long-term knowledge.

**Sources:**
- Engram session summaries from the past period
- Braindump notes not yet consolidated
- Decision records from coding sessions
- Meeting notes not yet synthesized

**Consolidation process:**
1. Search engram for recent session summaries: `mem_search(query: "session", project: "{project}")`
2. Group related memories by topic/project
3. Synthesize into long-term knowledge notes:
   - Decisions → Decision Record notes
   - Patterns discovered → Pattern Library entries
   - Bugs & fixes → Troubleshooting Guide entries
   - Architecture insights → Architecture Decision Records
4. Save consolidated knowledge back to engram with `long-term/` topic prefix
5. Mark source memories as consolidated (do NOT delete)

**Integrates with `memory-compressor`**: Uses the same compression heuristics but operates on stored memories rather than live context.

### Phase 5 — Health Check (Wiki-Lint Integration)

Run structural health checks on the knowledge base.

**Checks (from wiki-lint if available):**
- Frontmatter completeness (title, date, tags present)
- Heading structure (no skipped levels, single h1)
- Tag consistency (no typos in common tags)
- File naming conventions (kebab-case, no spaces)
- Large files that should be split (>500 lines)

**When wiki-lint skill is available:** Delegate to wiki-lint for the full check suite.
**When wiki-lint is not available:** Run a minimal set of checks inline (frontmatter, heading structure, file naming).

---

## 3. Scheduling

### Via Claude Code /schedule

```bash
# Run dream-cycle nightly at 2 AM
/schedule "dream-cycle" --cron "0 2 * * *" --prompt "Run the dream-cycle skill on my Obsidian vault at ~/obsidian-brain. Output the report to ~/obsidian-brain/maintenance/dream-cycle-{date}.md"
```

### Via cron (alternative)

```bash
# Add to crontab
0 2 * * * claude --skill dream-cycle --vault ~/obsidian-brain --output ~/obsidian-brain/maintenance/
```

### Manual Trigger

User says: "run dream cycle", "dream cycle", "nightly consolidation", "knowledge maintenance"

---

## 4. Configuration

The dream-cycle reads configuration from the vault or project:

```yaml
# In vault root: .dream-cycle.yaml OR in openspec/config.yaml under dream-cycle key
dream-cycle:
  vault_path: ~/obsidian-brain          # Required: path to knowledge base
  schedule: "0 2 * * *"                 # Cron expression
  phases:                               # Enable/disable phases
    entity-sweep: true
    citation-fixes: true
    orphan-cleanup: true
    memory-consolidation: true
    health-check: true
  orphan:
    grace_period_days: 7                # Don't touch orphans newer than this
    auto_archive: false                 # true = archive stubs automatically
    ignore_patterns:                    # Skip these paths
      - "templates/"
      - "daily/"
      - "_archive/"
  entity:
    canonical_strategy: "most-linked"   # most-linked | longest-name | oldest
    auto_merge: false                   # true = merge without confirmation
  memory:
    lookback_days: 7                    # How far back to scan for memories
    engram_project: null                # Engram project filter (null = all)
  report:
    output_dir: "maintenance/"          # Where to write reports
    keep_reports: 30                    # Days to keep old reports
```

---

## 5. Dream Cycle Report

Every run produces a report summarizing actions taken:

```markdown
---
title: "Dream Cycle Report: {date}"
date: "{ISO date}"
tags:
  - dream-cycle
  - maintenance
  - automated
---

## Dream Cycle Report — {date}

**Duration**: {elapsed time}
**Vault**: {vault path}

### Entity Sweep
- **Duplicates found**: {N}
- **Auto-merged**: {N} (list below)
- **Needs review**: {N} (list below)

| Duplicate | Canonical | Action | Confidence |
|-----------|-----------|--------|-----------|
| [[react]] | [[React]] | Merged | 99% |
| [[Auth Flow]] | [[Authentication Flow]] | Needs review | 75% |

### Citation Fixes
- **Broken links found**: {N}
- **Auto-repaired**: {N}
- **Flagged for review**: {N}

| Source File | Broken Link | Suggested Fix | Status |
|------------|-------------|---------------|--------|
| notes/api.md | [[old-auth]] | [[Authentication Flow]] | Fixed |
| notes/deploy.md | ./infra.md | ./infrastructure.md | Fixed |

### Orphan Cleanup
- **Orphans detected**: {N}
- **Skipped (too new)**: {N}
- **Archived**: {N}
- **Connection suggestions**: {N}

| Orphan Note | Age | Action | Suggested Connection |
|-------------|-----|--------|---------------------|
| stale-idea.md | 45d | Archived | — |
| react-patterns.md | 30d | Suggest link | [[React]], [[Design Patterns]] |

### Memory Consolidation
- **Sessions processed**: {N}
- **Knowledge notes created**: {N}
- **Decisions recorded**: {N}

### Health Check
- **Issues found**: {N}
- **Auto-fixed**: {N}
- **Warnings**: {N}

### Summary
- Total actions: {N}
- Auto-applied: {N}
- Needs user review: {N}
```

---

## 6. Safety Guarantees

1. **NEVER delete content** — only archive, merge, or flag
2. **NEVER auto-merge when confidence < 90%** — flag for user review
3. **NEVER modify files outside the configured vault path**
4. **Idempotent** — running twice produces the same result
5. **Dry-run mode** — add `--dry-run` to see what WOULD happen without changes
6. **Git-aware** — if vault is a git repo, create a commit after each phase: `chore(dream-cycle): {phase} — {date}`
7. **Rollback** — if vault is git-tracked, user can `git revert` the dream-cycle commit

---

## 7. Dry-Run Mode

When invoked with `--dry-run` or user says "preview dream cycle":

- Run all detection phases
- Generate the full report
- Mark every action as "Would do" instead of "Done"
- Do NOT modify any files
- Useful for first-time setup or reviewing before enabling auto mode

---

## 8. Integration Points

| Skill | Integration |
|-------|------------|
| `brain-first` | Dream-cycle operates on brain-first's knowledge structure (entities, notes, vault layout) |
| `memory-compressor` | Phase 4 uses memory-compressor's compression heuristics for session → long-term conversion |
| `wiki-lint` | Phase 5 delegates health checks to wiki-lint when available |
| `obsidian-consolidation` | Dream-cycle's Phase 4 is a superset — it consolidates AND compresses. If obsidian-consolidation was run manually, dream-cycle skips already-consolidated notes |
| `obsidian-braindump` | Braindumps are primary input for Phase 4 consolidation |
| `engram` | Source and destination for memory consolidation (Phase 4) |

---

## 9. Workflow

```
1. Detect vault path (from config, args, or ask user)
2. Load configuration (.dream-cycle.yaml)
3. Run Phase 1: Entity Sweep
4. Run Phase 2: Citation Fixes
5. Run Phase 3: Orphan Cleanup
6. Run Phase 4: Memory Consolidation
7. Run Phase 5: Health Check
8. Generate dream-cycle report
9. Save report to maintenance/ directory
10. If git-tracked: commit changes
11. Output summary to user
```

---

## Critical Rules

1. NEVER delete any content — archive, merge, or flag only. User data is sacred.
2. NEVER auto-merge entities with confidence below 90%. Always flag ambiguous cases.
3. Every run MUST produce a report, even if no actions were taken.
4. Respect the grace period — do not touch orphans newer than `grace_period_days`.
5. Each phase is idempotent — re-running must not create duplicates or conflicts.
6. When git-tracked, commit after changes so the user can review and revert.
7. Dry-run mode must be available and must not modify any files.
8. Memory consolidation marks sources as consolidated but NEVER deletes them.
9. External URL checking (stale URLs) must be flagged only — never auto-remove links.
10. The dream-cycle must complete all enabled phases even if one phase encounters errors — log the error and continue.
