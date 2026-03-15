---
description: Generate sequence diagrams for API interactions and message flows
argument-hint: [description]
allowed-tools: Read, Bash, Write, Edit
---

# /mermaid-sequence

User request: "$ARGUMENTS"

## Task

Generate a Mermaid sequence diagram for API calls, service interactions, and message flows, or improve an existing diagram.

## Process

1. **Resolve Plugin Path**:

   ```bash
   PLUGIN_DIR="$HOME/.claude/plugins/mermaid"
   ```
2. **Load Reference**: Read `PLUGIN_DIR/references/guides/diagrams/sequence-diagrams.md` for patterns and syntax
3. **Identify Participants**: Extract users/clients, frontend, API layer, backend services, data layer, external services
4. **Map Message Flow**: Who initiates? What messages? Sync or async? Loops/alternatives? How terminates?
5. **Generate Diagram**:
   - Use `autonumber` for message tracking
   - Keep output theme-first: avoid hardcoded `classDef fill/stroke/color` unless user explicitly requests custom colors
   - Apply activation boxes: `->>+` activate, `-->>-` deactivate
   - Use Unicode symbols: 👤 client, 🌐 gateway, 🔐 auth, ⚙️ service, 💾 database, ⚡ cache, 📨 queue
   - Add features: `par`/`and` for parallel, `alt`/`else` for conditionals, `loop` for retries
   - Include HTTP methods/paths (POST /login) and status codes (200 OK)
6. **Validate**:
   - If output is Markdown with ` ```mermaid ` blocks, use:
     `node "$PLUGIN_DIR/scripts/extract_mermaid.js" {file} --validate`
   - Manual check: colons after messages, participant names, arrow syntax
   - Fix errors using `PLUGIN_DIR/references/guides/troubleshooting.md`
7. **Save**:
   - New diagrams: `sequence-{description}-{timestamp}.mmd`
   - Edited diagrams: Update existing file

## Optional Config

If `.claude/mermaid.json` exists, apply defaults:

- `theme`
- `auto_validate`
- `output_directory`

## Output

```mermaid
{complete diagram with autonumber and theme-safe styling}
```

**Saved to:** {filename}
**Validation:** ✅ passed
**Participants:** {list} | **Messages:** {count}

<example>
User: "Sequence diagram for login with 2FA"
Assistant: "Generates sequenceDiagram with auth, DB, and 2FA steps."
</example>

## Reference

- Patterns: `PLUGIN_DIR/references/guides/diagrams/sequence-diagrams.md`
- Styling: `PLUGIN_DIR/references/guides/styling-guide.md`
- Common mistakes: `PLUGIN_DIR/references/guides/common-mistakes.md`
- Troubleshooting: `PLUGIN_DIR/references/guides/troubleshooting.md`
