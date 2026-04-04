---
name: sdd-compact
description: >
  Semantic compaction of completed SDD apply sessions. Summarizes closed tasks into a
  single "Completed Work" block, discarding step-by-step implementation noise while
  preserving decisions, file paths, and risks. Run after sdd-archive to reclaim context.
  Trigger: /sdd-compact, or suggested automatically after sdd-archive.
metadata:
  author: javi-ai
  version: "1.0"
  tags: [sdd, context, compaction, memory]
  category: workflow
allowed-tools: Read, Write, mcp__plugin_engram_engram__mem_search, mcp__plugin_engram_engram__mem_get_observation, mcp__plugin_engram_engram__mem_save
---

## Purpose

After a change is archived, the apply-progress artifact retains all granular task details.
In long sessions, this bloats context. sdd-compact replaces the verbose apply-progress with
a concise summary — preserving what matters, discarding what doesn't.

---

## Steps

### Step 1: Load apply-progress

```
mem_search(query: "sdd/{change}/apply-progress", project: "{project}")
mem_get_observation(id: {result})
```

### Step 2: Extract signal

From the apply-progress, extract:
- **Files changed**: every file path mentioned
- **Decisions made**: any "decided to...", "chose X over Y", "rationale:" notes
- **Risks materialized**: any risk that actually occurred during apply
- **Tasks completed**: count + list of task IDs

Discard:
- Step-by-step implementation notes
- Intermediate states ("tried X, reverted")
- Boilerplate progress markers

### Step 3: Write compact summary

Format:

```markdown
## Completed: {change-name}
**Tasks**: {N} completed | **Archived**: {date}

### Files Changed
- `path/to/file.ts` — {one-line description}
- `path/to/other.ts` — {one-line description}

### Key Decisions
- {decision}: {why} → {outcome}

### Risks That Materialized
- {risk}: {what happened}

### Risks That Did NOT Materialize
- {risk}: confirmed safe
```

### Step 4: Save compacted artifact

```
mem_save(
  title: "sdd/{change}/compact",
  topic_key: "sdd/{change}/compact",
  type: "architecture",
  project: "{project}",
  content: "{compact summary from Step 3}"
)
```

### Step 5: Confirm

Report to user:
```
✅ Compacted: sdd/{change}/apply-progress → sdd/{change}/compact
   Original: ~{N} tokens → Compact: ~{M} tokens ({reduction}% reduction)
   Preserved: {file count} files, {decision count} decisions, {risk count} risks
```

---

## Rules

1. **Never delete the original apply-progress** — only create the compact version alongside it
2. **Preserve file paths exactly** — they're used for blame/archaeology later
3. **Decisions are the most valuable signal** — when in doubt, keep a decision note
4. **Run after archive, not before** — compaction assumes the change is fully closed
5. **Suggest, don't auto-run** — after sdd-archive completes, suggest: "Run /sdd-compact to reclaim context?"
