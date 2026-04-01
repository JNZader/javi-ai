# Adversarial Review — Configuration Reference

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

**Each stage must pass before the next runs.**

### Stage Details

#### Stage 1: Lint
```bash
if [ -f "biome.json" ]; then npx biome check .
elif [ -f ".eslintrc*" ] || grep -q "eslint" package.json 2>/dev/null; then npx eslint . --max-warnings 0
elif [ -f "pyproject.toml" ] && grep -q "ruff" pyproject.toml; then ruff check .
elif [ -f ".golangci.yml" ]; then golangci-lint run; fi
```

#### Stage 2: Type Check
```bash
if [ -f "tsconfig.json" ]; then npx tsc --noEmit
elif [ -f "pyproject.toml" ] && grep -q "mypy" pyproject.toml; then mypy .; fi
```

#### Stage 3: Build
```bash
if [ -f "package.json" ]; then npm run build
elif [ -f "Cargo.toml" ]; then cargo build
elif [ -f "go.mod" ]; then go build ./...
elif [ -f "build.gradle" ] || [ -f "build.gradle.kts" ]; then ./gradlew build -x test; fi
```

#### Stage 4: Test
```bash
if [ -f "package.json" ]; then npm test
elif [ -f "Cargo.toml" ]; then cargo test
elif [ -f "go.mod" ]; then go test ./...
elif [ -f "pyproject.toml" ]; then pytest; fi
```

#### Stage 5: Adversarial Review
Only reached if ALL previous stages pass.

---

## Minimum Configuration

```yaml
# .ai-config/verify.yaml
verify-changes:
  adversarial-review:
    enabled: true
```

## Full Configuration

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
        - "*.test.ts"
        - "*.snap"
        - "migrations/*"
      security-overrides:
        extra-checks:
          - "PII handling in user data"
          - "GDPR compliance for EU data"
        ignore-patterns:
          - "test/**"
```

## Adding Custom Perspectives

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

## Invoking the Pipeline

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

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADVERSARIAL_REVIEW_ENABLED` | `true` | Enable/disable the review |
| `ADVERSARIAL_REVIEW_BLOCK_ON` | `critical` | Minimum severity to block |
| `ADVERSARIAL_REVIEW_BASE` | `main` | Base branch for diff |
| `ADVERSARIAL_REVIEW_TIMEOUT` | `300` | Timeout in seconds per perspective |
| `ADVERSARIAL_REVIEW_PARALLEL` | `true` | Run perspectives in parallel |

---

## Anti-Patterns

### 1. Sequential Execution
**Wrong**: Running perspectives one after another (105s). **Right**: All three in parallel (~40s).

### 2. Ignoring Disputed Items
Disputed items are often the most valuable findings — gray areas where real-world bugs hide. Always document disputes with both perspectives and escalate to a human reviewer.

### 3. Skipping Synthesis
Just concatenating three reports loses the real value: deduplication, cross-referencing, consensus identification, and priority ranking.

### 4. Treating All Findings as Equal
Apply the consensus algorithm. A security CRITICAL with 3/3 agreement is fundamentally different from a single-perspective NITPICK.

### 5. Using Adversarial Review for Trivial Changes
Reserve for security-sensitive code, multi-file changes, new features, critical path refactors. Skip for README typos, dependency bumps, config-only changes.

### 6. Hardcoding Perspective Prompts
Store prompts in `.ai-config/` so they can be customized per-project.

### 7. Ignoring the Full File Context
A diff without context is often misleading. Always provide the full files that changed alongside the diff.

### 8. No Feedback Loop
Track which findings were accepted vs. dismissed. Adjust prompts if a perspective consistently produces false positives.
