---
name: ai-coding-discipline
description: >
  Six concrete anti-patterns that AI agents consistently produce. Enforces discipline rules
  to prevent silent fallbacks, catch-all error handling, evergreen tests, hardcoded lookups,
  skipped TDD, and premature debug log removal.
  Trigger: When writing or reviewing AI-generated code, during code review, or when applying sdd-apply.
license: MIT
metadata:
  author: JNZader
  version: "1.0"
  tags: [ai-discipline, anti-patterns, code-quality, tdd]
  category: code-quality
  source: luoling8192/ai-coding-principles
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

## Purpose

AI coding agents produce predictable failure patterns. This skill defines six enforceable rules that catch the most common ones BEFORE they reach production. Apply these rules during code generation, review, and verification.

---

## When to Activate

- Writing new code via AI agent (sdd-apply, inline edits)
- Reviewing AI-generated code (PR review, sdd-verify)
- Any code change touching error handling, configuration, or tests
- When a bug slipped through because tests did not catch it

---

## The Six Rules

### Rule 1: No Silent Fallbacks

**Anti-pattern**: Using `??`, `||`, `?.` or default values without logging or explicit justification.

```typescript
// BAD — silent fallback hides bugs
const timeout = config.timeout ?? 3000;
const name = user?.name || 'Unknown';

// GOOD — explicit fallback with logging
const timeout = config.timeout ?? (() => {
  logger.warn('config.timeout missing, using default 3000ms');
  return 3000;
})();

// GOOD — guard clause instead of silent fallback
if (!user?.name) {
  throw new Error('User name is required but was undefined');
}
const name = user.name;
```

**Why**: Silent fallbacks mask configuration errors, missing data, and broken contracts. The system runs with wrong values and nobody knows until production breaks at 3 AM.

**Enforcement**: Every `??`, `||` default, and `?.` chain MUST have one of:
1. A log statement at warn level or above
2. A comment explaining WHY the fallback is safe
3. A guard clause that throws instead

---

### Rule 2: No Catch-All Try/Catch in Business Logic

**Anti-pattern**: Wrapping business logic in `try { ... } catch (e) { ... }` that catches everything.

```typescript
// BAD — catches everything, hides real bugs
try {
  const result = await processPayment(order);
  await sendConfirmation(result);
} catch (error) {
  logger.error('Something went wrong', error);
  return { success: false };
}

// GOOD — catch specific errors, let unexpected ones propagate
try {
  const result = await processPayment(order);
  await sendConfirmation(result);
} catch (error) {
  if (error instanceof PaymentDeclinedError) {
    return { success: false, reason: 'declined' };
  }
  if (error instanceof InsufficientFundsError) {
    return { success: false, reason: 'insufficient_funds' };
  }
  // Unknown errors propagate — they are bugs, not expected failures
  throw error;
}
```

**Why**: Catch-all blocks turn bugs into silent failures. A TypeError from a typo gets caught and logged as "something went wrong" instead of crashing loudly where you can fix it.

**Enforcement**: In business logic, `catch` blocks MUST either:
1. Check `instanceof` for specific error types
2. Re-throw unknown errors
3. Be in infrastructure code only (HTTP handlers, queue consumers) where catch-all is the boundary

---

### Rule 3: Tests Must Fail When Code Breaks

**Anti-pattern**: Tests that always pass regardless of implementation correctness.

```typescript
// BAD — test that never fails
it('should process data', () => {
  const result = processData(input);
  expect(result).toBeDefined(); // passes even if result is garbage
});

// BAD — test with no meaningful assertion
it('should handle edge case', () => {
  expect(() => processData(null)).not.toThrow(); // only checks no crash
});

// GOOD — test with specific assertions that break when logic changes
it('should calculate total with tax for US orders', () => {
  const order = createOrder({ items: [{ price: 100 }], country: 'US', state: 'CA' });
  const result = calculateTotal(order);
  expect(result.subtotal).toBe(100);
  expect(result.tax).toBe(7.25); // CA tax rate
  expect(result.total).toBe(107.25);
});
```

**Why**: A test that never fails is worse than no test — it gives false confidence. The whole point of testing is that it BREAKS when the code is wrong.

**Enforcement**: Every test MUST:
1. Assert specific values, not just `toBeDefined()` or `toBeTruthy()`
2. Verify the RED step — the test must fail before the implementation makes it pass
3. Test boundary conditions with concrete expected outputs

