---
name: adversarial-review
description: >
  Multi-perspective adversarial code review — security, quality, and test perspectives review in parallel, then synthesize.
  Trigger: When doing code review, running /workflow:review, or validating changes before merge.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

# Adversarial Review

Multi-perspective adversarial code review that catches issues no single reviewer ever could.

---

## Table of Contents

1. [Core Principle](#core-principle)
2. [The Three Perspectives](#the-three-perspectives)
3. [The Review Pipeline](#the-review-pipeline)
4. [Implementation with Sub-Agents](#implementation-with-sub-agents)
5. [The /verify-changes Pipeline](#the-verify-changes-pipeline)
6. [Report Format](#report-format)
7. [Consensus Algorithm](#consensus-algorithm)
8. [Code Examples](#code-examples)
9. [Anti-Patterns](#anti-patterns)
10. [Configuration Reference](#configuration-reference)

---

## Core Principle

### Why Adversarial Review Beats Single-Perspective

Traditional code review follows a familiar pattern: one reviewer reads a diff, applies their
general knowledge, approves or requests changes. This model has a fundamental flaw — **a single
reviewer carries a single set of biases, blind spots, and priorities**.

A security-focused reviewer might approve a function that is safe but unmaintainable. A quality-focused
reviewer might approve elegant code that leaks sensitive data in error messages. A test-focused reviewer
might approve well-tested code that tests the wrong invariants.

**Adversarial review solves this by design.**

### How It Works

Instead of one reviewer with broad, shallow coverage, adversarial review deploys **three specialized
reviewers with deep, narrow focus** — each reviewing the SAME diff simultaneously:

```
                    ┌─────────────────┐
                    │   Code Change   │
                    │   (git diff)    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │  Security  │  │  Quality   │  │    Test     │
     │ Perspective│  │ Perspective│  │ Perspective │
     └─────┬──────┘  └─────┬──────┘  └──────┬─────┘
           │               │                │
           └───────────────┼────────────────┘
                           ▼
                  ┌─────────────────┐
                  │   Synthesizer   │
                  │  (merge + rank) │
                  └────────┬────────┘
                           ▼
                  ┌─────────────────┐
                  │  Final Report   │
                  │  (action items) │
                  └─────────────────┘
```

### The Key Insight: Constructive Disagreement

The perspectives are designed to **actively disagree**:

- The Security reviewer flags a function as risky because it handles user input.
- The Quality reviewer approves the same function because it follows SOLID principles.
- The Test reviewer notes the function lacks edge case coverage for malformed input.

These disagreements are not noise — they are **signal**. The synthesis phase examines each
disagreement, weighs evidence, and produces a prioritized action list that no single perspective
would have generated alone.

### What This Catches That Traditional Review Misses

| Scenario | Traditional Review | Adversarial Review |
|----------|-------------------|-------------------|
| SQL injection in well-structured code | Likely missed (code looks clean) | Security catches it |
| Untested error path in secure code | Likely missed (security is fine) | Test perspective catches it |
| Complex but safe authentication flow | Might flag as too complex | Quality + Security together decide |
| Well-tested code with data leak | Likely missed (tests pass) | Security flags the leak |
| Elegant code with no integration tests | Likely approved | Test perspective flags the gap |

### When to Use Adversarial Review

**Use it for:**
- Pull requests with security-sensitive changes (auth, payments, data access)
- Changes touching more than 5 files
- New feature implementations
- Refactors that touch critical paths
- Pre-merge validation on protected branches
- Any change where the cost of a bug is high

**Skip it for:**
- Documentation-only changes
- Dependency version bumps (use automated tools instead)
- Single-line typo fixes
- Config changes with no logic

---

## The Three Perspectives

Each perspective reviews the EXACT same diff but through a fundamentally different lens.
They do not communicate with each other during review — independence is critical for catching
issues that groupthink would suppress.

### Security Perspective

**Identity**: You are a senior application security engineer performing a security-focused
code review. You think like an attacker.

**Primary Question**: "How could an attacker exploit this change?"

**Focus Areas**:

| Category | What to Look For |
|----------|-----------------|
| **Injection** | SQL injection, XSS, command injection, LDAP injection, template injection |
| **Authentication** | Broken auth flows, missing checks, token handling, session management |
| **Authorization** | Privilege escalation, IDOR, missing access controls, role bypass |
| **Data Exposure** | Sensitive data in logs, error messages, responses, comments, or URLs |
| **Cryptography** | Weak algorithms, hardcoded keys, improper random generation, timing attacks |
| **Input Validation** | Missing validation, improper sanitization, type confusion, boundary issues |
| **Dependencies** | Known CVEs, outdated packages, supply chain risks |
| **Configuration** | Debug mode in production, permissive CORS, missing security headers |
| **Secrets** | Hardcoded credentials, API keys, connection strings, tokens in code |
| **Race Conditions** | TOCTOU bugs, concurrent access without locks, double-spend scenarios |

**Severity Classification**:

- **CRITICAL**: Exploitable vulnerability that could lead to data breach, RCE, or full system compromise. Blocks merge unconditionally.
- **HIGH**: Significant security weakness that an attacker could leverage with some effort. Should block merge.
- **MEDIUM**: Security concern that increases attack surface or weakens defense in depth. Should be addressed before merge.
- **LOW**: Minor security improvement or hardening suggestion. Advisory, does not block merge.

**Output Format**:
```
[SEC-NNN] Title
Severity: CRITICAL | HIGH | MEDIUM | LOW
File: path/to/file.ts:line
Category: OWASP category
Evidence: What specifically is wrong (quote the code)
Attack scenario: How an attacker exploits this
Recommended fix: Specific remediation steps
```

### Quality Perspective

**Identity**: You are a senior software architect reviewing code for long-term maintainability.
You think about the developer who will read this code in 6 months.

**Primary Question**: "Will this be readable, maintainable, and correct in 6 months?"

**Focus Areas**:

| Category | What to Look For |
|----------|-----------------|
| **SOLID Violations** | Single responsibility breaches, dependency inversion issues, interface segregation |
| **DRY Violations** | Duplicated logic, copy-paste code, repeated patterns that should be abstracted |
| **Naming** | Unclear variable names, misleading function names, inconsistent naming conventions |
| **Complexity** | Deep nesting, long functions (>30 lines), high cyclomatic complexity, god classes |
| **Error Handling** | Swallowed exceptions, generic catch blocks, missing error propagation |
| **Type Safety** | `any` types, unsafe casts, missing null checks, implicit type coercion |
| **API Design** | Inconsistent interfaces, breaking changes, poor abstraction boundaries |
| **Performance** | N+1 queries, unnecessary re-renders, missing memoization, O(n^2) in hot paths |
| **Documentation** | Missing JSDoc on public APIs, outdated comments, missing README updates |
| **Patterns** | Anti-patterns, framework misuse, violating established project conventions |

**Quality Score Rubric**:

| Score | Meaning | Action |
|-------|---------|--------|
| 9-10 | Exemplary code, ready to merge | Approve |
| 7-8 | Good code with minor suggestions | Approve with comments |
| 5-6 | Acceptable but needs improvement | Request changes (non-blocking) |
| 3-4 | Significant quality issues | Request changes (blocking) |
| 1-2 | Major structural problems | Needs rewrite |

**Output Format**:
```
[QUA-NNN] Title
Severity: BLOCKING | SUGGESTION | NITPICK
File: path/to/file.ts:line
Principle: SOLID/DRY/KISS/YAGNI/etc.
Current: What the code does now (quote it)
Suggested: What it should look like
Rationale: Why this matters for maintainability
```

### Test Perspective

**Identity**: You are a QA architect reviewing code for test adequacy. You think about what
could go wrong in production that tests should prevent.

**Primary Question**: "What scenarios are NOT tested that should be?"

**Focus Areas**:

| Category | What to Look For |
|----------|-----------------|
| **Coverage Gaps** | New code paths without corresponding tests, uncovered branches |
| **Edge Cases** | Boundary values, empty inputs, null/undefined, max values, Unicode, special chars |
| **Error Paths** | Network failures, timeouts, invalid responses, disk full, permission denied |
| **Integration Boundaries** | API contract changes without integration tests, missing mock updates |
| **Race Conditions** | Concurrent operations, state mutations, async timing issues |
| **Regression Risk** | Changed behavior without updated tests, removed tests without justification |
| **Test Quality** | Brittle tests, testing implementation details, missing assertions, flaky patterns |
| **Data Scenarios** | Empty collections, single item, large datasets, malformed data |
| **State Transitions** | Invalid state transitions, state leak between tests, setup/teardown issues |
| **Security Testing** | Auth bypass scenarios, injection test cases, privilege escalation tests |

**Risk Assessment Scale**:

| Risk Level | Meaning |
|------------|---------|
| **HIGH RISK** | Critical path with no test coverage — production incident likely |
| **MEDIUM RISK** | Important path with partial coverage — edge cases could cause bugs |
| **LOW RISK** | Non-critical path with missing tests — nice to have |

**Output Format**:
```
[TST-NNN] Missing test: Title
Risk: HIGH | MEDIUM | LOW
File under test: path/to/file.ts:line
Scenario: What should be tested
Test type: unit | integration | e2e
Why it matters: What could go wrong without this test
Suggested test:
  describe('...', () => {
    it('should ...', () => {
      // test outline
    });
  });
```

---

## The Review Pipeline

### Step-by-Step Execution

```
Step 1: Collect Changes ──────► git diff (staged or branch comparison)
                                │
Step 2: Launch Perspectives ──► 3 parallel sub-agents, each with the same diff
                                │
Step 3: Independent Findings ─► Each perspective generates its own report
                                │
Step 4: Synthesize ───────────► Merge reports, deduplicate, cross-reference
                                │
Step 5: Prioritize ───────────► Rank by severity, consensus, and risk
                                │
Step 6: Final Report ─────────► Structured markdown with action items
```

### Step 1: Collect Changes

Determine the diff to review based on context:

```bash
# For PR review — diff against base branch
git diff main...HEAD

# For pre-commit review — staged changes only
git diff --cached

# For post-commit review — last N commits
git diff HEAD~3..HEAD

# For specific files only
git diff main...HEAD -- src/api/ src/services/
```

Important: also collect file context. The diff alone lacks the surrounding code needed
for accurate review. Each perspective should have access to the full files that changed.

### Step 2: Launch Perspectives in Parallel

All three perspectives MUST run independently and in parallel. Sequential execution
wastes time and can introduce bias if one perspective's output influences another.

```
┌─────────────────────────────────────────────┐
│            Parallel Execution               │
│                                             │
│  t=0s  ┌─── Security starts ────────┐      │
│        ├─── Quality starts ─────────┤      │
│        └─── Test starts ────────────┘      │
│                                             │
│  t=30s ┌─── Security completes ─────┐      │
│  t=35s ├─── Quality completes ──────┤      │
│  t=40s └─── Test completes ─────────┘      │
│                                             │
│  Total: ~40s (not 40+35+30 = 105s)         │
└─────────────────────────────────────────────┘
```

### Step 3: Independent Findings

Each perspective produces a structured report following its output format.
Reports MUST NOT reference each other — independence is critical.

### Step 4: Synthesize

The synthesizer agent receives all three reports and:

1. **Deduplicates**: Two perspectives flagging the same line for different reasons get merged into one finding with multiple perspectives noted.
2. **Cross-references**: If Security flags a function AND Test notes missing tests for that function, link them.
3. **Identifies consensus**: Issues flagged by 2+ perspectives are elevated in priority.
4. **Identifies disputes**: Issues where perspectives disagree are flagged for human attention.

### Step 5: Prioritize

Apply the consensus algorithm (see below) to rank all findings:

1. Security CRITICAL → always first
2. Consensus items (2-3 perspectives agree) → next
3. Single-perspective HIGH severity → next
4. Everything else → ordered by perspective (security > quality > test)

### Step 6: Final Report

Generate the structured report in the format specified in the Report Format section.

---

## Implementation with Sub-Agents

### Using Claude Code Task Tool

The recommended way to run adversarial review in Claude Code is to use the Task tool
to launch three parallel sub-agents:

```
Message to Claude Code:
"Review the current branch changes using adversarial review.
Launch three parallel Task agents — one for each perspective."
```

Claude Code should then make three simultaneous Task tool calls, one per perspective.

### Sub-Agent Prompt: Security Perspective

```markdown
You are the SECURITY perspective in an adversarial code review.

## Your Role
You are a senior application security engineer. Your job is to find
security vulnerabilities in the code changes provided below.

## Your Mindset
Think like an attacker. For every function, ask: "How could this be
exploited?" For every input, ask: "What if this is malicious?" For
every output, ask: "Does this leak sensitive information?"

## Review Checklist
- [ ] Injection vulnerabilities (SQL, XSS, command, template)
- [ ] Authentication and session management flaws
- [ ] Authorization and access control issues
- [ ] Sensitive data exposure (logs, errors, responses)
- [ ] Cryptographic weaknesses
- [ ] Input validation gaps
- [ ] Known vulnerable dependencies
- [ ] Security misconfiguration
- [ ] Hardcoded secrets or credentials
- [ ] Race conditions and TOCTOU bugs

## Output Requirements
For each finding, use this format:

[SEC-NNN] Title
Severity: CRITICAL | HIGH | MEDIUM | LOW
File: path:line
Category: OWASP category
Evidence: (quote the problematic code)
Attack scenario: (describe how an attacker exploits this)
Recommended fix: (specific remediation)

## Important Rules
- DO NOT consider code quality or test coverage — other reviewers handle that
- DO NOT soften findings — if it is a vulnerability, call it out directly
- DO report false positives if you are unsure, marked as [POSSIBLE]
- Focus ONLY on security implications

## Code Changes to Review
<diff>
{DIFF_CONTENT}
</diff>

## Full File Context
<files>
{FULL_FILES}
</files>
```

### Sub-Agent Prompt: Quality Perspective

```markdown
You are the QUALITY perspective in an adversarial code review.

## Your Role
You are a senior software architect. Your job is to evaluate code
quality, maintainability, and adherence to software engineering
principles.

## Your Mindset
Think about the developer who inherits this code in 6 months. Will
they understand it? Can they modify it safely? Does it follow the
project's established patterns?

## Review Checklist
- [ ] SOLID principle adherence
- [ ] DRY — no duplicated logic
- [ ] Clear, descriptive naming
- [ ] Reasonable function length and complexity
- [ ] Proper error handling and propagation
- [ ] Type safety (no `any`, no unsafe casts)
- [ ] Consistent API design
- [ ] Performance considerations
- [ ] Documentation for public APIs
- [ ] Adherence to project conventions

## Output Requirements
Start with an overall quality score (1-10) and brief justification.

For each finding, use this format:

[QUA-NNN] Title
Severity: BLOCKING | SUGGESTION | NITPICK
File: path:line
Principle: which principle is violated
Current: (quote current code)
Suggested: (show improved version)
Rationale: (why this matters)

## Important Rules
- DO NOT consider security vulnerabilities — another reviewer handles that
- DO NOT evaluate test coverage — another reviewer handles that
- DO focus on readability, structure, and long-term maintainability
- Be specific — show the improved code, not just "make this better"

## Code Changes to Review
<diff>
{DIFF_CONTENT}
</diff>

## Full File Context
<files>
{FULL_FILES}
</files>
```

### Sub-Agent Prompt: Test Perspective

```markdown
You are the TEST perspective in an adversarial code review.

## Your Role
You are a QA architect. Your job is to identify gaps in test coverage
and scenarios that should be tested but are not.

## Your Mindset
Think about what could go wrong in production. For every code path,
ask: "Is there a test that would catch a regression here?" For every
input, ask: "What happens at the boundaries?"

## Review Checklist
- [ ] New code paths have corresponding tests
- [ ] Edge cases covered (empty, null, max, min, unicode, special chars)
- [ ] Error paths tested (network failure, timeout, invalid data)
- [ ] Integration boundaries verified
- [ ] No race condition scenarios untested
- [ ] Changed behavior has updated tests
- [ ] Tests are not brittle or implementation-coupled
- [ ] Assertions are meaningful (not just "no error thrown")
- [ ] Test data covers realistic scenarios
- [ ] Mocks are up to date with real interfaces

## Output Requirements
Start with a coverage risk assessment: HIGH / MEDIUM / LOW risk.

For each finding, use this format:

[TST-NNN] Missing test: Title
Risk: HIGH | MEDIUM | LOW
File under test: path:line
Scenario: what should be tested
Test type: unit | integration | e2e
Why it matters: what could go wrong without this test
Suggested test:
```
describe('...', () => {
  it('should ...', () => {
    // outline
  });
});
```

## Important Rules
- DO NOT evaluate security vulnerabilities — another reviewer handles that
- DO NOT evaluate code quality — another reviewer handles that
- DO focus exclusively on test adequacy and coverage gaps
- Provide concrete test outlines, not vague suggestions

## Code Changes to Review
<diff>
{DIFF_CONTENT}
</diff>

## Full File Context
<files>
{FULL_FILES}
</files>
```

### Synthesizer Prompt

```markdown
You are the SYNTHESIZER in an adversarial code review.

You have received three independent review reports from different perspectives:
1. Security Perspective
2. Quality Perspective
3. Test Perspective

## Your Job
Merge these three reports into a single, actionable review report.

## Process
1. **Deduplicate**: If two perspectives flag the same code for different reasons,
   merge into one finding noting both perspectives.
2. **Cross-reference**: Link related findings (e.g., security flaw + missing test
   for that flaw).
3. **Apply Consensus Algorithm**:
   - Security CRITICAL → always include, always block
   - 2-3 perspectives agree → elevated priority
   - 1 perspective flags → include as advisory
4. **Identify Disputes**: Where perspectives disagree, document both sides.
5. **Rank**: Order findings by priority (critical → high → medium → low).

## Output
Generate the final report using the Adversarial Review Report format.

## Reports to Synthesize

### Security Report
{SECURITY_REPORT}

### Quality Report
{QUALITY_REPORT}

### Test Report
{TEST_REPORT}
```

---

## The /verify-changes Pipeline

### Overview

The `/verify-changes` pipeline is an automated pre-merge validation sequence that
ensures code quality at every level before allowing a merge. Adversarial review is
the **final gate** — the most thorough check, run only after all automated checks pass.

### Pipeline Stages

```
┌──────────┐    ┌────────────┐    ┌─────────┐    ┌──────────┐    ┌─────────────────┐
│   Lint   │───►│ Type Check │───►│  Build  │───►│   Test   │───►│   Adversarial   │
│          │    │            │    │         │    │          │    │     Review       │
└──────────┘    └────────────┘    └─────────┘    └──────────┘    └─────────────────┘
     │               │               │               │                   │
     ▼               ▼               ▼               ▼                   ▼
  Fail fast      Fail fast       Fail fast       Fail fast          Final gate
  (seconds)      (seconds)       (minutes)       (minutes)          (minutes)
```

**Each stage must pass before the next runs.** This is intentional — there is no point
running a 5-minute adversarial review if the code does not even compile.

### Stage Details

#### Stage 1: Lint
```bash
# Detect the project's linter and run it
if [ -f "biome.json" ]; then
  npx biome check .
elif [ -f ".eslintrc*" ] || grep -q "eslint" package.json 2>/dev/null; then
  npx eslint . --max-warnings 0
elif [ -f "pyproject.toml" ] && grep -q "ruff" pyproject.toml; then
  ruff check .
elif [ -f ".golangci.yml" ]; then
  golangci-lint run
fi
```

#### Stage 2: Type Check
```bash
# Detect and run type checker
if [ -f "tsconfig.json" ]; then
  npx tsc --noEmit
elif [ -f "pyproject.toml" ] && grep -q "mypy" pyproject.toml; then
  mypy .
fi
```

#### Stage 3: Build
```bash
# Detect and run build
if [ -f "package.json" ]; then
  npm run build
elif [ -f "Cargo.toml" ]; then
  cargo build
elif [ -f "go.mod" ]; then
  go build ./...
elif [ -f "build.gradle" ] || [ -f "build.gradle.kts" ]; then
  ./gradlew build -x test
fi
```

#### Stage 4: Test
```bash
# Detect and run tests
if [ -f "package.json" ]; then
  npm test
elif [ -f "Cargo.toml" ]; then
  cargo test
elif [ -f "go.mod" ]; then
  go test ./...
elif [ -f "pyproject.toml" ]; then
  pytest
fi
```

#### Stage 5: Adversarial Review

Only reached if ALL previous stages pass. Launches the three-perspective
adversarial review as described in this skill.

### Configuration

The pipeline can be configured per-project via `.ai-config/verify.yaml`:

```yaml
# .ai-config/verify.yaml
verify-changes:
  stages:
    lint:
      enabled: true
      command: "npx biome check ."
    type-check:
      enabled: true
      command: "npx tsc --noEmit"
    build:
      enabled: true
      command: "npm run build"
    test:
      enabled: true
      command: "npm test"
    adversarial-review:
      enabled: true
      block-on: "critical"  # critical | high | medium | any
      perspectives:
        - security
        - quality
        - test
      # Optional: add custom perspectives
      custom-perspectives: []
```

### Invoking the Pipeline

```bash
# Full pipeline
/verify-changes

# Skip to adversarial review (assumes prior stages passed)
/verify-changes --skip-to=review

# Only run specific stages
/verify-changes --stages=lint,type-check,review

# Review specific files only
/verify-changes --files=src/api/users.ts,src/services/auth.ts
```

---

## Report Format

### Full Report Template

```markdown
# Adversarial Review Report

**Date**: {DATE}
**Branch**: {BRANCH}
**Base**: {BASE_BRANCH}
**Commits**: {COMMIT_COUNT}
**Reviewer**: adversarial-review v1.0

---

## Summary

| Metric | Value |
|--------|-------|
| Files reviewed | {N} |
| Lines changed | +{ADDED} / -{REMOVED} |
| Critical issues | {N} |
| High issues | {N} |
| Medium issues | {N} |
| Low issues | {N} |
| Consensus issues (2-3 agree) | {N} |
| Disputed issues | {N} |
| Quality score | {N}/10 |
| Test coverage risk | HIGH / MEDIUM / LOW |

## Verdict: {APPROVE | REQUEST_CHANGES | BLOCK}

{One-line justification for the verdict}

---

## Critical Issues (must fix before merge)

### [SEC-001] SQL injection in user query
- **Perspective**: Security
- **Consensus**: Security + Test (test perspective noted missing SQL injection test)
- **File**: `src/api/users.ts:42`
- **Evidence**:
  ```typescript
  const query = `SELECT * FROM users WHERE id = '${userId}'`;
  ```
- **Attack Scenario**: Attacker sends `'; DROP TABLE users; --` as userId
- **Fix**: Use parameterized query:
  ```typescript
  const query = 'SELECT * FROM users WHERE id = $1';
  const result = await db.query(query, [userId]);
  ```

---

## High Priority Issues

### [QUA-001] God function in UserService
- **Perspective**: Quality
- **File**: `src/services/user-service.ts:15-120`
- **Issue**: `processUser()` handles validation, transformation, persistence,
  and notification in 105 lines
- **Suggestion**: Extract into `validateUser()`, `transformUser()`, `persistUser()`,
  `notifyUser()`

---

## Medium Priority Issues

{...}

---

## Low Priority / Advisory

{...}

---

## Missing Tests

### [TST-001] No test for authentication bypass
- **Risk**: HIGH
- **File**: `src/middleware/auth.ts:28`
- **Scenario**: Missing token header should return 401
- **Suggested test**:
  ```typescript
  it('should return 401 when Authorization header is missing', async () => {
    const response = await request(app).get('/api/protected');
    expect(response.status).toBe(401);
  });
  ```

{...}

---

## Disputed Items

### Quality says OK, Security says RISK
- **Finding**: [SEC-003] Error message reveals stack trace
- **Security view**: Stack traces expose internal architecture to attackers
- **Quality view**: Detailed errors are useful during development
- **Resolution**: Use detailed errors in dev, sanitized errors in production
  ```typescript
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : error.stack;
  ```

---

## Appendix: Per-Perspective Reports

<details>
<summary>Security Perspective Full Report</summary>
{FULL_SECURITY_REPORT}
</details>

<details>
<summary>Quality Perspective Full Report</summary>
{FULL_QUALITY_REPORT}
</details>

<details>
<summary>Test Perspective Full Report</summary>
{FULL_TEST_REPORT}
</details>
```

---

## Consensus Algorithm

### Decision Matrix

The consensus algorithm determines the priority and blocking status of each finding
based on which perspectives flagged it and at what severity.

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONSENSUS MATRIX                             │
├─────────────────────┬──────────────┬───────────────────────────┤
│ Condition           │ Priority     │ Blocking?                 │
├─────────────────────┼──────────────┼───────────────────────────┤
│ Security CRITICAL   │ P0           │ ALWAYS blocks             │
│ Security HIGH       │ P1           │ Blocks by default         │
│ 3/3 agree (any sev) │ P1           │ Blocks                    │
│ 2/3 agree (any sev) │ P2           │ Blocks if HIGH+           │
│ 1/3 flags HIGH      │ P2           │ Recommend fix             │
│ 1/3 flags MEDIUM    │ P3           │ Advisory                  │
│ 1/3 flags LOW       │ P4           │ Advisory                  │
│ Disputed            │ P3           │ Flag for human decision   │
└─────────────────────┴──────────────┴───────────────────────────┘
```

### Resolution Process for Disputes

When perspectives disagree, the synthesizer follows this process:

1. **State both positions clearly** — quote the specific reasoning from each perspective.
2. **Evaluate evidence** — does one perspective have concrete evidence (e.g., a specific
   exploit scenario) while the other has a general principle?
3. **Default to caution** — if the dispute involves security, default to the security
   perspective. If it involves correctness, default to the test perspective.
4. **Flag for human** — if evidence is balanced on both sides, flag the dispute for
   human review with both perspectives documented.

### Verdicts

The final verdict is determined by the highest-priority unresolved finding:

| Highest Finding | Verdict |
|----------------|---------|
| Any P0 or P1 | **BLOCK** — must fix before merge |
| P2 only | **REQUEST_CHANGES** — should fix, blocking configurable |
| P3 or P4 only | **APPROVE with comments** — merge and address later |
| No findings | **APPROVE** — clean merge |

---

## Code Examples

### Full workflow:review Command Implementation

This is a reference implementation for a `/workflow:review` command that orchestrates
the entire adversarial review pipeline.

```bash
#!/bin/bash
# workflow-review.sh — Adversarial Review Orchestrator
# Usage: ./workflow-review.sh [base-branch]

set -euo pipefail

BASE_BRANCH="${1:-main}"
CURRENT_BRANCH=$(git branch --show-current)

echo "=== Adversarial Review ==="
echo "Reviewing: ${CURRENT_BRANCH} against ${BASE_BRANCH}"
echo ""

# Step 1: Collect the diff
DIFF=$(git diff "${BASE_BRANCH}...HEAD")
if [ -z "$DIFF" ]; then
  echo "No changes to review."
  exit 0
fi

# Collect changed files for full context
CHANGED_FILES=$(git diff --name-only "${BASE_BRANCH}...HEAD")
echo "Changed files:"
echo "$CHANGED_FILES"
echo ""

# Step 2: Count changes for summary
FILES_CHANGED=$(echo "$CHANGED_FILES" | wc -l)
LINES_ADDED=$(git diff "${BASE_BRANCH}...HEAD" --stat | tail -1 | grep -oP '\d+ insertion' | grep -oP '\d+' || echo "0")
LINES_REMOVED=$(git diff "${BASE_BRANCH}...HEAD" --stat | tail -1 | grep -oP '\d+ deletion' | grep -oP '\d+' || echo "0")

echo "Files: ${FILES_CHANGED}, +${LINES_ADDED}/-${LINES_REMOVED}"
echo ""
echo "Launching three perspectives in parallel..."
echo ""

# Step 3: Write diff and context to temp files for sub-agents
REVIEW_DIR=$(mktemp -d)
echo "$DIFF" > "${REVIEW_DIR}/diff.txt"

# Collect full file contents for context
for file in $CHANGED_FILES; do
  if [ -f "$file" ]; then
    echo "=== FILE: $file ===" >> "${REVIEW_DIR}/context.txt"
    cat "$file" >> "${REVIEW_DIR}/context.txt"
    echo "" >> "${REVIEW_DIR}/context.txt"
  fi
done

echo "Review artifacts written to: ${REVIEW_DIR}"
echo ""
echo "Use the following with Claude Code / OpenCode:"
echo ""
echo "  Launch 3 parallel Task agents with the prompts from"
echo "  adversarial-review SKILL.md, passing:"
echo "    - ${REVIEW_DIR}/diff.txt as the diff"
echo "    - ${REVIEW_DIR}/context.txt as file context"
echo ""
echo "Then pass all 3 reports to the Synthesizer prompt."
```

### GitHub Actions Integration

```yaml
# .github/workflows/adversarial-review.yml
name: Adversarial Review

on:
  pull_request:
    branches: [main, develop]

jobs:
  verify-changes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type Check
        run: npx tsc --noEmit

      - name: Build
        run: npm run build

      - name: Test
        run: npm test

      - name: Adversarial Review
        if: success()
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          # Generate diff for review
          git diff origin/main...HEAD > /tmp/review-diff.txt

          # Run adversarial review via Claude API
          # (implementation depends on your API integration)
          echo "Adversarial review would run here"
          echo "See SKILL.md for prompt templates"

      - name: Post Review Comment
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            // Post the adversarial review report as a PR comment
            // Implementation depends on how you capture the review output
            console.log('Review complete');
```

### OpenCode Agent Configuration

For OpenCode (the open-source alternative), configure agents in `.ai-config/agents.yaml`:

```yaml
# .ai-config/agents.yaml
agents:
  security-reviewer:
    description: "Security perspective for adversarial review"
    prompt: |
      You are the SECURITY perspective in an adversarial code review.
      Focus exclusively on security vulnerabilities.
      Use [SEC-NNN] format for findings.
      Classify severity as CRITICAL/HIGH/MEDIUM/LOW.

  quality-reviewer:
    description: "Quality perspective for adversarial review"
    prompt: |
      You are the QUALITY perspective in an adversarial code review.
      Focus exclusively on code quality and maintainability.
      Use [QUA-NNN] format for findings.
      Provide a quality score 1-10.

  test-reviewer:
    description: "Test perspective for adversarial review"
    prompt: |
      You are the TEST perspective in an adversarial code review.
      Focus exclusively on test coverage gaps and missing tests.
      Use [TST-NNN] format for findings.
      Provide concrete test outlines.

  review-synthesizer:
    description: "Merges three adversarial review perspectives"
    prompt: |
      You are the SYNTHESIZER. Merge the three review reports into
      a single actionable report. Apply the consensus algorithm.
      Generate the final Adversarial Review Report.
```

### Invoking from Claude Code

```
User: Review my changes using adversarial review

Claude Code should:
1. Run `git diff main...HEAD` to collect changes
2. Launch 3 parallel Task calls with the perspective prompts
3. Collect all 3 reports
4. Launch 1 final Task call with the Synthesizer prompt
5. Present the final report to the user
```

### Invoking from OpenCode

```
User: /workflow:review

OpenCode should:
1. Detect the adversarial-review skill is loaded
2. Run the verify-changes pipeline (lint → type → build → test)
3. If all pass, launch 3 agents in parallel
4. Synthesize results
5. Present the final report
```

---

## Anti-Patterns

### 1. Sequential Execution

**Wrong**: Running perspectives one after another.

```
Security starts... (30s) → done
Quality starts...  (35s) → done
Test starts...     (40s) → done
Total: 105 seconds
```

**Right**: Running all three in parallel.

```
All three start simultaneously...
Total: ~40 seconds (slowest perspective)
```

Sequential execution is not just slower — it risks introducing bias. If the quality
reviewer sees the security report first, they might unconsciously anchor on security
concerns and miss quality issues they would otherwise have caught.

### 2. Ignoring Disputed Items

**Wrong**: "Security and Quality disagree, so I'll just pick whichever is easier."

**Right**: Disputed items are often the most valuable findings. They represent areas
where the code is doing something that looks fine from one perspective but problematic
from another. These gray areas are exactly where real-world bugs hide.

Always document disputes with both perspectives and escalate to a human reviewer.

### 3. Skipping Synthesis

**Wrong**: Just concatenating three reports and presenting them as-is.

**Right**: The synthesis step is where the real value emerges. Deduplication prevents
the developer from being overwhelmed. Cross-referencing reveals patterns. Consensus
identification highlights the most important issues. Priority ranking ensures the
developer fixes the right things first.

### 4. Treating All Findings as Equal

**Wrong**: A flat list of 47 findings with no priority ordering.

**Right**: Apply the consensus algorithm. A security CRITICAL finding that all three
perspectives agree on is fundamentally different from a single-perspective NITPICK.
Priority ranking respects the developer's time and attention.

### 5. Using Adversarial Review for Trivial Changes

**Wrong**: Running a full three-perspective review on a README typo fix.

**Right**: Adversarial review is expensive in terms of time and tokens. Reserve it
for changes where the cost of a missed bug is high:
- Security-sensitive code
- Multi-file changes
- New features
- Critical path refactors

For trivial changes, a standard single-perspective review (or no review at all) is
more appropriate.

### 6. Hardcoding Perspective Prompts

**Wrong**: Embedding the perspective prompts directly in your workflow script with no
way to customize them.

**Right**: Store perspective prompts in `.ai-config/` or in the skill file itself so
they can be customized per-project. A financial services project needs different
security focus areas than a static blog generator.

### 7. Ignoring the Full File Context

**Wrong**: Only passing the diff to reviewers.

**Right**: A diff without context is often misleading. A line that looks dangerous
in isolation might be perfectly safe in context (e.g., inside a test file, behind
an auth guard, or using a safe wrapper). Always provide the full files that changed
alongside the diff.

### 8. No Feedback Loop

**Wrong**: Running adversarial review once and never adjusting.

**Right**: Track which findings were accepted vs. dismissed by developers. If a
particular perspective consistently produces false positives in your codebase,
adjust its prompt. If developers keep dismissing a category of findings, either
the prompt is miscalibrated or the team needs education on why those findings matter.

---

## Configuration Reference

### Minimum Configuration

```yaml
# .ai-config/verify.yaml
verify-changes:
  adversarial-review:
    enabled: true
```

This uses all defaults: three perspectives, blocks on critical, reviews all changed files.

### Full Configuration

```yaml
# .ai-config/verify.yaml
verify-changes:
  stages:
    lint:
      enabled: true
      command: "npm run lint"
      timeout: 60s
    type-check:
      enabled: true
      command: "npx tsc --noEmit"
      timeout: 120s
    build:
      enabled: true
      command: "npm run build"
      timeout: 300s
    test:
      enabled: true
      command: "npm test"
      timeout: 300s
    adversarial-review:
      enabled: true
      block-on: "high"           # critical | high | medium | any
      base-branch: "main"       # branch to diff against
      max-files: 50             # skip if too many files changed
      max-diff-lines: 5000      # skip if diff too large
      perspectives:
        - security
        - quality
        - test
      custom-perspectives:
        - name: "performance"
          prompt: |
            You are a PERFORMANCE reviewer. Focus on:
            - O(n^2) or worse algorithms in hot paths
            - Unnecessary allocations
            - Missing caching opportunities
            - Database query efficiency
      exclude-patterns:
        - "*.test.ts"           # don't review test files for quality
        - "*.snap"              # skip snapshots
        - "migrations/*"        # skip auto-generated migrations
      security-overrides:
        # Project-specific security concerns
        extra-checks:
          - "PII handling in user data"
          - "GDPR compliance for EU data"
        ignore-patterns:
          - "test/**"           # don't flag test files for security
```

### Adding Custom Perspectives

Beyond the three default perspectives, you can add custom ones for project-specific needs:

```yaml
custom-perspectives:
  - name: "accessibility"
    prompt: |
      You are an ACCESSIBILITY reviewer. Focus on:
      - Missing ARIA labels
      - Color contrast issues
      - Keyboard navigation
      - Screen reader compatibility

  - name: "performance"
    prompt: |
      You are a PERFORMANCE reviewer. Focus on:
      - Bundle size impact
      - Render performance
      - Network requests
      - Memory leaks

  - name: "compliance"
    prompt: |
      You are a COMPLIANCE reviewer. Focus on:
      - Data retention policies
      - GDPR requirements
      - Audit logging
      - Data classification
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADVERSARIAL_REVIEW_ENABLED` | `true` | Enable/disable the review |
| `ADVERSARIAL_REVIEW_BLOCK_ON` | `critical` | Minimum severity to block |
| `ADVERSARIAL_REVIEW_BASE` | `main` | Base branch for diff |
| `ADVERSARIAL_REVIEW_TIMEOUT` | `300` | Timeout in seconds per perspective |
| `ADVERSARIAL_REVIEW_PARALLEL` | `true` | Run perspectives in parallel |

---

## Quick Reference

### Commands

| Command | Description |
|---------|-------------|
| `/workflow:review` | Run full adversarial review on current branch |
| `/verify-changes` | Run the complete pipeline (lint → test → review) |
| `/verify-changes --skip-to=review` | Skip to adversarial review only |
| `/review:security` | Run only the security perspective |
| `/review:quality` | Run only the quality perspective |
| `/review:test` | Run only the test perspective |

### Finding ID Prefixes

| Prefix | Perspective |
|--------|-------------|
| `SEC-` | Security |
| `QUA-` | Quality |
| `TST-` | Test |
| `SYN-` | Synthesizer (cross-reference finding) |

### Severity Levels

| Level | Meaning | Blocks Merge? |
|-------|---------|---------------|
| CRITICAL | Exploitable vulnerability or data loss risk | Always |
| HIGH | Significant issue requiring attention | By default |
| MEDIUM | Should fix, but not a blocker | Configurable |
| LOW | Nice to have improvement | Never |

---

*This skill is part of the Javi.Dots AI framework. Inspired by CloudAI-X/opencode-workflow's
multi-perspective verification pattern and the /verify-changes pipeline concept.*
