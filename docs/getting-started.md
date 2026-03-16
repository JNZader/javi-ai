# Getting Started

## Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org)

That's all. `javi-ai` has no other external dependencies.

## Step 1: Install

Run with `npx` — no global install required:

```bash
npx javi-ai install --cli claude
```

Or install for multiple CLIs at once:

```bash
npx javi-ai install --cli claude,opencode,gemini
```

### Interactive Mode

Without `--cli`, `javi-ai` launches a TUI for selecting CLIs:

```bash
npx javi-ai install
```

### Non-Interactive Mode

For CI or scripts, use `--yes` to auto-confirm:

```bash
npx javi-ai install --cli claude --yes
```

## Step 2: Verify

Check that everything installed correctly:

```bash
npx javi-ai doctor
```

This checks the manifest, CLI config paths, and installed assets.

## Step 3: Use in Projects

For project-level AI config, use the sync command:

```bash
# In your project directory (must have .ai-config/)
npx javi-ai sync
```

This reads `.ai-config/agents/` and `.ai-config/skills/`, then generates per-CLI config files (`CLAUDE.md`, `AGENTS.md`, etc.).

## What Gets Installed

For each selected CLI, `javi-ai` installs:

1. **Skills** — 37+ upstream skills (with EXTENSION.md overlays if present) + 4 custom skills
2. **Configs** — Per-CLI configuration files (JSON deep-merged, Markdown marker-merged)
3. **Orchestrators** — Domain orchestrators for Claude and OpenCode
4. **Hooks** — Pre/post tool-use hooks (Claude only)

All installations are tracked in `~/.javi-ai/manifest.json`.

## Updating

Re-install with fresh assets:

```bash
npx javi-ai update
```

This reads the existing manifest and re-runs the install for all previously configured CLIs.

## Uninstalling

Remove all javi-ai managed files:

```bash
npx javi-ai uninstall
```
