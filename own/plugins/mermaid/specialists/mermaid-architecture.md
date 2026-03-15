---
description: Generate architecture diagrams for system components and design patterns
argument-hint: [description]
allowed-tools: Read, Bash, Write, Edit
---

# /mermaid-architecture

User request: "$ARGUMENTS"

## Task

Generate a Mermaid architecture diagram for system components, layers, and design patterns, or improve an existing diagram.

## Process

1. **Resolve Plugin Path**:

   ```bash
   PLUGIN_DIR="$HOME/.claude/plugins/mermaid"
   ```
2. **Load Reference**: Read `PLUGIN_DIR/references/guides/diagrams/architecture-diagrams.md` for patterns and syntax
3. **Identify Components**: Frontend (web, mobile), backend (API, services, workers), data (databases, caches, queues), integrations (external APIs, third-party)
4. **Identify Pattern**: Layered (presentation → business → data), microservices (API gateway + services), event-driven (producers → broker → consumers), hexagonal (core + adapters)
5. **Generate Diagram**:
   - Use `graph TB` with subgraphs for logical boundaries
   - Keep output theme-first: avoid hardcoded `classDef fill/stroke/color` unless user explicitly requests custom colors
   - Apply Unicode symbols: 👤 UI, 🌐 gateway, 🔐 auth, ⚙️ service, 💾 database, ⚡ cache, 📨 queue, 🔧 config, 📊 analytics
   - Show relationships: `-->` sync calls, `-.->` async/optional, `==>` data flow
   - Include technology annotations (Spring Boot @Service, PostgreSQL, etc.)
   - Use subgraphs to show layers/bounded contexts
6. **Validate**:
   - If output is Markdown with ` ```mermaid ` blocks, use:
     `node "$PLUGIN_DIR/scripts/extract_mermaid.js" {file} --validate`
   - Manual check: subgraph `end` keywords, arrow syntax, special chars quoted
   - Fix errors using `PLUGIN_DIR/references/guides/troubleshooting.md`
7. **Save**:
   - New diagrams: `architecture-{description}-{timestamp}.mmd`
   - Edited diagrams: Update existing file

## Optional Config

If `.claude/mermaid.json` exists, apply defaults:

- `theme`
- `auto_validate`
- `output_directory`

## Output

```mermaid
{complete diagram with subgraphs and theme-safe styling}
```

**Saved to:** {filename}
**Validation:** ✅ passed
**Pattern:** {architecture_pattern} | **Components:** {count} | **Layers/Services:** {count}

<example>
User: "Create an architecture diagram for a SaaS with API gateway and 3 services"
Assistant: "Produces a layered architecture diagram with subgraphs and service relationships."
</example>

## Reference

- Patterns: `PLUGIN_DIR/references/guides/diagrams/architecture-diagrams.md`
- Styling: `PLUGIN_DIR/references/guides/styling-guide.md`
- Common mistakes: `PLUGIN_DIR/references/guides/common-mistakes.md`
- Troubleshooting: `PLUGIN_DIR/references/guides/troubleshooting.md`
