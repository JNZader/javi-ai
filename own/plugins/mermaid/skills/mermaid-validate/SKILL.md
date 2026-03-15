---
name: mermaid-validate
description: Validate Mermaid syntax in .md files or directories
argument-hint: [path]
allowed-tools: Read, Bash
---

# /mermaid-validate

User request: "$ARGUMENTS"

## Task

Check Mermaid syntax for all diagrams found in a given file or directory.

## Process

1. **Resolve Plugin Path**: Run once before executing any scripts:

   ```bash
   PLUGIN_DIR="$HOME/.claude/plugins/mermaid"
   ```

2. **Ensure Dependencies**:

   ```bash
   bash "$PLUGIN_DIR/scripts/ensure-deps.sh"
   ```

   If `.claude/mermaid.json` does **not** exist, display a one-time nudge before continuing:

   > First time using the mermaid plugin? Run `/mermaid-config` to pick a theme and output settings. Using defaults for now (zinc-light, `./diagrams`).

3. **Resolve Target Path**:
   - If no path is provided, use the current directory.
   - If the path is a file, validate that single file.
   - If the path is a directory, find all `.md` files containing Mermaid blocks.

4. **Optional Config**:
   - If `.claude/mermaid.json` exists, read defaults:
     - `output_directory` (default: ./diagrams)

   **Resolve output path:**

   - If `output_directory` is `"same"` AND an input file path is known:
     `OUTPUT_DIR=$(dirname {input_file})` (for a directory argument, use the directory itself)
   - If `output_directory` is `"same"` AND no argument was provided:
     `OUTPUT_DIR=./diagrams`
   - Otherwise:
     `OUTPUT_DIR={output_directory}`

5. **Validate**:
   - For each markdown file:
     `node "$PLUGIN_DIR/scripts/extract_mermaid.js" <file> --validate`

6. **Report**:
   - Summarize pass/fail per file.
   - If a file fails, point to `$PLUGIN_DIR/references/guides/troubleshooting.md`.

## Output

- Summary of files validated
- List of failures with errors

## Reference

- Troubleshooting: `$PLUGIN_DIR/references/guides/troubleshooting.md`
