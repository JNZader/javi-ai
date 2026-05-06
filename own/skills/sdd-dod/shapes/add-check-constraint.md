# Shape C — Add a CHECK Constraint in a Migration

CHECK constraints encode invariants. The classic failure mode: the
constraint encodes an assumption that's true for SOME rows but false for
OTHERS the same migration tries to seed. The transaction fails on the
first violating insert, rolling back the entire migration including the
table creation. Backend startup hangs on `BEGIN/COMMIT` failure.

**Real failure**: `stock-aging-alerts` mig 147 declared
`CHECK (warning_value > 0 AND critical_value > 0 AND critical_value >= warning_value)`,
correct for type A (lots-in-playa: more days = worse, so critical > warning)
but **inverted** for type B (near_expiry) and type C (runway_short) where
fewer days = worse and the natural thresholds are warning=7d, critical=3d.
The migration's own seed inserted those values and rolled back the entire
transaction. Backend exited unhealthy on every startup. Fixed by relaxing
the constraint to just positivity. See
`../examples/stock-aging-mig-147-broken.md`.

---

## Detection signals

Run if ANY of:
- New `CHECK (...)` clause in a migration file
- New `ADD CONSTRAINT chk_...` clause in a migration file

---

## Checklist (8 items)

### Constraint design

- [ ] **C1.** The constraint expresses a TRUE invariant — not just a
  convention assumed to hold today. If the table hosts polymorphic rows
  (multiple alert types, multiple substrate kinds), make sure the
  invariant holds across ALL row classes.
- [ ] **C2.** If invariant differs by row class, the constraint is
  conditional (`CASE WHEN type = 'X' THEN ... ELSE ... END`) OR delegated
  to application code (relaxed SQL constraint to basics like positivity).
- [ ] **C3.** Constraint name follows project convention
  (`chk_<table>_<purpose>` typically).

### Seed data discipline

- [ ] **C4.** **The migration's own seed data satisfies its own constraint.**
  This is the #1 historical failure: `INSERT ... VALUES (warning=7, critical=3)`
  + `CHECK (critical >= warning)` = transaction rollback. Re-read every
  seed row against every constraint before committing.
- [ ] **C5.** If the seed comes from an `ON CONFLICT DO NOTHING` pattern,
  ensure the partial unique index it relies on actually exists in the
  same migration (or earlier).

### Down-migration discipline

- [ ] **C6.** DOWN migration drops the constraint cleanly
  (`ALTER TABLE ... DROP CONSTRAINT IF EXISTS chk_...`).

### Verification

- [ ] **C7.** **Manual rehearsal**: in dev, drop the table + run the up
  migration end-to-end + verify it completes successfully. Don't trust
  GORM AutoMigrate to surface the error — sometimes the rollback message
  is buried in logs and the container appears unhealthy without obvious
  cause.
- [ ] **C8.** Integration test inserts a row that should violate the
  constraint and asserts the violation is raised. Otherwise a future
  refactor can silently relax the invariant.

---

## Failure modes captured here

1. **Polymorphic ordering inversion** (`stock-aging-alerts` mig 147):
   single column hosting multiple semantics (warning>critical for type A,
   warning<critical for B/C). Item C1/C2 catches this.

2. **Self-violating seed** (same SDD): mig's own seed broke its own CHECK.
   Item C4 catches this.

3. **Partial unique index ignored by GORM** (mig 144 design pattern):
   GORM consults `information_schema.table_constraints`, which excludes
   partial unique indexes. If you rely on a partial unique index for
   GORM-aligned uniqueness, you're going to have a bad time. Item C5
   catches it as a warning to use full unique constraints OR document
   the partial index as deliberate.
