---
name: mermaid
description: Generate, validate, and render Mermaid diagrams with beautiful-mermaid theming
type: plugin
license: MIT
metadata:
  author: diego-marino
  upstream: https://github.com/diegomarino/claude-toolshed
  version: "1.0.2"
dependencies:
  required:
    - node
    - npm
permissions:
  - "Bash(~/.claude/plugins/mermaid/scripts/*:*)"
---

# Mermaid — Diagram and Documentation Skill

Mermaid diagram and documentation system with specialized guides and code-to-diagram capabilities.

## Plugin Path

```bash
PLUGIN_DIR="$HOME/.claude/plugins/mermaid"
```

## Entry Points

| Entry point | When to use |
|-------------|-------------|
| `/mermaid-{type}` commands | You know the diagram type — fastest path |
| `/mermaid-diagram` | Unsure of type — describe what you want, gets routed automatically |
| `/mermaid-validate` | Batch-check existing `.md` files for broken diagrams |
| `/mermaid-render` | Render an existing `.mmd` file to SVG |
| `/mermaid-config` | Configure defaults and check dependencies |
| `/mermaid-architect` | Analyze a codebase path and generate a diagram suite |
| `diagram-architect` agent | Claude detects diagram need during active development work |
| This skill (PLUGIN.md) | Extended sessions: design docs, code-to-diagram, multi-diagram projects |

## Diagram Type Routing

Load only the guide for the requested type. Do not pre-load all guides.

**Suite requests** ("generate diagrams from this codebase", "diagram this project"): use `/mermaid-architect` — it selects multiple diagram types automatically from actual code.

**Ambiguous type** (description matches multiple types): use `/mermaid-diagram` — it asks one clarifying question and routes automatically.

| User wants | Load |
|------------|------|
| Workflow, process, approval flow, user journey | `$PLUGIN_DIR/references/guides/diagrams/activity-diagrams.md` |
| Infrastructure, cloud, K8s, deployment | `$PLUGIN_DIR/references/guides/diagrams/deployment-diagrams.md` |
| System architecture, components, microservices | `$PLUGIN_DIR/references/guides/diagrams/architecture-diagrams.md` |
| API flow, service interactions, request/response | `$PLUGIN_DIR/references/guides/diagrams/sequence-diagrams.md` |
| Class hierarchy, OOP design, data models | `$PLUGIN_DIR/references/guides/diagrams/class-diagrams.md` |
| Database schema, ER model | `$PLUGIN_DIR/references/guides/diagrams/er-diagrams.md` |
| State machines, lifecycle, FSM | `$PLUGIN_DIR/references/guides/diagrams/state-diagrams.md` |

## Reference Guides

| Need | Load |
|------|------|
| Syntax errors, rendering failures | `$PLUGIN_DIR/references/guides/troubleshooting.md` (18 documented patterns) |
| Learning Mermaid, preventing errors | `$PLUGIN_DIR/references/guides/common-mistakes.md` |
| Color schemes, accessibility, themes | `$PLUGIN_DIR/references/guides/styling-guide.md` |
| Production workflow, validation loop | `$PLUGIN_DIR/references/guides/resilient-workflow.md` |
| Quick routing from symptom to action | `$PLUGIN_DIR/references/guides/quick-decision-matrix.md` |

`styling-guide.md` is a special-case reference. Do not load it by default. Load it only when the user explicitly asks for custom palette/theme behavior, brand colors, accessibility tuning, or style overrides.

## Code-to-Diagram

**Routing rule:** if the user names a framework → use the row below. If no framework is named → use `/mermaid-architect`.

| Framework | Load | Which diagram guide |
|-----------|------|---------------------|
| Spring Boot | `$PLUGIN_DIR/examples/spring-boot/README.md` | Routes/controllers → sequence · Models/entities → class · Overview → architecture |
| FastAPI / Python API | `$PLUGIN_DIR/examples/fastapi/README.md` | Endpoints/deps → sequence · Pydantic models → class · Overview → architecture |
| React / frontend | `$PLUGIN_DIR/examples/react/README.md` | architecture (always) |
| Python ETL / batch | `$PLUGIN_DIR/examples/python-etl/README.md` | activity (always) |
| Node/Express | `$PLUGIN_DIR/examples/node-webapp/README.md` | Middleware/routes → sequence · Overview → architecture |
| Java Web App | `$PLUGIN_DIR/examples/java-webapp/README.md` | Routes → sequence · Models → class · Overview → architecture |
| Any codebase | `$PLUGIN_DIR/references/guides/code-to-diagram/README.md` | Master guide determines type |

## Design Document Templates (`assets/`)

| Template | When to load |
|----------|--------------|
| `architecture-design-template.md` | "Create architecture doc", "Document system design" |
| `api-design-template.md` | "API design doc", "Document REST API" |
| `feature-design-template.md` | "Feature design", "Plan new feature" |
| `database-design-template.md` | "Database design", "Document schema" |
| `system-design-template.md` | "System design doc", "Full system documentation" |
| `local-config-template.md` | "Create mermaid local config", "Generate `.claude/mermaid.json` template" |

## Scripts (`scripts/`)

| Script | Use for |
|--------|---------|
| `extract_mermaid.js` | Extract diagrams from Markdown, validate syntax |
| `resilient_diagram.js` | Full workflow: save `.mmd`, generate SVG, validate, recover errors |

## Resilient Workflow

**CRITICAL:** Use `resilient_diagram.js` for all diagram generation — ensures validation and error recovery.

**Key principle:** Never add a diagram to Markdown until it passes validation via `extract_mermaid.js --validate`.

**If no target file is specified for embedding:** ask the user for the file path before proceeding with the embed step.

**If `resilient_diagram.js` fails** (Node.js not found, `node_modules` missing): stop and tell the user to run `/mermaid-config` → option 7 (health check) to diagnose missing dependencies.

**Error recovery order:** `troubleshooting.md` → `common-mistakes.md` → WebSearch

Full guide: `$PLUGIN_DIR/references/guides/resilient-workflow.md`

## Unicode Symbols

Load `$PLUGIN_DIR/references/guides/unicode-symbols/guide.md` when user mentions "symbols", "icons", "emoji in diagrams".

Quick reference: cloud · load balancer · compute · data · messaging · security · alerts

## Theme-First Styling

Default behavior: preserve the user's configured `theme`/`themeVariables`.

- Do not add `classDef` with hardcoded `fill`/`stroke`/`color` unless the user explicitly asks for custom node colors.
- Prefer semantic structure (subgraphs, labels, edges) over custom palette overrides.
- If custom styling is explicitly requested, keep overrides minimal and ensure readable contrast.

## User Configuration

Read `.claude/mermaid.json` as a first step before routing. Supported keys: `theme`, `auto_validate`, `output_directory`. Sub-skills (`mermaid-diagram`, `mermaid-architect`, `mermaid-render`) handle their own config reads in their Step 2.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Diagram won't render after adding to Markdown | Validate with `extract_mermaid.js --validate` first — see `$PLUGIN_DIR/references/guides/resilient-workflow.md` |
| Syntax error with no obvious cause | Check `$PLUGIN_DIR/references/guides/troubleshooting.md` (18 documented patterns) |
| Repeated syntax mistakes | Read `$PLUGIN_DIR/references/guides/common-mistakes.md` before generating |
| Generated diagram ignores configured theme | Remove hardcoded `classDef fill/stroke/color`; use theme-first defaults |
| Loading all guides upfront | Load only the guide for the requested diagram type |
