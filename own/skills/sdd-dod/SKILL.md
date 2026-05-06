---
name: sdd-dod
description: >
  Definition-of-Done checklist enforcer for SDDs. Detects the change "shape"
  (new column, new admin page, new CHECK constraint, frontend onChange form)
  and runs the matching shape-specific checklist before allowing sdd-archive
  to mark a change COMPLETE. Captures hard-earned lessons from real shipped
  bugs to prevent the same class of failure on future SDDs.
  Trigger: invoked by sdd-verify before persisting verify-report, or
  manually via /sdd-dod {change-name}.
license: Apache-2.0
metadata:
  author: javi-ai
  version: "1.0"
  tags: [sdd, quality-gate, checklist, regression-prevention]
  category: workflow
allowed-tools: Read, Bash, Glob, Grep, mcp__plugin_engram_engram__mem_search, mcp__plugin_engram_engram__mem_get_observation, mcp__plugin_engram_engram__mem_save
---

## Purpose

Most "shipped but dead" bugs come from the same set of SDD shape blind spots:
implementations that pass unit tests at the layer the SDD focused on, but
silently fail at adjacent layers (DTOs, navbar, migration seed data, React
event semantics) that the SDD did not exercise.

`sdd-dod` is the gate that runs BEFORE `sdd-archive` accepts a change as
COMPLETE. It detects the shape(s) the change touched and runs the matching
checklist. A failed item does NOT block the archive — it forces the
orchestrator to either fix it now or document the gap explicitly in the
archive-report's "Open Items" section.

The skill is grounded in real failures. Each shape ships with a case
study from the biogas-platform 2026-05-06 mega-session.

---

## When to Activate

- Invoked automatically by `sdd-verify` (override) before writing the
  verify-report — see Integration Point below.
- Invoked manually via `/sdd-dod {change-name}` to audit any change at
  any phase.
- Invoked retroactively to audit an already-archived change for missed
  gaps (e.g. "did we miss DTO additions in `activate-near-expiry-alerts`?").

Do NOT activate:
- For pure infra-only SDDs that touch zero application code (e.g.
  `wire-prometheus-stack-metrics` — uses `sdd-dod` shape "infra-only-yaml"
  if/when added, NOT the application shapes).
- For docs-only SDDs.

---

## Shape Catalogue

| Shape | When to apply | Reference |
|-------|---------------|-----------|
| **A. add-column-to-entity** | New column on a user-edited DB entity | `shapes/add-column-to-entity.md` |
| **B. add-admin-page** | New `/app/configuracion/...` or admin CRUD page | `shapes/add-admin-page.md` |
| **C. add-check-constraint** | New SQL CHECK in migration | `shapes/add-check-constraint.md` |
| **D. frontend-form-onchange** | Any TextInput/Textarea/NumberInput controlled with onChange | `shapes/frontend-form-onchange.md` |

A single SDD can touch multiple shapes — run ALL matching checklists.

---

## Steps

### Step 1: Load the change context

```
mem_search(query: "sdd/{change-name}/spec", project: "{project}")
mem_get_observation(id: {result})
```

Also load `proposal`, `design`, `apply-progress` to understand scope.

### Step 2: Detect shape(s)

Read the design + apply-progress + git diff (since the SDD's branch point) to
detect which shape(s) apply:

| Signal | Shape |
|--------|-------|
| New `migrations/NNN_*.sql` adding a column to existing table | A |
| New `routes/app/configuracion.*.tsx` OR new admin CRUD endpoints | B |
| New `CHECK (...)` clause in any migration | C |
| Any `(e) => setX(...)` or `(e) => form.setFieldValue(...)` in `*.tsx` | D |

A single SDD can match multiple shapes. Record all matches.

### Step 3: Run each shape's checklist

For each detected shape, open `shapes/{shape}.md` and walk through every
item. Mark each as:

- ✅ **PASS** — verified item satisfied
- ❌ **FAIL** — item NOT satisfied, link to evidence
- ⚠️ **N/A** — item explicitly does not apply (justify)

Failures must include either:
- A FIX commit hash (item now resolved)
- An entry in archive-report's "Open Items" with rationale for deferring

### Step 4: Persist a DoD report

Save as a separate artifact (NOT inside verify-report):

```
mem_save(
  title: "sdd/{change-name}/dod-report",
  topic_key: "sdd/{change-name}/dod-report",
  type: "architecture",
  project: "{project}",
  content: "{markdown report — see Output Format below}"
)
```

### Step 5: Gate the archive

If ANY checklist item is ❌ AND has no FIX commit AND no Open Items entry,
return `status: blocked` to the orchestrator. The orchestrator must either
ship a fix commit or explicitly accept the gap as a documented Open Item
before sdd-archive proceeds.

If all items are ✅, ⚠️, or ❌-with-fix-or-deferred, return `status: pass`.

---

## Output Format

```markdown
# DoD Report — {change-name}

**Status**: pass | blocked
**Date**: 2026-MM-DD
**Shapes detected**: {comma-separated list}

## Shape A: add-column-to-entity

| # | Item | Status | Evidence / Fix |
|---|------|--------|----------------|
| 1 | Migration up + down | ✅ | mig 148 |
| 2 | GORM model field | ✅ | substrate_entry.go |
| 3 | CreateRequest DTO accepts field | ❌ → ✅ | fix d4dbd4dc |
| ... | ... | ... | ... |

## Shape D: frontend-form-onchange

(items)

## Open Items (failed without fix)

- {none, or list with rationale}
```

---

## Integration Point

The override at `delta/overrides/sdd-verify/SKILL.md` adds a new step:

```
Before persisting the verify-report, invoke sdd-dod via:
  Read: skills/sdd-dod/SKILL.md
  Run: Steps 1-4 above
  If status: blocked → return to orchestrator without writing verify-report
  If status: pass → continue with normal verify-report persistence
```

The override file is shipped alongside this skill.

---

## Critical Rules

1. **Never silently skip a shape**. If a shape is detected but not applicable,
   record it as ⚠️ N/A with a one-sentence justification.
2. **Reference real evidence**, not promises. "I checked" is not evidence;
   `commit abc1234`, `bat path/file.go --line-range=X:Y`, or
   `go test ./... -run TestX` output is.
3. **Failed items become Open Items**, not silent regressions. If you can't
   fix it now, document it explicitly.
4. **Case studies are read-only**. Never modify `examples/*.md` to remove
   embarrassing failures — they exist to prevent repetition.
5. **Update shapes when new failure modes are discovered**. After every
   "shipped but dead" bug, add it to the relevant shape's checklist.

---

## Discovery Sources

The shape catalogue is grounded in real failures. See `examples/`:

- `examples/activate-near-expiry-broken.md` — Shape A: backend DTOs missed
- `examples/stock-aging-mig-147-broken.md` — Shape C: CHECK constraint inversion
- `examples/sidebar-wiring-missed.md` — Shape B: route shipped without navbar entry
- `examples/react19-syntheticevent-antipattern.md` — Shape D: 6 sites broken
