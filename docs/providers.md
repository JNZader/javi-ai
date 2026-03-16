# Providers

`javi-ai` supports 6 AI coding assistant CLIs. Each provider gets its own config path and asset format.

## Claude Code

| Property | Value |
|----------|-------|
| CLI flag | `--cli claude` |
| Config path | `~/.claude/` |
| Skills path | `~/.claude/skills/` |
| Config files | `CLAUDE.md`, `settings.json`, MCP template |
| Orchestrators | 6 domain orchestrators |
| Hooks | `comment-check.sh`, `todo-tracker.sh` |

Claude Code gets the most complete setup: skills, configs, orchestrators, hooks, and plugins.

## OpenCode

| Property | Value |
|----------|-------|
| CLI flag | `--cli opencode` |
| Config path | `~/.config/opencode/` |
| Skills path | `~/.config/opencode/skill/` |
| Config files | `opencode.json`, theme |
| Orchestrators | 13 standalone agents, 6 domain agents, 8 SDD commands |

OpenCode uses its own agent format. Orchestrators are installed as standalone agents and domain agents.

## Gemini CLI

| Property | Value |
|----------|-------|
| CLI flag | `--cli gemini` |
| Config path | `~/.gemini/` |
| Skills path | `~/.gemini/skills/` |
| Config files | `gemini-settings.json` |
| Orchestrators | Unified instructions |

## Qwen

| Property | Value |
|----------|-------|
| CLI flag | `--cli qwen` |
| Config path | `~/.qwen/` |
| Skills path | `~/.qwen/skills/` |
| Config files | `QWEN.md`, `settings.json` |
| Orchestrators | Unified instructions |

## Codex CLI

| Property | Value |
|----------|-------|
| CLI flag | `--cli codex` |
| Config path | `~/.codex/` |
| Skills path | `~/.codex/skills/` |
| Config files | `codex-config.toml` |
| Orchestrators | Unified instructions |

## GitHub Copilot

| Property | Value |
|----------|-------|
| CLI flag | `--cli copilot` |
| Config path | `~/.copilot/` |
| Skills path | `~/.copilot/skills/` |
| Config files | `copilot-instructions.md`, SDD orchestrator |
| Orchestrators | Unified instructions |

## Sync Target Mapping

When using `javi-ai sync` in a project, each CLI maps to a specific output file:

| CLI | Sync target | Output file |
|-----|-------------|-------------|
| Claude | `claude` | `CLAUDE.md` |
| OpenCode | `opencode` | `AGENTS.md` |
| Gemini | `gemini` | `GEMINI.md` |
| Codex | `codex` | `CODEX.md` |
| Copilot | `copilot` | `.github/copilot-instructions.md` |

> **Note**: Qwen does not have a sync target mapping — it uses the same skills installed to `~/.qwen/skills/`.
