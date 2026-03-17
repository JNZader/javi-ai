---
name: reverse-engineer
description: >
  Auto-generates PRD and Design Docs from existing code, then verifies them against the codebase.
  Trigger: When onboarding to an existing codebase, user says "reverse engineer", "understand this code", "generate docs from code", or "what does this project do".
metadata:
  author: javi-ai
  version: "1.0"
  tags: [documentation, onboarding, analysis, understanding]
  category: workflow
allowed-tools: Read, Bash, Glob, Grep, Write, Task
---

## Purpose

Generate product and technical documentation from an existing codebase, enabling rapid onboarding and understanding without tribal knowledge.

---

## When to Activate

- First encounter with an unfamiliar codebase
- User asks "what does this project do?" or "help me understand this code"
- Onboarding a new team member
- No existing documentation found
- User explicitly requests "reverse engineer" or "generate docs from code"

---

## Phase 1: Discovery (Automated)

### Step 1: Project Scan

```
1. Identify stack and tools:
   - Package manager, framework, language version
   - Test runner, linter, formatter
   - CI/CD configuration

2. Map directory structure (depth 3):
   - Classify directories by role (source, test, config, docs, scripts)

3. Find entry points:
   - Main files, route definitions, CLI entry
   - Exported public APIs

4. Extract dependencies:
   - Direct runtime dependencies
   - Dev dependencies
   - Internal module graph
```

### Step 2: Pattern Detection

```
1. Architecture pattern:
   - MVC, Clean Architecture, Hexagonal, Monolith, Microservices
   - Layer boundaries (controller → service → repository)

2. API surface:
   - REST routes, GraphQL schema, gRPC services, CLI commands
   - Authentication/authorization patterns

3. Data model:
   - Database schemas, ORM models, type definitions
   - Relationships and constraints

4. Business logic hotspots:
   - Files with the most complexity (cyclomatic, lines, imports)
   - Most-changed files (git log --shortstat)
```

---

## Phase 2: PRD Generation

Generate a Product Requirements Document from code evidence:

```markdown
# PRD: [Project Name] (Reverse-Engineered)

## Overview
[What the project does, derived from README + code analysis]

## Users & Use Cases
[Inferred from routes, UI components, role definitions]

### Use Case 1: [name]
- Actor: [inferred from auth roles]
- Flow: [inferred from route sequence]
- Data: [inferred from request/response types]

## Features
[Grouped by module/domain]

### Feature: [name]
- Endpoints: [list with methods]
- Business rules: [inferred from service logic]
- Validation: [inferred from schemas/validators]

## Non-Functional Requirements
- Auth: [pattern detected]
- Rate limiting: [if found]
- Caching: [if found]
- Monitoring: [if found]

## Confidence
[For each section, note confidence level: HIGH/MEDIUM/LOW]
[LOW sections need human verification]
```

---

## Phase 3: Design Doc Generation

Generate a Technical Design Document:

```markdown
# Design: [Project Name] (Reverse-Engineered)

## Architecture
[Pattern name + diagram description]
[Layer boundaries with examples]

## Module Map
[For each major module:]
### [module-name]
- Purpose: [inferred]
- Key files: [list with line counts]
- Dependencies: [imports from other modules]
- Tests: [test file locations]

## Data Flow
[Request lifecycle from entry to response]
[Key middleware/interceptors in the chain]

## Data Model
[Entity relationships inferred from schemas/types]

## External Integrations
[Third-party services detected from env vars, client imports]

## Decision Log
[Architecture decisions inferred from code patterns]
[e.g., "Uses JWT over sessions — evidence: no session middleware, jwt.verify in auth"]
```

---

## Phase 4: Verification

After generating docs, verify them against the code:

```
For each claim in the PRD/Design doc:
1. Find the supporting code
2. Link to specific file:line
3. Mark confidence: HIGH (code matches), MEDIUM (implied), LOW (guessed)

Output a verification report:
- Total claims: 45
- HIGH confidence: 38 (84%)
- MEDIUM confidence: 5 (11%)
- LOW confidence: 2 (4%)
- Unverifiable: 0

LOW confidence items need human review:
- "Rate limiting is applied to all API routes" — only found on /auth routes
- "WebSocket support for real-time updates" — socket.io imported but no handlers found
```

---

## Output

All generated documents are written to:
```
docs/
  reverse-engineered/
    PRD.md              — Product Requirements Document
    DESIGN.md           — Technical Design Document
    VERIFICATION.md     — Verification report with confidence scores
```

---

## Rules

1. **Always include confidence scores** — the reader must know what's inferred vs certain
2. **Link to code** — every claim should reference file:line
3. **Acknowledge gaps** — "no test infrastructure found" is more useful than silence
4. **Don't fabricate** — if you can't determine something, say "unknown" not a guess
5. **Verify before delivering** — Phase 4 is not optional
6. **Save to Engram** — the reverse-engineered understanding is valuable for future sessions
