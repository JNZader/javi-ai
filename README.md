# javi-ai

Personal AI configuration repository with a layered architecture for managing skills, agents, orchestrators, hooks, plugins, and tool configs across Claude, OpenCode, Qwen, Gemini, Codex, and Copilot.

## Layered Structure

```
javi-ai/
├── upstream/     # Unmodified assets from external sources (agent-teams-lite, PSF)
├── delta/        # Javi-modified versions of upstream assets (v2.1+)
├── own/          # Javi-created from scratch (skills, plugins, hooks)
└── configs/      # Per-tool configuration files (Claude, OpenCode, Qwen, Gemini, Codex, Copilot)
```

### `upstream/`

Assets copied verbatim from public sources. Do not edit here — apply changes in `delta/` instead.

- `upstream/skills/` — 32+ skills from [agent-teams-lite](https://github.com/some-org/agent-teams-lite) and `_shared/`
- `upstream/agents/` — 90+ specialist agents from [project-starter-framework](https://github.com/JNZader-Vault/project-starter-framework)

### `delta/`

Modified or extended versions of upstream assets. Each item should include a `DELTA.md` explaining what changed from upstream.

- `delta/skills/` — Modified SDD skills (sdd-explore v2.1, sdd-apply v2.1)
- `delta/orchestrators/claude/` — 6 Claude domain orchestrators
- `delta/orchestrators/opencode/agents/` — 13 standalone OpenCode agents
- `delta/orchestrators/opencode/domain-agents/` — 6 OpenCode domain agents
- `delta/orchestrators/opencode/commands/` — 8 SDD slash commands
- `delta/unified-instructions/` — Orchestrator instructions for non-subagent CLIs

### `own/`

Assets created by Javi, not derived from any upstream source.

- `own/skills/` — skill-creator + 3 Obsidian skills
- `own/plugins/` — merge-checks, mermaid, trim-md
- `own/hooks/claude/` — comment-check.sh, todo-tracker.sh
- `own/hooks/psf/` — 11 PSF hook specs

### `configs/`

Tool-specific configuration files, ready to symlink into `~/.config/` or tool home dirs.

- `configs/claude/` — CLAUDE.md, settings.json, MCP template, theme, hooks
- `configs/opencode/` — opencode.json, gentleman theme
- `configs/qwen/` — QWEN.md, settings.json
- `configs/gemini/` — gemini-settings.json
- `configs/codex/` — codex-config.toml
- `configs/copilot/` — Copilot instructions + SDD orchestrator

## Install

See individual tool configs for symlink instructions. A unified install script is planned.

## Sources

| Layer | Source |
|-------|--------|
| upstream/skills | agent-teams-lite + _shared |
| upstream/agents | project-starter-framework |
| delta/* | Javi.Dots (GentlemanClaude, GentlemanOpenCode) |
| own/* | Javi.Dots (original creations) |
| configs/* | Javi.Dots (GentlemanClaude, GentlemanOpenCode, GentlemanQwen) |
