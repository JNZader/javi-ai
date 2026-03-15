# mermaid

A Claude Code plugin for generating, validating, rendering, and managing Mermaid diagrams. Powered by [beautiful-mermaid](https://github.com/lukilabs/beautiful-mermaid) for themed SVG rendering.

See the [root README](../../README.md#mermaid) for a visual overview.

## Install

```text
/plugin install mermaid@claude-toolshed
```

**Requires:** Node.js 18+

## Commands

| Command | What it does | Best for |
| --- | --- | --- |
| `/mermaid-diagram` | Describe what you want — auto-detects diagram type | Quick single diagrams from a text description |
| `/mermaid-architect` | Analyze a codebase directory — generates 3-5 diagrams | Documenting an existing project |
| `/mermaid-validate` | Check Mermaid syntax in `.md` files or directories | Catching broken diagrams before commit |
| `/mermaid-render` | Render `.mmd` files to SVG | Exporting diagrams for docs or PRs |
| `/mermaid-config` | Configure theme, output format, and check dependencies | First-time setup and health checks |

```text
/mermaid-diagram "user login with JWT and refresh token"
/mermaid-architect src/
/mermaid-validate docs/
/mermaid-render diagrams/auth-flow.mmd
/mermaid-config
```

## Diagram types

The plugin routes your description to one of 7 specialist diagram types:

| Type | Use when you need to show | Example prompt |
| --- | --- | --- |
| **Sequence** | Interactions between actors over time | "API call with JWT and refresh token" |
| **Architecture** | System components and their connections | "microservices overview with API gateway" |
| **ER** | Database entities and relationships | "user, order, and product schema" |
| **Activity** | Workflows, processes, decision points | "CI/CD pipeline with approval gates" |
| **State** | Lifecycle transitions of a single entity | "order status from created to delivered" |
| **Class** | Object-oriented structures and inheritance | "payment processor class hierarchy" |
| **Deployment** | Infrastructure tiers and hosting | "3-tier AWS deployment with RDS" |

## Code-to-diagram routing

`/mermaid-architect` detects your framework and picks the right diagram types:

| Framework | What it generates |
| --- | --- |
| **Spring Boot** | Sequence (controllers), Class (entities), Architecture (services) |
| **FastAPI** | Sequence (endpoints), Class (Pydantic models), Architecture (overview) |
| **React** | Architecture (component tree, state flow) |
| **Node/Express** | Sequence (middleware/routes), Architecture (overview) |
| **Python ETL** | Activity (pipeline stages, transforms) |
| **Java Web** | Sequence (routes), Class (models), Architecture (overview) |

## Configuration

**File:** `.claude/mermaid.json` (in the project root)

Created automatically by `/mermaid-config`, or copy from the [config template](skills/mermaid/assets/local-config-template.md). The plugin reads this file as its first step on every command. If the file doesn't exist, defaults are used.

### Schema

```jsonc
{
  // Named theme or "custom" to use themeVariables
  "theme": "zinc-light",

  // Where .mmd and rendered files are saved (relative to project root)
  // Use "same" to save next to the input file
  "output_directory": "./diagrams",

  // Run syntax validation after generating a diagram
  "auto_validate": true,

  // Render to SVG automatically after generating a diagram
  "auto_render": false,

  // Output format (only "svg" is supported)
  "output_format": "svg",

  // Custom color palette — only used when theme is "custom"
  "themeVariables": {
    "bg": "#ffffff",       // diagram background
    "fg": "#1a1a2e",       // text and labels
    "accent": "#4a90d9",   // primary elements (nodes, actors, borders)
    "line": "#666666",     // arrows and connectors
    "muted": "#999999"     // secondary elements (subgraphs, notes)
  }
}
```

Only the keys shown above are recognized. Unknown keys are ignored.

### Available themes (15)

<table>
<tr>
<td align="center"><img src="../../docs/assets/theme-strip-catppuccin-latte.svg" width="220" alt="catppuccin-latte"><br><sub>catppuccin-latte</sub></td>
<td align="center"><img src="../../docs/assets/theme-strip-catppuccin-mocha.svg" width="220" alt="catppuccin-mocha"><br><sub>catppuccin-mocha</sub></td>
<td align="center"><img src="../../docs/assets/theme-strip-dracula.svg" width="220" alt="dracula"><br><sub>dracula</sub></td>
</tr>
<tr>
<td align="center"><img src="../../docs/assets/theme-strip-github-dark.svg" width="220" alt="github-dark"><br><sub>github-dark</sub></td>
<td align="center"><img src="../../docs/assets/theme-strip-github-light.svg" width="220" alt="github-light"><br><sub>github-light</sub></td>
<td align="center"><img src="../../docs/assets/theme-strip-nord.svg" width="220" alt="nord"><br><sub>nord</sub></td>
</tr>
<tr>
<td align="center"><img src="../../docs/assets/theme-strip-nord-light.svg" width="220" alt="nord-light"><br><sub>nord-light</sub></td>
<td align="center"><img src="../../docs/assets/theme-strip-one-dark.svg" width="220" alt="one-dark"><br><sub>one-dark</sub></td>
<td align="center"><img src="../../docs/assets/theme-strip-solarized-dark.svg" width="220" alt="solarized-dark"><br><sub>solarized-dark</sub></td>
</tr>
<tr>
<td align="center"><img src="../../docs/assets/theme-strip-solarized-light.svg" width="220" alt="solarized-light"><br><sub>solarized-light</sub></td>
<td align="center"><img src="../../docs/assets/theme-strip-tokyo-night.svg" width="220" alt="tokyo-night"><br><sub>tokyo-night</sub></td>
<td align="center"><img src="../../docs/assets/theme-strip-tokyo-night-light.svg" width="220" alt="tokyo-night-light"><br><sub>tokyo-night-light</sub></td>
</tr>
<tr>
<td align="center"><img src="../../docs/assets/theme-strip-tokyo-night-storm.svg" width="220" alt="tokyo-night-storm"><br><sub>tokyo-night-storm</sub></td>
<td align="center"><img src="../../docs/assets/theme-strip-zinc-dark.svg" width="220" alt="zinc-dark"><br><sub>zinc-dark</sub></td>
<td align="center"><img src="../../docs/assets/theme-strip-zinc-light.svg" width="220" alt="zinc-light"><br><sub>zinc-light</sub></td>
</tr>
</table>

### Theme-first styling

The plugin respects your configured theme and avoids hardcoded `classDef` color overrides. This ensures diagrams look consistent across your project. Custom colors are only applied when explicitly requested.

## `/mermaid-config` menu

Running `/mermaid-config` without arguments opens an interactive menu:

| Option | What it does |
| --- | --- |
| 1 | Change theme (pick from 15 built-in or define custom colors) |
| 2 | Set output directory |
| 3 | Toggle auto-validate (check syntax after generation) |
| 4 | Toggle auto-render (export SVG after generation) |
| 5 | Set output format |
| 6 | Define custom theme (background, foreground, accent, line, muted) |
| 7 | Health check (verify Node.js, beautiful-mermaid, render smoke test) |

## Agents

| Agent | Description |
| --- | --- |
| `diagram-architect` | Proactive agent that detects diagram opportunities during development and proposes diagrams |

## Troubleshooting

The plugin includes a [troubleshooting guide](skills/mermaid/references/guides/troubleshooting.md) with 18 documented error patterns and fixes. Common issues:

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Syntax error on render | Missing spaces around arrows | Use `A --> B` not `A-->B` |
| Parse failure | Unsupported diagram header | Check [common mistakes](skills/mermaid/references/guides/common-mistakes.md) |
| Colors look wrong | Hardcoded `classDef` overriding theme | Remove `classDef` and let the theme handle styling |
| Render fails silently | beautiful-mermaid not installed | Run `/mermaid-config` → option 7 (health check) |

For symptom-to-action routing, see the [quick decision matrix](skills/mermaid/references/guides/quick-decision-matrix.md).

## Design document templates

For larger documentation efforts, the plugin includes templates that combine multiple diagrams:

- **System design** — assembles architecture + sequence + deployment
- **API design** — endpoints, request/response flows, error handling
- **Feature design** — user stories mapped to activity + sequence diagrams
- **Database design** — ER diagrams with migration notes
- **Architecture design** — component diagrams with dependency analysis

Use `/mermaid-architect` on a codebase directory — when 3+ diagrams are generated, it offers to assemble them into a design document.

## Credits

- Rendering engine: [beautiful-mermaid](https://github.com/lukilabs/beautiful-mermaid) (MIT License)
- A subset of guides, templates, and examples are adapted from [SpillwaveSolutions/design-doc-mermaid](https://github.com/SpillwaveSolutions/design-doc-mermaid) (MIT License)
