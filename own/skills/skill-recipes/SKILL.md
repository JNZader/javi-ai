---
name: skill-recipes
description: >
  Self-installing markdown recipes for AI agent skills. A pattern where skills include an
  INSTALL.md that an agent reads and executes to set up dependencies, MCP servers, or config.
  Trigger: When creating new skills with setup requirements, packaging skills for distribution,
  or onboarding users to skills that need external dependencies.
license: MIT
metadata:
  author: JNZader
  version: "1.0"
  tags: [skills, recipes, self-install, automation, mcp]
  category: skill-authoring
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

## Purpose

Skills often require external setup: npm packages, MCP servers, config files, environment variables. Without a standard install pattern, users manually piece together dependencies and frequently miss steps. Skill Recipes solve this by embedding machine-readable install instructions inside the skill itself.

---

## When to Activate

- Creating a new skill that depends on external tools, packages, or MCP servers
- Packaging a skill for distribution to other agents or users
- Onboarding a user to a skill that requires setup beyond reading SKILL.md
- Auditing existing skills for missing dependency documentation

---

## The Recipe Pattern

### Core Concept

Every skill that requires setup MUST include an `INSTALL.md` alongside its `SKILL.md`. The agent reads `INSTALL.md`, verifies prerequisites, and executes setup steps automatically.

```
my-skill/
  SKILL.md          # The skill instructions (always required)
  INSTALL.md        # Machine-readable setup recipe (when dependencies exist)
  templates/        # Optional template files referenced by the recipe
```

---

## INSTALL.md Format

### Required Sections

```markdown
---
name: my-skill
requires:
  runtime: node >= 18 | python >= 3.11 | any
  tools: [tool1, tool2]
  mcp-servers: [server-name]
  env-vars: [VAR_NAME]
estimated-time: 2min
idempotent: true
---

## Prerequisites

List what MUST exist before running this recipe.
Agent verifies each item and stops if any are missing.

- [ ] Node.js >= 18 installed
- [ ] `~/.claude/settings.json` exists

## Steps

### 1. Install dependencies

\`\`\`bash
npm install -g some-package
\`\`\`

### 2. Configure MCP server

Add to `~/.claude/settings.json`:

\`\`\`json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "my-mcp-server"]
    }
  }
}
\`\`\`

### 3. Set environment variables

\`\`\`bash
# Add to ~/.zshrc or ~/.bashrc
export VAR_NAME="value-here"
\`\`\`

## Verify

Commands the agent runs to confirm installation succeeded.

\`\`\`bash
which some-package && echo "OK: some-package found"
\`\`\`

## Rollback

Steps to undo the installation if something goes wrong.

\`\`\`bash
npm uninstall -g some-package
\`\`\`
```

---

## Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Skill name, must match parent directory |
| `requires.runtime` | No | Minimum runtime version or `any` |
| `requires.tools` | No | CLI tools that must be available |
| `requires.mcp-servers` | No | MCP servers the skill depends on |
| `requires.env-vars` | No | Environment variables needed |
| `estimated-time` | No | How long install takes (for user expectation) |
| `idempotent` | Yes | Whether running the recipe twice is safe |

---

## Agent Execution Protocol

When an agent encounters a skill with `INSTALL.md`:

### Step 1 — Check if already installed

```
Read INSTALL.md frontmatter
For each requirement:
  - Check if tool exists (which <tool>)
  - Check if MCP server is configured (read settings.json)
  - Check if env var is set (echo $VAR_NAME)
If ALL requirements met → skip install, proceed to SKILL.md
```

### Step 2 — Present install plan to user

```
"Skill 'my-skill' requires setup:
  - Install: some-package
  - Configure: my-mcp-server
  - Set: VAR_NAME
  Estimated time: 2min
  Proceed? (y/n)"
```

NEVER auto-execute without user confirmation.

### Step 3 — Execute steps sequentially

```
For each step in ## Steps:
  - Show the user what will be executed
  - Run the command
  - Verify output
  - If error → show error, offer rollback, STOP
```

