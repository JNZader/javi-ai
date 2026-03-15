---
name: mermaid-config
description: Change theme, output format, or check plugin dependencies
argument-hint: [setting value]
allowed-tools: Read, Bash, Write
---

# /mermaid-config

User request: "$ARGUMENTS"

## Task

Interactive config wizard: view and update plugin settings, or run a dependency health check.

## Config file

All settings are stored in `.claude/mermaid.json` in the current project directory.

Default values (used when file does not exist):

```json
{
  "theme": "zinc-light",
  "output_directory": "./diagrams",
  "auto_validate": true,
  "auto_render": false,
  "output_format": "svg"
}
```

## Process

### Step 1: Resolve Plugin Path

```bash
PLUGIN_DIR="$HOME/.claude/plugins/mermaid"
```

Use `$PLUGIN_DIR` in all subsequent commands.

### Step 2: Read current config

If `.claude/mermaid.json` exists, read it. Otherwise use defaults above.

### Step 3: If argument provided

If the user passed arguments (e.g. `theme dracula` or `auto_render true`), apply directly:

- Parse as `{setting} {value}`
- For `theme`: accept any of the 15 beautiful-mermaid theme names or `custom`
- Validate value is allowed (see options below)
- Update `.claude/mermaid.json`
- Confirm: "setting set to value"
- Done.

### Step 4: If no argument — show interactive menu

Display:

```
Current config (.claude/mermaid.json):

  1. theme             → {current}   (zinc-light, github-dark, dracula, … 15 themes + custom)
  2. output_directory  → {current}
  3. auto_validate     → {current}   (true | false)
  4. auto_render       → {current}   (true | false)
  5. output_format     → {current}   (svg)
  6. custom theme      → configure themeVariables
  7. Run health check

What would you like to change? (enter 1-7)
```

### Step 5: Handle selection

**If 1 (theme):**

```
Available themes (beautiful-mermaid):

  Light:
   1. zinc-light           clean, neutral light
   2. github-light         GitHub-style light
   3. catppuccin-latte     warm pastel light
   4. nord-light           arctic light palette
   5. solarized-light      Solarized light
   6. tokyo-night-light    Tokyo Night light variant

  Dark:
   7. zinc-dark            clean, neutral dark
   8. github-dark          GitHub-style dark
   9. catppuccin-mocha     warm pastel dark
  10. nord                 arctic dark palette
  11. dracula              Dracula purple
  12. solarized-dark       Solarized dark
  13. tokyo-night          Tokyo Night
  14. tokyo-night-storm    Tokyo Night Storm variant
  15. one-dark             Atom One Dark

  16. custom               define your own colors

Enter 1-16:
```

Update `theme` in `.claude/mermaid.json`.

**If 2 (output_directory):** Ask for path. Update config.

Special values:

- `"same"` — save output in the same directory as the input file. Falls back to `./diagrams` when there is no input file reference (e.g. text-only `/mermaid-diagram` calls).

**If 3 (auto_validate):** Toggle true/false. Update config.

**If 4 (auto_render):** Toggle true/false. Update config.

**If 5 (output_format):**

```
Available formats:
  1. svg   — vector, only supported format

Enter 1:
```

Update `output_format` in `.claude/mermaid.json`.

**If 6 (custom theme):**
Present the current values and prompt for each variable (leave blank to keep current):

```
Custom theme colors (beautiful-mermaid format):

  bg      → {current or #ffffff}   background color (required)
  fg      → {current or #1a1a2e}   foreground/text color (required)
  line    → {current or #666666}   arrow and line color (optional)
  accent  → {current or #4a90d9}   accent/highlight color (optional)
  muted   → {current or #999999}   muted text color (optional)
```

Accept a hex color (`#rrggbb`) for each. Set `theme` to `"custom"` and save all entered values under `themeVariables` in `.claude/mermaid.json`.

Example saved config:

```json
{
  "theme": "custom",
  "themeVariables": {
    "bg": "#1a1b26",
    "fg": "#a9b1d6",
    "line": "#565f89",
    "accent": "#7aa2f7",
    "muted": "#565f89"
  }
}
```

**If 7 (health check):** See Health Check section below.

### Step 6: Write updated config

Create `.claude/` directory if it doesn't exist:

```bash
mkdir -p .claude
```

Write updated settings to `.claude/mermaid.json` (merge with existing, don't overwrite unrelated keys).

Confirm: "Config saved to .claude/mermaid.json"

---

## Health Check

Run when user selects option 7.

### Check 1: Node.js

```bash
node --version 2>&1
```

Pass if v18.0.0 or higher | Fail if not found or older → "Install Node.js 18+: <https://nodejs.org>"

### Check 2: beautiful-mermaid (local node_modules)

```bash
ls "$PLUGIN_DIR/scripts/node_modules/beautiful-mermaid" 2>/dev/null && echo "found" || echo "not found"
```

- If "found" → show version from `$PLUGIN_DIR/scripts/node_modules/beautiful-mermaid/package.json`
- If "not found" → auto-install:

  ```bash
  npm install --prefix "$PLUGIN_DIR/scripts"
  ```

  Confirm: "beautiful-mermaid installed"

### Check 3: Render smoke test

```bash
printf 'flowchart TD\n    A --> B' | node "$PLUGIN_DIR/scripts/render.js" /dev/stdin --output /tmp/mermaid-health-check.svg 2>&1
```

Pass if exit 0 and `/tmp/mermaid-health-check.svg` contains `<svg` | Fail if error → show the JSON error message

### Output format

```
Mermaid plugin — dependency check

  Node.js v22.1.0      required runtime
  beautiful-mermaid     v1.1.3 — installed
  Render smoke test     SVG generated OK

Features:
  Generate diagrams    Validate    Render SVG
  PNG not supported   (use SVG — works everywhere Git renders markdown)
```
