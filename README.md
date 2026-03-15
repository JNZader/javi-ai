# javi-ai

Personal AI configuration repository with a layered architecture for managing skills, agents, orchestrators, hooks, plugins, and tool configs across Claude, OpenCode, Qwen, Gemini, Codex, and Copilot.

## Layered Structure

```
javi-ai/
├── upstream/     # Unmodified assets from external sources (agent-teams-lite, PSF)
├── delta/        # Javi-modified orchestrators and unified instructions
├── own/          # Javi-created from scratch (skills, plugins, hooks)
└── configs/      # Per-tool configuration files (Claude, OpenCode, Qwen, Gemini, Codex, Copilot)
```

### `upstream/`

Assets copied verbatim from public sources. **Do not edit SKILL.md files here directly** — use EXTENSION.md instead (see below).

- `upstream/skills/` — 34+ skills from [agent-teams-lite](https://github.com/Gentleman-Programming/agent-teams-lite) and `_shared/`
- `upstream/agents/` — 90+ specialist agents from [project-starter-framework](https://github.com/JNZader-Vault/project-starter-framework)

#### EXTENSION.md model

Some skill folders under `upstream/skills/` contain an `EXTENSION.md` alongside the canonical `SKILL.md`. Extensions are **Javi's additions** that get appended to the upstream skill during installation — they are NOT part of the upstream source.

```
upstream/skills/sdd-explore/
├── SKILL.md       ← exact copy from agent-teams-lite (never edit)
└── EXTENSION.md   ← Javi's additions, appended at install time
```

Each extension block carries a STATUS comment for upstream sync tracking:

```markdown
<!-- STATUS: Not yet submitted to agent-teams-lite upstream -->
<!-- ACTION: If Gentleman incorporates X in upstream, remove this section -->
<!-- PR: pending -->
```

**When upstream adds equivalent functionality**: compare, delete the matching extension block, and update the STATUS comment.

### `delta/`

Modified or extended versions of upstream assets that cannot be expressed as EXTENSION.md additions (e.g., orchestrators, unified instructions).

- `delta/orchestrators/claude/` — 6 Claude domain orchestrators
- `delta/orchestrators/opencode/agents/` — 13 standalone OpenCode agents
- `delta/orchestrators/opencode/domain-agents/` — 6 OpenCode domain agents
- `delta/orchestrators/opencode/commands/` — 8 SDD slash commands
- `delta/unified-instructions/` — Orchestrator instructions for non-subagent CLIs

> **Note**: Skill modifications now live in `upstream/skills/<skill>/EXTENSION.md`. The old `delta/skills/` pattern is retired.

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

During installation, for each skill with an EXTENSION.md, concatenate:

```bash
cat upstream/skills/<skill>/SKILL.md upstream/skills/<skill>/EXTENSION.md > ~/.agents/skills/<skill>/SKILL.md
```

For skills without EXTENSION.md, copy SKILL.md directly.

## Syncing with upstream

When [agent-teams-lite](https://github.com/Gentleman-Programming/agent-teams-lite) releases updates:

1. **Check for skill updates**: compare `upstream/skills/<skill>/SKILL.md` against the upstream source.
2. **Update SKILL.md**: overwrite with the new upstream content (verbatim — no edits).
3. **Review EXTENSION.md**: check if any extension block is now redundant because upstream incorporated the feature.
4. **Remove redundant blocks**: delete the extension block and update the STATUS comment to `STATUS: Incorporated in upstream vX.Y`.
5. **Re-install**: re-run the concatenation step to rebuild the installed skills.

## Sources

| Layer | Source |
|-------|--------|
| upstream/skills | agent-teams-lite + _shared |
| upstream/skills/*/EXTENSION.md | Javi.Dots (extensions appended at install) |
| upstream/agents | project-starter-framework |
| delta/* | Javi.Dots (GentlemanClaude, GentlemanOpenCode) |
| own/* | Javi.Dots (original creations) |
| configs/* | Javi.Dots (GentlemanClaude, GentlemanOpenCode, GentlemanQwen) |
