---
name: sdd-verify-visual
description: >
  Visual verification of UI changes using Playwright browser automation.
  Trigger: When sdd-verify runs and the change touches UI code (components, pages, styles, templates).
license: Apache-2.0
metadata:
  author: javi-ai
  version: "1.0"
  tags: [sdd, verification, visual, playwright, ui]
  category: workflow
allowed-tools: Read, Bash, Glob, Grep, mcp__playwright__*
---

## Purpose

You are a sub-agent responsible for VISUAL VERIFICATION of UI changes. Your job is to open the application in a real browser, navigate to the pages affected by the change, capture screenshots, and evaluate them against the spec requirements.

This skill complements `sdd-verify` (which handles structural and behavioral verification) by adding a visual layer that catches layout breaks, missing elements, wrong colors, and rendering issues that pass all tests but look broken to users.

## When to Use

Invoke this skill when ALL of the following are true:

1. A change has been implemented (apply phase complete)
2. The change touches UI code (detected by file patterns below)
3. A browser environment is available (Playwright MCP or CLI)

Skip this skill (return SKIPPED) when:
- No UI files were changed
- No browser automation is available
- The change is backend-only, config-only, or test-only

## Step 1: Detect UI Changes

Analyze the changed files to determine if visual verification is needed.

### UI File Patterns

```
COMPONENT patterns:
  **/*.tsx, **/*.jsx, **/*.vue, **/*.svelte
  **/*.component.ts, **/*.component.html (Angular)
  **/pages/**, **/views/**, **/layouts/**, **/components/**

STYLE patterns:
  **/*.css, **/*.scss, **/*.sass, **/*.less
  **/*.styled.ts, **/*.styled.tsx
  **/tailwind.config.*, **/postcss.config.*
  **/*.module.css, **/*.module.scss

TEMPLATE patterns:
  **/*.html, **/*.hbs, **/*.ejs, **/*.pug
  **/*.njk, **/*.liquid

ASSET patterns:
  **/public/**, **/static/**, **/assets/**
  **/*.svg (inline SVGs used as components)
```

### Detection Protocol

```
1. Get changed files:
   - From task artifacts (tasks.md file list)
   - OR from git: git diff --name-only HEAD~{N}
   - OR from apply-progress artifact

2. Match against UI patterns above

3. Decision:
   - ANY match → proceed to Step 2
   - ZERO matches → return SKIPPED status:
     "SKIPPED — no UI changes detected. Files changed: {list}"
```

## Step 2: Discover Verification Targets

Extract which pages/routes to verify from SDD artifacts.

### Source Priority

```
1. SPEC artifact → look for:
   - Route mentions (/dashboard, /settings, /login)
   - Page names (Dashboard page, Settings panel)
   - UI behavior descriptions ("the user sees...", "displays a...")

2. DESIGN artifact → look for:
   - Route table or sitemap
   - Component hierarchy mentions
   - Page-level architecture decisions

3. TASK artifact → look for:
   - File paths that imply routes (pages/dashboard.tsx → /dashboard)
   - Task descriptions mentioning specific pages

4. FALLBACK: If no routes found, use changed file paths to infer:
   - pages/foo.tsx → /foo
   - app/bar/page.tsx → /bar (Next.js app router)
   - views/baz.vue → /baz
```

### Output: Verification Plan

```
Pages to verify:
  - route: /dashboard
    description: "Main dashboard with analytics charts"
    viewports: [desktop, mobile]
    interactions: ["load state", "after clicking refresh"]

  - route: /settings
    description: "User settings form"
    viewports: [desktop]
    interactions: ["empty form", "filled form", "validation errors"]
```

## Step 3: Ensure Application is Running

Before capturing screenshots, the app must be running.

```
1. CHECK if already running:
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
   # Also try: 4200 (Angular), 5173 (Vite), 8080 (generic)

2. If NOT running, detect start command:
   - package.json → scripts.dev or scripts.start
   - Angular: ng serve
   - Next.js: next dev
   - Vite: vite dev

3. START in background:
   {start_command} &
   # Wait up to 30 seconds for ready signal
   # Poll every 2 seconds with curl

4. If CANNOT start:
   - Report WARNING: "Could not start dev server"
   - Attempt verification with whatever URL is available
   - If nothing works → return DEGRADED status
```

## Step 4: Capture Screenshots

### Primary: Playwright MCP (PREFERRED)

If Playwright MCP tools are available, use the full interactive workflow:

```
FOR EACH page in verification plan:
  FOR EACH viewport in page.viewports:

    1. Set viewport:
       - desktop: 1280x720
       - mobile: 375x667
       - tablet: 768x1024 (only if spec mentions tablet)

    2. Navigate:
       browser_navigate(url: "{base_url}{page.route}")

    3. Wait for load:
       browser_snapshot() — to verify page loaded correctly

    4. Capture default state:
       browser_screenshot(name: "{route}-{viewport}-default")

    5. FOR EACH interaction in page.interactions:
       - Perform the interaction (click, fill, scroll)
       - browser_snapshot() — verify state change
       - browser_screenshot(name: "{route}-{viewport}-{interaction}")

    6. Record: { page, viewport, screenshot_name, observation }
```

### Fallback: Playwright CLI

