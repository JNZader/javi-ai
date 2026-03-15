---
description: Generate deployment diagrams for infrastructure and cloud architecture
argument-hint: [description]
allowed-tools: Read, Bash, Write, Edit
---

# /mermaid-deployment

User request: "$ARGUMENTS"

## Task

Generate a Mermaid deployment diagram for infrastructure, cloud resources, and network topology, or improve an existing diagram.

## Process

1. **Resolve Plugin Path**:

   ```bash
   PLUGIN_DIR="$HOME/.claude/plugins/mermaid"
   ```
2. **Load Reference**: Read `PLUGIN_DIR/references/guides/diagrams/deployment-diagrams.md` for patterns and syntax
3. **Identify Infrastructure**: Compute (containers, VMs, serverless), data (RDS, NoSQL, caches, storage), network (load balancers, API gateways, CDN), supporting (queues, monitoring, orchestration)
4. **Organize into Tiers**: Public (load balancers, CDN), application (app servers, containers), data (databases, caches), supporting services
5. **Generate Diagram**:
   - Use `graph TB` with nested subgraphs for cloud/region/subnet structure
   - Keep output theme-first: avoid hardcoded `classDef fill/stroke/color` unless user explicitly requests custom colors
   - Apply Unicode symbols: ☁️ cloud, 🌐 load balancer, ⚙️ app server, 💾 database, ⚡ cache, 📦 storage, 📨 queue, 🛡️ security, 🌍 internet
   - Include technical details: instance types, AZs, ports, regions, replica counts
   - Show network flows with directional arrows
   - Use subgraph styles for public vs private subnets
6. **Validate**:
   - If output is Markdown with ` ```mermaid ` blocks, use:
     `node "$PLUGIN_DIR/scripts/extract_mermaid.js" {file} --validate`
   - Manual check: nested subgraph `end` keywords, arrow syntax, special chars quoted
   - Fix errors using `PLUGIN_DIR/references/guides/troubleshooting.md`
7. **Save**:
   - New diagrams: `deployment-{description}-{timestamp}.mmd`
   - Edited diagrams: Update existing file

## Optional Config

If `.claude/mermaid.json` exists, apply defaults:

- `theme`
- `auto_validate`
- `output_directory`

## Output

```mermaid
{complete diagram with subgraphs and technical details}
```

**Saved to:** {filename}
**Validation:** ✅ passed
**Compute:** {resources} | **Data:** {resources} | **Network:** {resources}

<example>
User: "Show deployment for AWS ECS + RDS + Redis"
Assistant: "Creates a deployment diagram with subnets, services, and resource specs."
</example>

## Reference

- Patterns: `PLUGIN_DIR/references/guides/diagrams/deployment-diagrams.md`
- Styling: `PLUGIN_DIR/references/guides/styling-guide.md`
- Common mistakes: `PLUGIN_DIR/references/guides/common-mistakes.md`
- Troubleshooting: `PLUGIN_DIR/references/guides/troubleshooting.md`
