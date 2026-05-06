# Case Study — React 19 SyntheticEvent in Setter Closure (Shape D × 6)

**Date**: 2026-05-05 / 2026-05-06
**Session**: biogas-platform mega-session
**Sites affected**: 6 occurrences across 4 components
**Caught by**: E2E test forcing keystroke into the dangerous field
(`e2e-coverage-laguna-inflow` Spec 2 was the first surface), then
audit `rg` patterns turned up the rest.
**Fix commits**:
- `fb29cdc7` — first 2 sites in `LagoonDashboard.tsx`
- `91b6b0ef` — 3 sites: `CustomAlertRulesPanel.tsx`, `LagoonDetail.tsx` ×2
- `3f0d88ab` — 6th site in `FifoProfilesAdmin.tsx`

---

## The pattern that shipped to prod

```tsx
onChange={(e) => setForm((prev) => ({
  ...prev,
  source_label: e.currentTarget.value || null,
}))}
```

The `setForm` updater is a closure over `e`. React 19 may evaluate the
updater function deferred (after the synthetic event has been GC'd or
nullified). When the updater runs, `e.currentTarget` is `null`,
`.value` raises `TypeError: Cannot read properties of null`, the
ErrorBoundary swallows the entire form, and the user sees "Algo salió
mal".

---

## What was broken

6 different forms across the codebase had this. 3 reached production
silently because the default form state didn't trigger the crash path
(e.g. the field was visible but most users never typed in it). The
other 3 reached production AND triggered the crash for users who
actually filled the form — but those crashes were mistaken for
unrelated React errors and went un-investigated.

---

## Why the orchestrator missed it (the first 5 times)

- Unit tests using `fireEvent.change(input, { target: { value: 'x' } })`
  PASS because the test framework constructs synthetic events that
  don't get GC'd by React's deferred-evaluation path.
- Component tests in isolation rarely exercise the React 19 deferred
  update timing.
- Visual smoke (open the page, click around) doesn't crash either —
  unless you actually TYPE into the field, the bug stays dormant.

The bug surfaces only when:
1. A real keystroke event fires (not a synthetic dispatch)
2. React schedules the setter for deferred execution

E2E tests with `page.fill()` or `page.type()` reliably trigger it.

---

## What the DoD checklist would have caught

Shape D items:

- **D1** — `rg` audit for the antipattern → would have found all 6 in 1
  command. Once the SDD is aware of the pattern, finding new violations
  is mechanical.
- **D4** — E2E spec exercising the typing path → would have surfaced
  each occurrence the first time the form was tested.

---

## The Safe Pattern (canonical fix)

```tsx
onChange={(e) => {
  const value = e.currentTarget.value;
  setForm((prev) => ({ ...prev, source_label: value || null }));
}}
```

Capture the value into a stable local `const` BEFORE entering the
setter closure. The closure now closes over `value` (a string), not
over `e` (a synthetic event with mutable `.currentTarget`).

Mantine's `useForm` is also safe — it passes `values` (pre-extracted)
to `onSubmit`, never SyntheticEvents.

---

## Lesson

**Any React 19 codebase with `(e) => setX(prev => ... e.currentTarget.value)`
is a ticking time bomb.** Until ESLint catches this (a custom rule could),
DoD Shape D has to grep the entire codebase on every relevant SDD.

Better: use a project-level lint rule + commit hook that blocks the
pattern at PR time. Filed as a future improvement; for now, DoD
Shape D items D1-D5 catch new occurrences and prevent regressions.

This is now Shape D in `shapes/frontend-form-onchange.md`.
