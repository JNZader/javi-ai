---
name: trim-md
description: Trim and optimize markdown files for LLM consumption using markdownlint-cli2
type: plugin
license: MIT
metadata:
  author: diego-marino
  upstream: https://github.com/diegomarino/claude-toolshed
  version: "1.0.2"
dependencies:
  required:
    - node
    - npx
permissions:
  - "Bash(~/.claude/plugins/trim-md/scripts/*:*)"
---

# /trim-md

User request: "$ARGUMENTS"

## Task

Trim and optimize markdown files for LLM/agent consumption. Run the trim-md script on the given paths, then present the output.

> **Note:** The PostToolUse hook from the upstream plugin is intentionally excluded. This plugin is manual-invoke only — run it explicitly via `/trim-md`.

## Opt-out

Files containing `<!-- trim-md:disable -->` on its own line are excluded. The comment must be a standalone line — inline mentions in prose or code blocks are ignored.

## Process

### Step 1: Resolve plugin directory

```bash
PLUGIN_DIR="$HOME/.claude/plugins/trim-md"
echo "PLUGIN_DIR=$PLUGIN_DIR"
```

If `PLUGIN_DIR` does not exist, stop with: "Could not locate the trim-md plugin directory. Ensure the plugin is installed."

### Step 2: Ensure dependencies

```bash
bash "$PLUGIN_DIR/scripts/ensure-deps.sh"
```

If the script exits with an error, show the missing dependency message to the user and stop.

### Step 3: Run trim-md

Parse `$ARGUMENTS` for paths and the dry-run flag.

**Dry-run detection:** If `$ARGUMENTS` contains any of these tokens (case-insensitive): `dry`, `dry-run`, `--dry-run`, `dryrun` — pass `--dry-run` to the script. Remove the token from the path list.

Remaining arguments are the target paths. If no paths remain, use `.` (current directory).

```bash
bash "$PLUGIN_DIR/scripts/trim-md.sh" [--dry-run] <paths>
```

### Step 4: Present output

Show the script output to the user as-is. No additional commentary needed unless there were errors.
