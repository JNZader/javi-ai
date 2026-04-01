---
name: adversarial-review
description: >
  Multi-perspective adversarial code review — security, quality, and test perspectives review in parallel, then synthesize.
  Trigger: When doing code review, running /workflow:review, or validating changes before merge.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.1"
---

# Adversarial Review

Multi-perspective adversarial code review that catches issues no single reviewer ever could.

## Core Principle

Three specialized reviewers with deep, narrow focus review the SAME diff simultaneously, then a synthesizer merges their findings. Disagreements between perspectives are signal, not noise.

```
          Code Change
              │
   ┌──────────┼──────────┐
   ▼          ▼          ▼
Security   Quality     Test
   │          │          │
   └──────────┼──────────┘
              ▼
         Synthesizer
              ▼
        Final Report
```

**Use for**: Security-sensitive changes, 5+ file PRs, new features, critical refactors.
**Skip for**: Doc-only changes, dependency bumps, typo fixes, config-only changes.

---

## The Three Perspectives

Each reviews the EXACT same diff independently — no communication during review.

### Security Perspective

**Question**: "How could an attacker exploit this change?"

| Category | Focus |
|----------|-------|
| Injection | SQL, XSS, command, template |
| Auth | Broken flows, missing checks, tokens |
| AuthZ | Privilege escalation, IDOR, access controls |
| Data Exposure | Sensitive data in logs, errors, URLs |
| Input Validation | Missing sanitization, type confusion |
| Secrets | Hardcoded credentials, API keys |

Severity: CRITICAL (blocks always) > HIGH (should block) > MEDIUM (address before merge) > LOW (advisory)

Output: `[SEC-NNN] Title | Severity | File:line | Category | Evidence | Attack scenario | Fix`

### Quality Perspective

**Question**: "Will this be readable, maintainable, and correct in 6 months?"

| Category | Focus |
|----------|-------|
| SOLID | Single responsibility, dependency inversion |
| Complexity | Deep nesting, long functions, god classes |
| Type Safety | `any` types, unsafe casts, null checks |
| Error Handling | Swallowed exceptions, generic catch |
| Naming | Unclear variables, misleading functions |
| Patterns | Anti-patterns, framework misuse |

Score: 9-10 (approve) > 7-8 (approve w/comments) > 5-6 (request changes) > 3-4 (blocking) > 1-2 (rewrite)

Output: `[QUA-NNN] Title | Severity | File:line | Principle | Current | Suggested | Rationale`

### Test Perspective

**Question**: "What scenarios are NOT tested that should be?"

| Category | Focus |
|----------|-------|
| Coverage Gaps | New paths without tests |
| Edge Cases | Boundary values, empty, null, unicode |
| Error Paths | Network failures, timeouts, invalid data |
| Integration | API contract changes, missing mocks |
| Regression | Changed behavior, removed tests |
| Test Quality | Brittle tests, implementation-coupled |

Risk: HIGH (production incident likely) > MEDIUM (edge cases cause bugs) > LOW (nice to have)

Output: `[TST-NNN] Title | Risk | File:line | Scenario | Test type | Why it matters | Suggested test`

> @reference references/prompt-templates.md — Load when constructing the actual sub-agent prompts for each perspective and the synthesizer

---

## The Review Pipeline

```
1. Collect Changes ──► git diff (staged or branch comparison)
2. Launch 3 parallel sub-agents (one per perspective, same diff)
3. Independent Findings (no cross-communication)
4. Synthesize ──► merge, deduplicate, cross-reference
5. Prioritize ──► consensus algorithm
6. Final Report ──► structured markdown with action items
```

**Important**: Always provide full file context alongside the diff — diffs alone are misleading.

---

## Consensus Algorithm

```
┌─────────────────────┬──────────┬──────────────────────┐
│ Condition           │ Priority │ Blocking?            │
├─────────────────────┼──────────┼──────────────────────┤
│ Security CRITICAL   │ P0       │ ALWAYS blocks        │
│ Security HIGH       │ P1       │ Blocks by default    │
│ 3/3 agree (any sev) │ P1       │ Blocks               │
│ 2/3 agree (any sev) │ P2       │ Blocks if HIGH+      │
│ 1/3 flags HIGH      │ P2       │ Recommend fix        │
│ 1/3 flags MEDIUM    │ P3       │ Advisory             │
│ Disputed            │ P3       │ Flag for human       │
└─────────────────────┴──────────┴──────────────────────┘
```

**Verdicts**: P0/P1 → BLOCK | P2 only → REQUEST_CHANGES | P3/P4 only → APPROVE with comments | None → APPROVE

**Dispute resolution**: State both positions, evaluate evidence, default to caution (security wins ties), flag balanced disputes for human review.

> @reference references/code-examples.md — Load when implementing the review workflow, writing CI pipelines, or generating report templates

> @reference references/configuration.md — Load when configuring verify.yaml, pipeline stages, custom perspectives, or environment variables

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `/workflow:review` | Full adversarial review on current branch |
| `/verify-changes` | Complete pipeline (lint → test → review) |
| `/verify-changes --skip-to=review` | Skip to review only |

| Prefix | Perspective | | Level | Blocks? |
|--------|-------------|-|-------|---------|
| `SEC-` | Security | | CRITICAL | Always |
| `QUA-` | Quality | | HIGH | Default |
| `TST-` | Test | | MEDIUM | Configurable |
| `SYN-` | Synthesizer | | LOW | Never |
