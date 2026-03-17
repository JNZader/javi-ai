---
name: blast-radius
description: >
  Dependency graph analysis that identifies only affected files for any change, reducing token usage by up to 49x.
  Trigger: When reviewing code, planning changes, scoping impact, or user asks about blast radius, affected files, or dependencies.
metadata:
  author: javi-ai
  version: "1.0"
  tags: [analysis, dependencies, graph, optimization]
  category: optimization
allowed-tools: Read, Bash, Glob, Grep, Write
---

## Purpose

Build and query a dependency graph of the codebase to determine exactly which files are affected by a change. Instead of loading the entire codebase into context, load only the blast radius.

---

## When to Activate

- Before making changes to shared code (utils, types, interfaces)
- During code review to understand impact
- When user asks "what will this change affect?"
- When planning a refactor
- When context budget is limited and you need to be selective about what to read

---

## Graph Construction

### Step 1: Index the Codebase

Use language-appropriate tooling to build the graph:

```bash
# For TypeScript/JavaScript projects
rg --type ts --type js "^import|^export|require\(" -l | head -200

# For Python projects  
rg --type py "^import|^from .* import" -l | head -200

# For Go projects
rg --type go "^import" -l | head -200
```

### Step 2: Parse Dependencies

For each file, extract:

1. **Imports** — what this file depends on
2. **Exports** — what this file provides to others
3. **Function calls** — which exported functions are used where
4. **Type references** — which types/interfaces are used where
5. **Test coverage** — which test files test this module

### Step 3: Build the Graph

Store as an adjacency list:

```
src/auth/middleware.ts:
  imports: [src/auth/jwt.ts, src/types/user.ts, src/config.ts]
  importedBy: [src/routes/api.ts, src/routes/admin.ts]
  testedBy: [src/auth/__tests__/middleware.test.ts]
  exports: [authMiddleware, requireRole]
```

---

## Blast Radius Calculation

Given a changed file, trace the impact:

### Direct Impact (Depth 1)
- Files that import the changed file
- Test files for the changed file

### Transitive Impact (Depth 2+)
- Files that import the directly impacted files
- Tests for those files
- Continue until no new files are found or depth limit (default: 3)

### Impact Report Format

```
## Blast Radius: src/auth/jwt.ts

### Direct (5 files)
- src/auth/middleware.ts — imports verifyToken
- src/auth/refresh.ts — imports refreshToken
- src/routes/api.ts — imports authMiddleware (via middleware.ts)
- tests/auth/jwt.test.ts — direct test
- tests/auth/middleware.test.ts — tests middleware

### Transitive (3 files, depth 2)
- src/routes/admin.ts — imports from api.ts
- src/app.ts — mounts api routes
- tests/routes/api.test.ts — tests api routes

### Summary
- 8 files affected (out of 247 total) — 96.8% reduction
- Recommended context: load these 8 files only
```

---

## Incremental Updates

The graph should be updated incrementally:

1. **On file edit**: Re-index only the changed file
2. **On git commit**: Re-index files in the commit diff
3. **Hash check**: Skip re-indexing if file SHA-256 hasn't changed

Target: Re-index a 2,900-file project in <2 seconds.

---

## Usage Patterns

### Before a Code Change
```
1. Identify the file(s) to change
2. Run blast radius analysis
3. Load only affected files into context
4. Make the change
5. Verify affected tests pass
```

### During Code Review
```
1. Get the list of changed files from PR/diff
2. For each changed file, calculate blast radius
3. Union all blast radii → total review scope
4. Flag files in the blast radius that were NOT in the PR (missing changes?)
```

### For Refactoring
```
1. Identify the symbol to rename/move
2. Calculate blast radius
3. Sort by depth (change inner-most first)
4. Apply changes leaf-to-root
5. Run tests for each affected file
```

---

## Rules

1. **Always show the reduction ratio** — "8 files out of 247 (96.8% reduction)"
2. **Default depth is 3** — deeper than that is rarely actionable
3. **Include test files** — they are part of the blast radius
4. **Separate direct vs transitive** — direct impact needs careful review, transitive is FYI
5. **Cache the graph** — don't rebuild on every query, use incremental updates
