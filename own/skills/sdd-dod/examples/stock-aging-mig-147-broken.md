# Case Study — `stock-aging-alerts` mig 147 (Shape C failure)

**Date**: 2026-05-06
**Session**: biogas-platform mega-session
**SDD**: `sdd/stock-aging-alerts/archive-report`
**Caught by**: GORM AutoMigrate transaction rollback at backend startup,
during the deploy step.
**Fix commit**: `5f3db224 fix(db): relax stock_alert_thresholds CHECK to
allow inverted warning/critical for type B/C`.

---

## What shipped

Migration 147 created `biogas_stock_alert_thresholds` with this CHECK:

```sql
CONSTRAINT chk_stock_alert_thresholds_values CHECK (
    warning_value > 0 AND critical_value > 0 AND critical_value >= warning_value
)
```

And then in the same transaction, seeded:

```sql
-- Type A (lots_in_playa) — more days = worse, critical > warning ✓
INSERT INTO biogas_stock_alert_thresholds VALUES
  ('cama_pollo', 30, 60), ('fog', 5, 10), ('silaje', 90, 180), ...

-- Type B (near_expiry) — fewer days remaining = worse
-- Natural thresholds: warning=7d remaining, critical=3d remaining
INSERT INTO biogas_stock_alert_thresholds VALUES (NULL, 7, 3);
                                              -- ^^^^ critical < warning!

-- Type C (runway_short) — same inversion as type B
INSERT INTO biogas_stock_alert_thresholds VALUES (NULL, 7, 3);
```

---

## What was broken

The CHECK constraint asserted `critical_value >= warning_value`, true for
type A but **inverted** for types B and C. The seed's own values violated
the constraint. PostgreSQL rolled back the entire transaction. Backend
container exited unhealthy on every startup attempt — the AutoMigrate
log buried the SQLSTATE 23514 error 30+ lines into the output.

---

## Why the orchestrator missed it

Local backend tests passed because:
- Unit tests on the threshold repo seeded only TYPE A rows manually
- The mig-test path used a synthetic test DB that received the
  migration without the seed

The first time the migration's seed actually executed against a real DB
was on Hetzner deploy. That's where it failed.

---

## What the DoD checklist would have caught

Shape C items:

- **C1 — Constraint expresses TRUE invariant**: would have surfaced "this
  invariant doesn't hold for type B/C".
- **C2 — Conditional or relaxed for polymorphic rows**: would have
  required either a CASE-based constraint OR a relaxed `> 0` constraint
  with the ordering invariant moved to application code.
- **C4 — Seed satisfies its own constraint**: the single most useful
  check. Would have caught the inversion in 30 seconds of careful reading.
- **C7 — Manual rehearsal**: would have surfaced the SQLSTATE on a fresh
  DB before deploy.

---

## Fix

Relaxed the CHECK to `warning_value > 0 AND critical_value > 0`. Per-type
ordering invariant is now enforced by the evaluator code (which already
handled both directions correctly per its unit tests).

---

## Lesson

**A CHECK constraint that hosts polymorphic semantics is a footgun.**
When a single column hosts multiple row classes with different
invariants, either:
1. Make the constraint conditional (`CASE WHEN type = 'A' THEN ... ELSE ...`)
2. Relax the SQL constraint to the lowest common denominator and enforce
   the per-class invariant in application code

Option 2 is usually cleaner. SQL is a poor place for type-dispatched
business rules.

This is now Shape C items C1, C2, C4 in `shapes/add-check-constraint.md`.
