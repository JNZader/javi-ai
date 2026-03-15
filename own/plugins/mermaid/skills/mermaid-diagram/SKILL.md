---
name: mermaid-diagram
description: Generate a Mermaid diagram from a text description
argument-hint: [description]
allowed-tools: Read, Bash, Write, Edit
---

# /mermaid-diagram

User request: "$ARGUMENTS"

## Task

Analyze the user's description, select the appropriate diagram type, and generate the diagram.

## Instructions

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

If `.claude/mermaid.json` exists, read it and apply:

- `theme` (default: zinc-light)
- `output_directory` (default: ./diagrams)
- `auto_validate` (default: true)
- `auto_render` (default: false)

**Resolve output path:**

- If `output_directory` is `"same"` AND an input file path is known (e.g. the file being documented):
  `OUTPUT_DIR=$(dirname {input_file})`
- If `output_directory` is `"same"` AND no input file (text description only):
  `OUTPUT_DIR=./diagrams`
- Otherwise:
  `OUTPUT_DIR={output_directory}`

### Theme-First Rule

Respect the configured `theme`/`themeVariables` as the visual source of truth.

- Do not emit hardcoded `classDef fill/stroke/color` by default.
- Only add explicit color overrides if the user asks for a custom palette or semantic color coding.

### Step 4: Analyze User Description

**Analyze the request semantically** — interpret intent regardless of language:

| What the user wants to show | Type |
|---|---|
| How a process works, step-by-step flow, approval workflow, user journey | Activity |
| Who calls whom, API interactions, request/response, message passing between services | Sequence |
| Infrastructure topology, cloud resources, deployment, servers, containers | Deployment |
| System components, microservices, layers, modules, high-level structure | Architecture |
| Classes, objects, inheritance, OOP design, data models | Class |
| Database tables, entities, foreign keys, schema design | ER |
| States a thing can be in, lifecycle, FSM, transitions | State |

If the description matches multiple types, present the top 2 options briefly and ask which.

If the request is "Not sure" or ambiguous, ask: "Briefly describe what you want to visualize — a process, a system, API calls, a database schema, or something else?"

### Step 5: Present Recommendation

```markdown
Based on your description "{description}", I recommend a **{type}** diagram because {reason}.

Proceeding with {type}...
```

### Step 6: Load and Execute Specialist

Read the specialist file from `$PLUGIN_DIR/specialists/mermaid-{type}.md` and follow its **Process** and **Output** sections exactly. Do not ask the user again — generate the diagram.

Type-to-filename mapping:

- Activity → `mermaid-activity.md`
- Sequence → `mermaid-sequence.md`
- Deployment → `mermaid-deployment.md`
- Architecture → `mermaid-architecture.md`
- Class → `mermaid-class.md`
- ER → `mermaid-er.md`
- State → `mermaid-state.md`

### Step 7: Auto-render (if enabled)

If `auto_render == true` (or the user explicitly asks to render), render the generated `.mmd` file to SVG:

- If `theme == "custom"` and `themeVariables` is present in config:

  ```bash
  node "$PLUGIN_DIR/scripts/resilient_diagram.js" {file} --output-dir $OUTPUT_DIR --custom-theme '{serialized themeVariables JSON}'
  ```

- If `theme == "custom"` but `themeVariables` is absent from config:
  Render without custom theme and display a note:
  > Custom theme configured but no themeVariables found — run `/mermaid-config` → option 6 to define colors.

- Otherwise:

  ```bash
  node "$PLUGIN_DIR/scripts/resilient_diagram.js" {file} --output-dir $OUTPUT_DIR --theme {theme}
  ```

If the script fails, tell the user to run `/mermaid-config` → option 7 (health check).

### Step 8: Offer design document (opt-in)

If the user's request mentions "document", "design doc", "design", or similar, **or** the generated diagram has high complexity (5+ components/entities/states), offer to scaffold a full design document around the diagram.

Match the diagram type to a template:

| Diagram type | Template file |
|---|---|
| Architecture | `$PLUGIN_DIR/assets/architecture-design-template.md` |
| Sequence | `$PLUGIN_DIR/assets/api-design-template.md` |
| ER | `$PLUGIN_DIR/assets/database-design-template.md` |
| Activity, State, Class, Deployment | `$PLUGIN_DIR/assets/feature-design-template.md` |

Display:

```
This diagram could anchor a full design document.
   I can scaffold one using the {template_name} template — say "yes" to proceed.
```

If user accepts:

1. Read the template from `$PLUGIN_DIR/assets/{template}`
2. Embed the generated diagram in the relevant section
3. Fill metadata placeholders (`[Name]`, `[Date]`, etc.) with context from the user's request
4. Save the document to `$OUTPUT_DIR/{name}-design-doc.md`

If not triggered (simple diagram, no design keywords): skip silently.

### Code/Script Flow Requests

If the user asks to "diagram the flow" of a file or script:

1. Read the file first and derive the flow from actual control paths.
2. If the diagram type is still unclear, ask one short clarification.
3. Execute as the appropriate specialist after confirming intent.

## Examples

**Input:** `/mermaid-diagram "order processing with payment gateway"`
**Analysis:** Business workflow → Activity
**Executes:** `$PLUGIN_DIR/specialists/mermaid-activity.md`

**Input:** `/mermaid-diagram "API call from React frontend to FastAPI backend"`
**Analysis:** Service interaction → Sequence
**Executes:** `$PLUGIN_DIR/specialists/mermaid-sequence.md`
