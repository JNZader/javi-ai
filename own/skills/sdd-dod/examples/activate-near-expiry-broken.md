# Case Study — `activate-near-expiry-alerts` (Shape A failure)

**Date**: 2026-05-06
**Session**: biogas-platform mega-session
**SDD**: `sdd/activate-near-expiry-alerts/archive-report`
**Caught by**: TDD in follow-up SDD `e2e-coverage-stock-alerts-type-b`,
commit `d4dbd4dc`.
**Time-to-detection**: ~2 hours after archive (during the very next SDD).

---

## What shipped

The SDD activated type B near_expiry alerts for stock-aging. It included:

- ✅ Migration 148: `expiry_date TIMESTAMPTZ NULL` column on
  `biogas_substrate_entries` + partial index
- ✅ GORM model `SubstrateEntry.ExpiryDate *time.Time`
- ✅ Frontend form: `<DatePickerInput label="Fecha de vencimiento">` in
  IngresosPage create + edit (after `8f56c36b` hydration fix)
- ✅ Evaluator type B in service layer
- ✅ Worker wiring (5-min cadence)
- ✅ `criteria-availability` endpoint flips `near_expiry: true` when
  any lot has non-NULL expiry

---

## What was broken (silently)

- ❌ `CreateSubstrateEntryRequest` DTO had no `expiry_date` field
- ❌ `UpdateSubstrateEntryRequest` DTO had no `expiry_date` field
- ❌ `SubstrateEntryResponse` DTO had no `expiry_date` field
- ❌ Service Create/Update inputs did not pass through `expiry_date`
- ❌ Handler mapping never touched the column

Result: form sent `expiry_date` in the payload → handler unmarshaled
into a struct without that field → field silently discarded → DB column
stayed NULL forever. GET responses never returned the column either, so
the form's edit-hydration always saw `undefined` and the form's submit
always cleared the column on save.

---

## Why the orchestrator missed it

The pre-archive smoke ONLY hit `GET /criteria-availability`. That
endpoint reads the column directly via SQL (`SELECT EXISTS (...)`), which
PASSES regardless of whether the form path works. The orchestrator
declared "endpoint healthy → feature works", but the form path was dead.

**The smoke verified one path. It didn't verify the path users actually
take.**

---

## What the DoD checklist would have caught

Shape A items:

- **A6 — CreateRequest DTO accepts field**: would have surfaced "no
  expiry_date in CreateSubstrateEntryRequest".
- **A7 — UpdateRequest DTO accepts field**: same for update.
- **A8 — Response DTO returns field**: same for response.
- **A11 — Round-trip API smoke**: POST with expiry_date → GET → assert
  persisted. This single step would have caught the entire bug class.

---

## Fix

Single commit `d4dbd4dc feat(logistics): propagate expiry_date through
Create/Update DTOs + response`. Pure additive, no breaking changes.

---

## Lesson

**A round-trip POST → GET smoke is required for any new column on a
user-edited entity.** Reading the column directly via a side-channel
endpoint (criteria-availability, dashboard query, etc.) does NOT prove
the form-driven path works.

This is now Shape A item A11 in `shapes/add-column-to-entity.md`.