---

### Rule 4: No Hardcoded Lookup Tables

**Anti-pattern**: Embedding business data directly in code instead of configuration or database.

```typescript
// BAD — hardcoded lookup that will go stale
const TAX_RATES: Record<string, number> = {
  'CA': 0.0725,
  'NY': 0.08,
  'TX': 0.0625,
};

// BAD — hardcoded feature flags
const ENABLED_FEATURES = ['dark-mode', 'new-checkout', 'beta-search'];

// GOOD — load from configuration
const taxRates = await configService.get<TaxRateConfig>('tax.rates');

// GOOD — load from database with caching
const enabledFeatures = await featureFlagService.getEnabled(userId);
```

**Why**: Hardcoded lookups require code deployments to update. Tax rates change, feature flags need toggling, and business rules evolve. Code should encode LOGIC, not DATA.

**Enforcement**: Lookup tables with more than 3 entries MUST be externalized to:
1. Configuration files (environment-specific)
2. Database tables
3. Feature flag service
Exception: Truly constant mappings (HTTP status codes, enum labels) are acceptable.

---

### Rule 5: Red-Green TDD

**Anti-pattern**: Writing implementation first, then adding tests that pass on the first run.

```
# BAD workflow
1. Write implementation
2. Write test
3. Test passes immediately
4. Ship it (test might be testing nothing useful)

# GOOD workflow (Red-Green-Refactor)
1. Write test that describes the expected behavior
2. Run test — it MUST FAIL (RED)
3. Write minimum implementation to make it pass (GREEN)
4. Refactor while keeping tests green
5. Repeat
```

**Why**: If a test passes on the first run, you have no proof it can detect failure. The RED step is not optional — it is the verification that your test actually works.

**Enforcement**: When implementing features:
1. Write the test FIRST
2. Confirm it fails (screenshot, log, or explicit "RED confirmed" comment)
3. Write implementation
4. Confirm it passes
5. If a test passes immediately on first write, it is SUSPECT — review assertions

---

### Rule 6: Keep Debug Logs During Fixes

**Anti-pattern**: Removing diagnostic logging before the fix is verified.

```typescript
// During debugging — ADD instrumentation
logger.debug('[DEBUG-FIX-1234] Input payload:', JSON.stringify(payload));
logger.debug('[DEBUG-FIX-1234] Cache state:', cache.stats());
const result = processPayload(payload);
logger.debug('[DEBUG-FIX-1234] Result:', JSON.stringify(result));

// AFTER applying fix — keep logs until verified
// Tag: DEBUG-FIX-1234 — remove after QA sign-off on ticket #1234

// ONLY remove after:
// 1. Fix is deployed to staging
// 2. Fix is verified with real data
// 3. No regressions for at least one release cycle
```

**Why**: AI agents love to "clean up" by removing debug logs in the same PR as the fix. If the fix is wrong, you have lost all diagnostic context and have to re-instrument from scratch.

**Enforcement**:
1. Debug logs added during investigation stay until the fix is VERIFIED in a real environment
2. Tag all debug logs with a ticket/issue reference: `[DEBUG-FIX-XXXX]`
3. Removal of debug logs is a SEPARATE commit/PR after verification
4. Never remove debug logs in the same PR as the fix

---

## Quick Reference Checklist

Use this checklist during code review or sdd-verify:

```markdown
## AI Coding Discipline Check
- [ ] No silent `??`/`||` fallbacks without logging or justification
- [ ] No catch-all try/catch in business logic — specific error types only
- [ ] Tests assert specific values and fail when code breaks
- [ ] No hardcoded lookup tables (>3 entries) — use config/database
- [ ] TDD followed: test written first, RED confirmed before GREEN
- [ ] Debug logs tagged and kept until fix is verified in real environment
```

---

## Critical Rules

1. Every fallback operator (`??`, `||`, `?.`) MUST be logged or justified — no silent defaults
2. Business logic catch blocks MUST filter by error type and re-throw unknowns
3. Every test MUST fail when the code it tests is broken — no `toBeDefined()` assertions
4. Lookup tables with more than 3 entries MUST live in config or database, not code
5. Tests MUST be written before implementation and confirmed RED before GREEN
6. Debug logs MUST survive until the fix is verified in a real environment — never remove in the same PR