If MCP is NOT available, use CLI for static screenshots only:

```
FOR EACH page in verification plan:
  FOR EACH viewport in page.viewports:

    npx playwright screenshot \
      --viewport-size="{width},{height}" \
      --wait-for-timeout=3000 \
      "{base_url}{page.route}" \
      "screenshots/{route}-{viewport}.png"

    # CLI limitations:
    # - No interaction capability
    # - No DOM snapshot
    # - Static capture only
    # Report as WARNING: "CLI fallback — no interaction verification"
```

### Fallback: No Playwright

If neither MCP nor CLI is available:

```
return {
  status: "SKIPPED",
  reason: "No browser automation available (Playwright MCP not connected, npx playwright not found)",
  recommendation: "Install Playwright MCP server or run: npx playwright install chromium"
}
```

## Step 5: Visual Checklist Evaluation

For each captured screenshot, evaluate against spec requirements.

### Build Checklist from Spec

```
FOR EACH requirement in spec that describes UI:
  Extract visual assertions:
    - Layout: "sidebar on the left", "centered form", "grid of 3 columns"
    - Content: "shows user name", "displays chart", "error message visible"
    - Styling: "primary button is blue", "dark mode support", "responsive layout"
    - State: "loading spinner while fetching", "empty state message", "disabled button"

FOR EACH assertion:
  Evaluate against screenshot/snapshot:
    - PASS: clearly visible and correct in screenshot
    - FAIL: clearly wrong, missing, or broken
    - UNCLEAR: cannot determine from screenshot alone (document why)
```

### Viewport Matrix

```
| Page | Viewport | Status | Issues |
|------|----------|--------|--------|
| /dashboard | desktop (1280x720) | PASS | — |
| /dashboard | mobile (375x667) | FAIL | Sidebar overlaps content |
| /settings | desktop (1280x720) | PASS | — |
```

## Step 6: Generate Report

Produce a structured report that sdd-verify can consume.

```markdown
## Visual Verification Report

**Change**: {change-name}
**Date**: {ISO date}
**Method**: {Playwright MCP | Playwright CLI | SKIPPED}

---

### UI Change Detection
- **UI files changed**: {count}
- **Files**: {list of UI files}

---

### Pages Verified

| # | Route | Description | Viewports |
|---|-------|-------------|-----------|
| 1 | /dashboard | Main dashboard | desktop, mobile |
| 2 | /settings | User settings | desktop |

---

### Viewport Matrix

| Page | Desktop (1280x720) | Mobile (375x667) | Tablet (768x1024) |
|------|:------------------:|:-----------------:|:-----------------:|
| /dashboard | PASS | FAIL | — |
| /settings | PASS | — | — |

---

### Visual Checklist

| # | Requirement | Page | Viewport | Status | Notes |
|---|-------------|------|----------|--------|-------|
| 1 | Dashboard shows chart | /dashboard | desktop | PASS | Chart renders correctly |
| 2 | Responsive sidebar | /dashboard | mobile | FAIL | Sidebar overlaps main content |
| 3 | Settings form layout | /settings | desktop | PASS | All fields visible |

**Visual compliance**: {N}/{total} checks passed

---

### Screenshots Captured

| Name | Page | Viewport | State |
|------|------|----------|-------|
| dashboard-desktop-default | /dashboard | desktop | Initial load |
| dashboard-mobile-default | /dashboard | mobile | Initial load |
| settings-desktop-default | /settings | desktop | Initial load |
| settings-desktop-filled | /settings | desktop | After form fill |

---

### Issues Found

**CRITICAL** (visual regression or broken layout):
{List or "None"}

**WARNING** (minor visual issues):
{List or "None"}

**UNCLEAR** (needs human review):
{List or "None"}

---

### Verdict
{PASS | PASS WITH WARNINGS | FAIL | SKIPPED | DEGRADED}

{One-line summary}
```

## Step 7: Persist Results

Follow the active artifact store mode:

- **engram**: Save with topic_key `sdd/{change-name}/visual-verify-report`
- **openspec**: Write to `openspec/changes/{change-name}/visual-verify-report.md`
- **none**: Return inline only

## Step 8: Cleanup

```
1. If you started a dev server in Step 3, stop it:
   kill %1  (or kill the PID you recorded)

2. Do NOT leave background processes running
```

## Critical Rules

1. NEVER skip UI change detection — always check file patterns first. Do not assume a change is visual.
2. ALWAYS prefer Playwright MCP over CLI. MCP gives interaction capability; CLI is static-only.
3. NEVER report PASS without actually viewing the screenshot or snapshot. Do not assume correctness.
4. ALWAYS capture at least desktop viewport. Mobile is required only when spec mentions responsive behavior.
5. NEVER modify application code during visual verification. You are read-only.
6. ALWAYS stop any dev server you started. Do not leave orphan processes.
7. NEVER block sdd-verify on visual verification failure. Visual issues are reported as findings, not blockers, unless the spec explicitly requires visual compliance.
8. ALWAYS include the method used (MCP vs CLI vs SKIPPED) in the report — reproducibility matters.
9. NEVER compare against previous screenshots (no baseline diffing). Compare against SPEC REQUIREMENTS only.
10. ALWAYS return structured output with: status, executive_summary, pages_verified, issues_found, verdict.
