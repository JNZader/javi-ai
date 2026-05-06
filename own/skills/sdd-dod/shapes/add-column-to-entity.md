# Shape A — Add Column to a User-Edited Entity

When the SDD adds a new DB column to an existing table that users edit
through forms, every layer between SQL and the form input has to know
about it. Missing any one layer = silent dropout.

**Real failure**: `activate-near-expiry-alerts` shipped DB column + GORM
model + form field BUT not the request/response DTOs. POST silently
dropped `expiry_date`, GET never returned it. Caught only by E2E TDD
in a follow-up SDD. See `../examples/activate-near-expiry-broken.md`.

---

## Detection signals

Run if ANY of:
- New `ALTER TABLE ... ADD COLUMN` in a migration
- New field added to a GORM model that maps to an existing table
- New form field added that maps to an existing entity

---

## Checklist (12 items)

### DB layer

- [ ] **A1.** Migration UP creates the column with correct type, nullability, default.
- [ ] **A2.** Migration DOWN drops the column (`ALTER TABLE ... DROP COLUMN IF EXISTS`).
- [ ] **A3.** If the column has a UNIQUE constraint via GORM `uniqueIndex`,
  the SQL uses `uni_<table>_<column>` constraint name (NOT
  `<table>_<column>_key`). See CLAUDE.md "GORM AutoMigrate Conventions".
- [ ] **A4.** If the column has a partial UNIQUE INDEX (e.g. soft-delete-aware),
  use `CREATE UNIQUE INDEX ... WHERE ...` — GORM ignores partial indexes
  (skipped by `information_schema.table_constraints`).

### Backend code layer

- [ ] **A5.** GORM model has the field with proper `gorm:` and `json:` tags.
  Use `*time.Time` / pointer for nullable columns.
- [ ] **A6.** **CreateRequest DTO** has the field (matching JSON tag).
- [ ] **A7.** **UpdateRequest DTO** has the field with PATCH semantics
  documented (nil=ignore, ""=clear, value=set).
- [ ] **A8.** **Response DTO** returns the field with `omitempty` so legacy
  clients aren't broken.
- [ ] **A9.** Service layer Create/Update inputs include the field.
- [ ] **A10.** Handler maps DTO ↔ service input/output for the new field.

### Verification layer (the one most often skipped)

- [ ] **A11.** **Round-trip API smoke**: POST with the new field's value →
  GET → assert persisted; PUT with `""` → GET → assert NULL. Run via
  `curl` or Playwright `request` fixture, NOT just unit tests on the
  repo (the repo path can pass while the handler silently drops).
- [ ] **A12.** Frontend form: when entity is loaded for edit,
  `setValues({...})` includes the new field; otherwise edit hydration
  silently shows blank and submitting clears the column on save.

---

## Failure modes captured here

1. **DTO drop-on-floor** (`activate-near-expiry-alerts`): handler accepted
   the request body as a struct missing the field → field silently
   discarded. Item A6/A7/A8 catches this.

2. **Edit-form blank-out** (`activate-near-expiry-alerts` related fix
   `8f56c36b`): `handleEditEntry` set values without including the new
   field → editing always cleared it on save. Item A12 catches this.

3. **GORM constraint name mismatch** (mig 140 historical): SQL used
   default `<table>_<column>_key` instead of `uni_<table>_<column>` →
   GORM AutoMigrate failed at next backend start. Item A3 catches this.
