# Adversarial Review — Code Examples

## Full workflow:review Command Implementation

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

---

## GitHub Actions Integration

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

---

## OpenCode Agent Configuration

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

---

## Invoking from Claude Code

```
User: Review my changes using adversarial review

Claude Code should:
1. Run `git diff main...HEAD` to collect changes
2. Launch 3 parallel Task calls with the perspective prompts
3. Collect all 3 reports
4. Launch 1 final Task call with the Synthesizer prompt
5. Present the final report to the user
```

## Invoking from OpenCode

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

## Report Template

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

---

## Disputed Items

### Quality says OK, Security says RISK
- **Finding**: [SEC-003] Error message reveals stack trace
- **Security view**: Stack traces expose internal architecture to attackers
- **Quality view**: Detailed errors are useful during development
- **Resolution**: Use detailed errors in dev, sanitized errors in production

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
