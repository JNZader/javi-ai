# Shape D — Frontend Form with onChange (React 19)

React 19 may evaluate `useState` setter functions deferred. By the time
the setter runs, the SyntheticEvent's `currentTarget` may be null. Reading
`e.currentTarget.value` INSIDE the setter closure crashes the form with
`TypeError: Cannot read properties of null (reading 'value')`. The
ErrorBoundary swallows the entire form, leaving the user staring at
"Algo salió mal".

**Real failure**: 6 sites in this session shipped with this antipattern
(`LagoonDashboard.tsx` ×2, `LagoonDetail.tsx` ×2, `CustomAlertRulesPanel.tsx`,
`FifoProfilesAdmin.tsx`). 3 reached production silently because the
default form state didn't trigger the crash path. The 4th-6th occurrences
were caught only when E2E tests forced typing into the dangerous fields.
See `../examples/react19-syntheticevent-antipattern.md`.

---

## Detection signals

Run if ANY of:
- New `*.tsx` file containing `onChange={...}`
- Modified file with onChange handlers near `setX(prev => ...)` patterns

---

## The Anti-Pattern (what to FAIL on)

```tsx
// ❌ DEAD ON ARRIVAL — crashes in React 19
onChange={(e) => setForm((prev) => ({ ...prev, name: e.currentTarget.value }))}

// ❌ same disease, slightly different symptom
onChange={(e) =>
  setForm((prev) => ({
    ...prev,
    description: e.currentTarget.value || null,
  }))
}
```

## The Safe Patterns (what to PASS on)

```tsx
// ✅ Capture value BEFORE the setter closure
onChange={(e) => {
  const value = e.currentTarget.value;
  setForm((prev) => ({ ...prev, name: value }));
}}

// ✅ Helper that takes value as a pre-extracted argument (fine)
const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
  setForm((prev) => ({ ...prev, [key]: value }));
// ...
onChange={(e) => updateField('name', e.currentTarget.value)}

// ✅ Mantine useForm — it passes pre-extracted `values`, not events
onSubmit={async (values) => { /* values.name is safe */ }}
```

---

## Checklist (5 items)

- [ ] **D1.** Run `rg -nU 'set[A-Z][a-zA-Z]*\(\([a-zA-Z]+\)\s*=>\s*[\(\{][^)]*?e(vent)?\.(currentTarget|target)\.value' apps/*/src/`
  → MUST return zero results.
- [ ] **D2.** Run the same regex against `apps/mobile/src/` if applicable.
- [ ] **D3.** Run `rg -nU 'setTimeout\(.*=>|setInterval\(.*=>|\.then\(.*=>'`
  in src/ and grep the result for `e\.currentTarget|event\.currentTarget`.
  Async deferred handlers have the same closure issue. MUST return zero
  results.
- [ ] **D4.** For each form added/modified by the SDD, an E2E spec or
  unit test exercises the typing path on EVERY controlled input. (Not
  just submit — the bug fires on first keystroke.)
- [ ] **D5.** Hot fixes for this antipattern follow the canonical commit
  message:
  `fix(forms): capture event.currentTarget.value outside setState closure (N more sites)`
  so future audits via `git log --grep` find them.

---

## Failure modes captured here

1. **6 sites in one session** (this codebase): same pattern, repeated by
   different commits. Future fix: lint rule (eslint-plugin custom?) that
   blocks the pattern at PR time. Until then, item D1 in DoD.

2. **Caught only by E2E typing**: unit tests on the form using
   `fireEvent.change(input, { target: { value: 'x' } })` PASS because the
   synthetic event is constructed cleanly. Real browser keystrokes
   produce events that React schedules differently. Item D4 catches this.

3. **Async onChange from Mantine `useForm`**: NOT susceptible — `useForm`
   passes `values` (pre-extracted), not events. Document as the canonical
   safe replacement when refactoring.
