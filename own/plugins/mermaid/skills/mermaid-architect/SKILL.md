---
name: mermaid-architect
description: Scan a codebase and auto-generate relevant diagrams from its structure
argument-hint: [path]
allowed-tools: Read, Bash, Glob, Grep, Write, Edit
---

# /mermaid-architect

User request: "$ARGUMENTS"

## Task

Analyze a codebase or project path and generate a relevant suite of Mermaid diagrams (typically 3-5 types based on what's found).

## Difference from /mermaid-diagram

- `/mermaid-diagram` generates **one diagram** from a **text description**
- `/mermaid-architect` generates **multiple diagrams** from **actual code/files** at a given path

## Process

### Step 1: Resolve Plugin Path

```bash
PLUGIN_DIR="$HOME/.claude/plugins/mermaid"
```

### Step 2: Ensure Dependencies

```bash
bash "$PLUGIN_DIR/scripts/ensure-deps.sh"
```

If `.claude/mermaid.json` does **not** exist, display a one-time nudge before continuing:

> First time using the mermaid plugin? Run `/mermaid-config` to pick a theme and output settings. Using defaults for now (zinc-light, `./diagrams`).

### Step 3: Read Config

If `.claude/mermaid.json` exists, read `output_directory`, `theme`, `auto_validate`, `auto_render`.

**Resolve output path:**

- If `output_directory` is `"same"` AND an input path is known:
  `OUTPUT_DIR=$(dirname {input_file})` (for a directory argument, use the directory itself)
- If `output_directory` is `"same"` AND no argument was provided:
  `OUTPUT_DIR=./diagrams`
- Otherwise:
  `OUTPUT_DIR=<output_directory from config>`

### Theme-First Rule

Respect the configured `theme`/`themeVariables` as the visual source of truth.

- Do not emit hardcoded `classDef fill/stroke/color` by default.
- Only add explicit color overrides if the user asks for a custom palette or semantic color coding.

### Step 4: Resolve Target Path

- If no argument, use current directory.
- If argument is a file, analyze that single file.
- If argument is a directory, explore it.

### Step 5: Explore Codebase

Run these to understand what's present:

```bash
find {path} \( -name "*.py" -o -name "*.ts" -o -name "*.js" -o -name "*.rb" -o -name "*.go" \) | grep -v node_modules | head -50
find {path} \( -name "*.sql" -o -name "*.prisma" -o -name "*schema*" \) | grep -v node_modules | head -20
find {path} \( -name "routes*" -o -name "router*" -o -name "urls*" \) | grep -v node_modules | head -20
```

Read key files to understand the domain (models, routes, services, main entry point).

### Step 6: Infer Diagram Types

Based on what's found:

| Found | Generates |
|---|---|
| Database models / ORM / schema files | ER diagram |
| API routes / controllers / endpoints | Sequence diagram (request flow) |
| Service classes / modules | Architecture diagram |
| State/lifecycle fields (`status`, `state`) | State diagram |
| Config / deployment files (docker, k8s, cloud) | Deployment diagram |
| Class files with inheritance | Class diagram |

Select 3-5 most relevant types. Do not generate all 7 unless the codebase clearly warrants it.

### Step 7: Generate Each Diagram

For each selected type, load the specialist:

```bash
cat "$PLUGIN_DIR/specialists/mermaid-{type}.md"
```

Follow the specialist's **Process** section using the actual code found in Step 4 as input. Generate diagram content from real code, not hypothetical examples.

### Theme handling for rendering

When rendering diagrams in Step 9:

- If `theme == "custom"` and `themeVariables` is present in config:
  Pass `--custom-theme '{serialized themeVariables JSON}'` to the render script.

- If `theme == "custom"` but `themeVariables` is absent from config:
  Render without custom theme and display a note:
  > Custom theme configured but no themeVariables found — run `/mermaid-config` → option 6 to define colors.

- Otherwise: pass `--theme {theme}` to the render script.

### Step 8: Validate

For each generated diagram:

```bash
node "$PLUGIN_DIR/scripts/extract_mermaid.js" {output_file} --validate
```

Fix any errors using `$PLUGIN_DIR/references/guides/troubleshooting.md`.

### Step 9: Render (if auto_render=true or user requests)

Apply theme handling from the section above:

```bash
# Named theme:
node "$PLUGIN_DIR/scripts/resilient_diagram.js" {file} --output-dir $OUTPUT_DIR --theme {theme}
# Custom theme:
node "$PLUGIN_DIR/scripts/resilient_diagram.js" {file} --output-dir $OUTPUT_DIR --custom-theme '{serialized themeVariables JSON}'
```

If the script fails (Node.js not found, `node_modules` missing): stop and tell the user to run `/mermaid-config` → option 7 (health check) to diagnose missing dependencies.

### Step 10: Report

```
Analyzed: {path}
Generated {N} diagrams:

  $OUTPUT_DIR/er-{name}-{timestamp}.mmd       (ER — 5 entities, 7 relationships)
  $OUTPUT_DIR/sequence-{name}-{timestamp}.mmd  (Sequence — 4 actors, 8 messages)
  $OUTPUT_DIR/architecture-{name}-{timestamp}.mmd (Architecture — 6 components)

Validation: all passed
```

### Step 11: Offer design document (opt-in)

If 3 or more diagrams were generated, offer to assemble them into a system design document:

```
Generated {N} diagrams — want me to assemble them into a system design document?
   I'll use the system-design-template and embed each diagram in the relevant section.
```

If user accepts:

1. Read `$PLUGIN_DIR/assets/system-design-template.md`
2. Embed each generated diagram in its matching section (architecture → Architecture Overview, ER → Data Architecture, sequence → API Flow, etc.)
3. Fill metadata placeholders with the analyzed path and codebase context
4. Save to `$OUTPUT_DIR/{project-name}-system-design.md`

If fewer than 3 diagrams: skip silently.

## Common Mistakes

- **Generating all 7 diagram types** when the codebase only warrants 3-4. Select only the types that have clear evidence in the code.
- **Empty PLUGIN_DIR** — if the plugin directory doesn't exist, stop and report: "Plugin not found. Is it installed?"
- **Analyzing node_modules or build directories** — always exclude with `-not -path "*/node_modules/*"` and `-not -path "*/dist/*"`.
- **Generating from file headers only** — read actual function bodies, model fields, and route handlers before inferring diagram type. Surface-level file names can mislead.