### Step 4 — Run verification

```
Execute all commands in ## Verify
If any fail → warn user, suggest manual fix
If all pass → "Installation complete"
```

---

## Examples

### Example: Engram MCP Skill Recipe

```markdown
---
name: engram-memory
requires:
  runtime: node >= 18
  tools: [npx]
  mcp-servers: [engram]
  env-vars: [ENGRAM_API_KEY]
estimated-time: 3min
idempotent: true
---

## Prerequisites

- [ ] Node.js >= 18
- [ ] Claude Code installed and configured
- [ ] Engram API key obtained from https://engram.dev

## Steps

### 1. Add Engram MCP server

Add to `~/.claude/settings.json` under `mcpServers`:

\`\`\`json
{
  "engram": {
    "command": "npx",
    "args": ["-y", "@engram/mcp-server"],
    "env": {
      "ENGRAM_API_KEY": "${ENGRAM_API_KEY}"
    }
  }
}
\`\`\`

### 2. Set API key

\`\`\`bash
echo 'export ENGRAM_API_KEY="your-key-here"' >> ~/.zshrc
source ~/.zshrc
\`\`\`

## Verify

\`\`\`bash
echo $ENGRAM_API_KEY | head -c 4 && echo "...OK: key is set"
\`\`\`

## Rollback

Remove the `engram` entry from `~/.claude/settings.json`.
\`\`\`bash
unset ENGRAM_API_KEY
\`\`\`
```

### Example: Playwright Skill Recipe

```markdown
---
name: webapp-testing
requires:
  runtime: node >= 18
  tools: [npx, playwright]
  mcp-servers: [playwright]
estimated-time: 5min
idempotent: true
---

## Prerequisites

- [ ] Node.js >= 18
- [ ] Project has package.json

## Steps

### 1. Install Playwright

\`\`\`bash
npm init playwright@latest -- --yes --quiet
npx playwright install chromium
\`\`\`

### 2. Add Playwright MCP server

Add to `~/.claude/settings.json` under `mcpServers`:

\`\`\`json
{
  "playwright": {
    "command": "npx",
    "args": ["@anthropic/mcp-playwright"]
  }
}
\`\`\`

## Verify

\`\`\`bash
npx playwright --version && echo "OK: Playwright installed"
\`\`\`

## Rollback

\`\`\`bash
npm uninstall @playwright/test
rm -rf playwright.config.* tests-e2e/
\`\`\`
```

---

## Anti-Patterns

### 1. Non-idempotent recipes

BAD: Recipe that fails if run twice (duplicate config entries, re-creating existing files).
FIX: Always check if the change already exists before applying.

### 2. Silent environment mutation

BAD: Modifying `.bashrc` or `settings.json` without showing the user what will change.
FIX: Always present the diff before writing.

### 3. Missing rollback

BAD: No way to undo the installation.
FIX: Every recipe MUST have a `## Rollback` section.

### 4. Hardcoded paths

BAD: Using `/Users/john/.claude/settings.json` instead of `~/.claude/settings.json`.
FIX: Use `~` or `$HOME` for user-relative paths.

---

## Creating a Recipe for Your Skill

1. List ALL external dependencies your skill needs
2. For each dependency, write a verification command
3. Order steps so failures happen early (prerequisites first)
4. Test the recipe on a clean machine or fresh environment
5. Ensure every step is idempotent
6. Include rollback for every mutation

---

## Critical Rules

1. NEVER auto-execute install recipes without user confirmation.
2. Every INSTALL.md MUST have `idempotent: true` and be safe to run multiple times.
3. Every mutation (file write, config change, package install) MUST have a corresponding rollback step.
4. Environment variables with secrets MUST use placeholder values, never real credentials.
5. The agent MUST verify prerequisites BEFORE executing any steps.
6. If ANY step fails, STOP immediately — do not continue with partial installation.
7. Recipes MUST NOT modify files outside the skill directory without explicit user approval.
