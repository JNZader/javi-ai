# Commands

## install

Install the AI development layer for selected CLIs. This is the default command.

```bash
npx javi-ai install [options]
```

### What it does

For each selected CLI:

1. **Skills** — Copies upstream skills (appending EXTENSION.md where present), own skills
2. **Configs** — Merges configuration files (JSON deep merge, Markdown marker merge)
3. **Hooks** — Installs shell hooks (Claude only, create-if-absent)
4. **Orchestrators** — Copies domain orchestrators to the CLI's agents directory

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--cli` | string | — | Comma-separated list of CLIs |
| `--dry-run` | boolean | `false` | Preview without writing files |
| `--yes` / `-y` | boolean | `false` | Non-interactive mode |

### Examples

```bash
npx javi-ai install --cli claude,opencode
npx javi-ai install --dry-run
npx javi-ai install --cli claude --yes
```

---

## sync

Compile a project's `.ai-config/` directory into per-CLI config files.

```bash
npx javi-ai sync [options]
```

### What it does

1. Walks up from `--project-dir` looking for `.ai-config/`
2. Reads agents and skills from `.ai-config/agents/` and `.ai-config/skills/`
3. Applies `.skillignore` exclusions
4. Generates config files for each target CLI
5. Syncs Claude commands from `.ai-config/commands/`

### Output files

| CLI | Generated file |
|-----|---------------|
| Claude | `CLAUDE.md` |
| OpenCode | `AGENTS.md` |
| Gemini | `GEMINI.md` |
| Codex | `CODEX.md` |
| Copilot | `.github/copilot-instructions.md` |

### Sync modes

| Mode | Behavior |
|------|----------|
| `overwrite` | Replace entire file with generated content (default) |
| `merge` | Insert generated content between `<!-- BEGIN JAVI-AI -->` / `<!-- END JAVI-AI -->` markers |

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--target` | string | `all` | Target CLI: `claude`, `opencode`, `gemini`, `codex`, `copilot`, `all` |
| `--mode` | string | `overwrite` | Sync mode: `overwrite` or `merge` |
| `--project-dir` | string | `.` | Project directory to sync |
| `--dry-run` | boolean | `false` | Preview without writing |

### Examples

```bash
npx javi-ai sync
npx javi-ai sync --target claude --mode merge
npx javi-ai sync --project-dir /path/to/project --dry-run
```

---

## doctor

Show a health report of the current installation.

```bash
npx javi-ai doctor
```

### What it checks

- Manifest at `~/.javi-ai/manifest.json`
- Installed CLIs and their config paths
- Skill counts per CLI

---

## update

Re-install configured CLIs with fresh assets.

```bash
npx javi-ai update [--dry-run]
```

Reads the existing manifest and re-runs the full install flow. Use this to pick up new skills or config updates.

---

## uninstall

Remove all javi-ai managed files.

```bash
npx javi-ai uninstall
```

Removes installed skills, configs, hooks, and orchestrators for all configured CLIs, plus the manifest itself.
