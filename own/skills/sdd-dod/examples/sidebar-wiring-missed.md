# Case Study — Sidebar Wiring Missed (Shape B failure × 3)

**Date**: 2026-05-05 / 2026-05-06
**Session**: biogas-platform mega-session
**SDDs affected**:
- `sdd/feeding-fifo-suggest` — `/app/alimentacion`
- `sdd/feeding-fifo-multi-criteria` — `/app/configuracion/perfiles-fifo`
- `sdd/stock-aging-alerts` — `/app/configuracion/umbrales-stock`

**Caught by**: User asking "no encuentro alimentación...no veo cómo
llegar ahí" after deploy.
**Fix commits**: `aee50b64`, then later `+IconAlertTriangle import`.

---

## What shipped

3 SDDs in a row added new admin/configuration pages with all the
backend + frontend pieces:

- ✅ Route created (`createFileRoute('/app/alimentacion')` etc.)
- ✅ Component renders correctly
- ✅ Backend CRUD endpoints functional
- ✅ Permissions correct
- ✅ Spanish copy correct
- ❌ **Sidebar entry NOT added**

---

## What was broken

Users could only reach the new pages by typing the URL directly. The
navbar has no entry for any of:
- `/app/alimentacion`
- `/app/configuracion/perfiles-fifo`
- `/app/configuracion/umbrales-stock`

Worse: a previous test (`Sidebar.test.ts:86`) explicitly asserted
`expect(labels).not.toContain('Alimentacion')` — a leftover from when
the page was deliberately removed in some earlier cleanup. When the
new SDD re-introduced the route, this negative assertion became a
regression that needed flipping.

---

## Why the orchestrator missed it

The orchestrator's sub-agents focused on the route + component +
backend. The "is this discoverable from the navbar?" check is a
different file (`Sidebar.tsx`) that's not naturally on the diff path.
Each sub-agent saw a focused scope and missed the navbar layer.

User noticed because: the actual prod use case starts from the navbar,
not from the URL. Anything not in the navbar might as well not exist
for the average operator.

---

## What the DoD checklist would have caught

Shape B items:

- **B6 — Sidebar entry added with label/icon/href**: would have flagged
  zero matches in `Sidebar.tsx` for the new route.
- **B7 — Same gating as the page**: the `Perfiles FIFO` entry should
  share whatever role gate the page uses (default: any authenticated
  user). Easy to forget when copy-pasting from a sibling.
- **B8 — Sidebar test asserts presence**: would have noticed the
  negative assertion (`not.toContain('Alimentacion')`) and required
  flipping it to a positive assertion.

---

## Fix

Single commit per cycle adding:
1. Icon import at top of `Sidebar.tsx` (`IconChefHat`,
   `IconAdjustmentsHorizontal`, `IconAlertTriangle`)
2. Entry in the matching module (Operaciones for Alimentación,
   Administración → Configuración submenu for the others)
3. Updated `Sidebar.test.ts` — replaced the negative assertion with two
   positive assertions for the new entries

---

## Lesson

**Routes without navbar entries are dead routes.** Every new admin
page SDD must include a Sidebar wiring step in its tasks list. The
fact that it's "trivial" doesn't mean it's automatic — the diff is in
a file the page-focused sub-agent often doesn't touch.

Bonus lesson: **negative assertions in nav tests are landmines.** When
you intentionally remove a feature, asserting its absence makes sense.
But when you might re-introduce it later (you usually do), the
assertion becomes a regression block. Prefer "the sidebar contains
exactly these labels: [...]" over "doesn't contain X" when possible —
forces conscious updating instead of silent collision.

This is now Shape B items B6, B7, B8 in `shapes/add-admin-page.md`.
