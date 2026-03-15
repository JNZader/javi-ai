# javi-ai

> **AI coding assistant layer for the Javi ecosystem.** Manages provider profiles, shared packages, and project-facing AI contracts for Claude Code, OpenCode, Gemini, Qwen, Codex, and Copilot.

---

## Architecture

```mermaid
graph TD
    subgraph SHARED["Shared Packages (cross-provider)"]
        direction LR
        SI["shared.instructions\nAGENTS.md, orchestrator.md"]
        SA["shared.agents\n9 domain orchestrators"]
        SK["shared.skills\n16+ tech skills"]
        SH["shared.hooks\ncomment-check · todo-tracker"]
        SC["shared.commands\n8 SDD slash-commands"]
        SM["shared.mcp\nMCP server templates"]
        SME["shared.memory\nEngram integration"]
    end

    subgraph PROVIDERS["Provider Profiles"]
        PC["provider.claude.core\n→ target.claude.user"]
        PO["provider.opencode.core\n→ target.opencode.user"]
        PG["provider.gemini.core\n→ target.gemini.user"]
        PQ["provider.qwen.core\n→ target.qwen.user"]
        PX["provider.codex.core\n→ target.codex.user"]
        PP["provider.copilot.core\n→ target.copilot.repo"]
    end

    subgraph PROJECT["Project-facing Packages"]
        PAI["project.ai.instructions\nProvider-neutral AI setup"]
        PS["project.sdd.base\nSDD workflow for repos"]
        PME["project.memory.engram\nPersistent memory config"]
        PR["project.ai.review\nAI-assisted code review"]
    end

    SI --> PC & PO & PG & PQ & PX & PP
    SA --> PC & PO
    SK --> PC & PO
    SH --> PC
    SC --> PO
    SME --> PME

    SI --> PAI
    SI & SA --> PS
    SI & SME --> PME
    SH & SA & SI --> PR

    PAI & PS & PME & PR -->|consumed by| FORGE["javi-forge\ntemplates & generators"]
```

---

## Provider Parity Matrix

```mermaid
graph LR
    subgraph INSTALL["install-profiles.sh"]
        CLI["--provider\n--target\n--package\n--home"]
    end

    INSTALL --> C["Claude Code\n~/.claude/\nsettings.json\nstatusline.sh\ntweakcc-theme.json"]
    INSTALL --> O["OpenCode\n~/.config/opencode/\nopencode.json\ncommands/"]
    INSTALL --> G["Gemini CLI\n~/.gemini/\nGEMINI.md"]
    INSTALL --> Q["Qwen Code\n~/.config/qwen/\nQWEN.md"]
    INSTALL --> X["Codex CLI\n~/.codex/\nAGENTS.md"]
    INSTALL --> P["GitHub Copilot\n.github/copilot/\ninstructions.md"]
```

---

## Supported AI CLIs

| Provider | Package ID | Install Target | Runtime Config |
|----------|-----------|----------------|----------------|
| **Claude Code** | `provider.claude.core` | `target.claude.user` | `~/.claude/settings.json` |
| **OpenCode** | `provider.opencode.core` | `target.opencode.user` | `~/.config/opencode/opencode.json` |
| **Gemini CLI** | `provider.gemini.core` | `target.gemini.user` | `~/.gemini/GEMINI.md` |
| **Qwen Code** | `provider.qwen.core` | `target.qwen.user` | `~/.config/qwen/QWEN.md` |
| **Codex CLI** | `provider.codex.core` | `target.codex.user` | `~/.codex/AGENTS.md` |
| **GitHub Copilot** | `provider.copilot.core` | `target.copilot.repo` | `.github/copilot/instructions.md` |

---

## Shared Packages

| Package | Contents | Install path (Claude) |
|---------|----------|-----------------------|
| `shared.instructions` | AGENTS.md, orchestrator.md | `~/.claude/CLAUDE.md` |
| `shared.agents` | Domain orchestrators (9) | `~/.claude/agents/` |
| `shared.skills` | SDD skills + tech skills (16+) | `~/.claude/skills/` |
| `shared.hooks` | comment-check.sh, todo-tracker.sh | `~/.claude/hooks/` |
| `shared.commands` | SDD slash-commands (8) | `~/.config/opencode/commands/` |
| `shared.mcp` | MCP server templates (Claude + OpenCode) | `~/.claude/mcp-servers.template.json` |
| `shared.memory` | Engram integration guide | `~/.claude/engram-config.md` |

---

## Project-facing Packages

For generated repositories that want AI capabilities without coupling to a specific provider:

| Package ID | Composes from | Purpose |
|-----------|---------------|---------|
| `project.ai.instructions` | `shared.instructions` | Provider-neutral AI instructions |
| `project.sdd.base` | `shared.instructions` + `shared.agents` | SDD workflow for project repos |
| `project.memory.engram` | `shared.memory` + `shared.instructions` | Engram persistent memory |
| `project.ai.review` | `shared.hooks` + `shared.agents` + `shared.instructions` | AI-assisted code review |

---

## Quick Usage

### Via javi-dots (recommended)

```bash
# Install Claude Code profile
scripts/javi.sh --preset ai-core --ai-choice ai.claude.user --home "$HOME"

# Install full AI setup (shared packages + provider)
scripts/javi.sh --preset ai-full --ai-choice ai.claude.user --home "$HOME"

# Install all 6 providers
scripts/javi.sh --profile ai-heavy --home "$HOME"
```

### Direct install

```bash
# Dry-run: see what would be installed
scripts/install-profiles.sh \
  --provider claude \
  --target target.claude.user \
  --home "$HOME" \
  --dry-run

# Install Claude Code profile
scripts/install-profiles.sh \
  --provider claude \
  --target target.claude.user \
  --home "$HOME"

# Install Claude profile + shared skills and hooks
scripts/install-profiles.sh \
  --provider claude \
  --package shared.skills \
  --package shared.hooks \
  --home "$HOME"

# List all published contract IDs
scripts/install-profiles.sh --list-contracts
```

---

## Published Contracts

All public surfaces are defined in `manifests/`:

| Manifest | Purpose |
|----------|---------|
| `manifests/providers.yaml` | Six published provider IDs |
| `manifests/packages.yaml` | Shared + provider package catalog |
| `manifests/targets.yaml` | Six install target IDs |
| `manifests/project-packages.yaml` | Four project-facing package IDs |

Contract documentation:

- [`docs/providers/PROVIDER-CONTRACT.md`](docs/providers/PROVIDER-CONTRACT.md) — provider and package contract guide
- [`docs/providers/INSTALL-CONTRACT.md`](docs/providers/INSTALL-CONTRACT.md) — install entrypoint surface
- [`docs/providers/SIX-CLI-PARITY-CHECKLIST.md`](docs/providers/SIX-CLI-PARITY-CHECKLIST.md) — parity matrix for all six CLIs
- [`docs/project-packages/PROJECT-PACKAGE-CONTRACT.md`](docs/project-packages/PROJECT-PACKAGE-CONTRACT.md) — project package contract guide

---

## Ecosystem

| Repo | Role |
|------|------|
| [javi-dots](https://github.com/JNZader/javi-dots) | Workstation setup, consumes javi-ai via contracts |
| **javi-ai** | AI provider profiles, shared packages |
| [javi-forge](https://github.com/JNZader/javi-forge) | Project templates, consumes project packages |
| [javi-platform](https://github.com/JNZader/javi-platform) | Governance, ADRs, SDD artifacts |
