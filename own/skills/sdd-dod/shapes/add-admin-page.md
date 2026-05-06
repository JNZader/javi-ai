# Shape B — Add an Admin Page

When the SDD adds a new admin/configuration page (typically under
`/app/configuracion/...` or another route prefix), the page is useless
if users can't reach it. The most common miss: the route exists, the
component renders, but the navbar/sidebar has no entry for it.

**Real failures (this session)**:
- `feeding-fifo-suggest` + `feeding-fifo-multi-criteria`: shipped
  `/app/alimentacion` and `/app/configuracion/perfiles-fifo` without
  Sidebar entries. User couldn't reach either page until the orchestrator
  noticed them missing. See `../examples/sidebar-wiring-missed.md`.
- `stock-aging-alerts`: `/app/configuracion/umbrales-stock` had the same
  miss — caught at the same time.

---

## Detection signals

Run if ANY of:
- New file under `apps/*/src/routes/app/configuracion.*.tsx`
- New file under `apps/*/src/routes/app/*.tsx` representing a non-public route
- New CRUD endpoint group under `/api/v1/...` for admin entity management

---

## Checklist (10 items)

### Route + component

- [ ] **B1.** Route file exists at the expected path
  (`createFileRoute('/app/...')`) and exports a `Route` const.
- [ ] **B2.** Component renders without crashing when the user has the
  default seeded permissions (no manual KPI/feature flag toggles
  required to see the page).

### Backend (if CRUD endpoints introduced)

- [ ] **B3.** All CRUD verbs covered: GET list, POST create, PUT/PATCH
  update, DELETE soft-delete (or hard-delete with explicit decision).
- [ ] **B4.** RBAC: each endpoint declares the required role
  (admin/operator). No silent "everyone can hit this" defaults.
- [ ] **B5.** Default-protect: any seeded `is_default=true` row cannot be
  deleted via the admin UI/endpoint. (Avoid orphaning configs.)

### Sidebar wiring (the one most often missed)

- [ ] **B6.** Sidebar entry added to `Sidebar.tsx` (or equivalent), with:
  - `label`: Spanish per project convention
  - `icon`: import added at top of file
  - `href`: matches the route path exactly
- [ ] **B7.** If the page is gated by feature flag / role, the sidebar
  entry uses the same gate (don't show what user can't access).
- [ ] **B8.** Sidebar test asserts the entry's presence and href correctness.
  If a prior test asserted ABSENCE (`not.toContain('FooBar')`), update
  it — orphaned negative assertions block legitimate additions.

### UX / accessibility

- [ ] **B9.** Empty state copy in Spanish ("No hay X cargados todavía.").
- [ ] **B10.** Page title in Spanish, breadcrumb (if used) consistent
  with sibling configuration pages.

---

## Failure modes captured here

1. **Route shipped, navbar missing** (multiple this session): users typed
   URLs to discover the feature. Item B6/B8 catches this.

2. **Default profile deletable** (hypothetical, prevented by SDD-2): the
   `Default` FIFO profile MUST stay deletion-protected because removing
   it leaves orgs without a fallback. Item B5 catches this.

3. **Negative assertion lingering** (`Sidebar.test.ts`): older test asserted
   `Alimentacion not in sidebar`. When we re-introduced it, the test
   started failing. Item B8 catches this — update or remove negative
   assertions when re-introducing.
