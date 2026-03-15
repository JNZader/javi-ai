# javi-ai

> **AI coding assistant layer for the Javi ecosystem.** Manages provider profiles, shared packages, and project-facing AI contracts for Claude Code, OpenCode, Gemini, Qwen, Codex, and Copilot.

---

## What is javi-ai?

`javi-ai` is the AI configuration hub of the Javi ecosystem. It defines a **contract-based installation model** — every AI provider, shared package, and project-facing package has a stable published ID that consumers (like `javi-dots` and `javi-forge`) reference without knowing the internal layout.

Key design goals:

- **Provider parity** — all six AI CLIs are treated as first-class citizens
- **Shared-first** — instruction assets, skills, hooks, and commands live in shared packages consumed by all providers
- **Project-safe contracts** — project packages expose only provider-neutral assets to generated repos
- **Symlink delivery** — all user-home assets are installed as symlinks, so `git pull` propagates changes instantly

---

## Ecosystem Role

```mermaid
graph TB
    subgraph DOTS["javi-dots · Orchestrator"]
        JS["scripts/javi.sh"]
    end

    subgraph AI["javi-ai · AI Layer"]
        SHARED["Shared Packages\ninstructions · agents · skills\nhooks · commands · mcp · memory"]
        PROV["6 Provider Profiles\nClaude · OpenCode · Gemini\nQwen · Codex · Copilot"]
        PROJ["4 Project Packages\nai.instructions · sdd.base\nmemory.engram · ai.review"]
    end

    subgraph FORGE["javi-forge · Scaffolding"]
        TMPL["7 Templates"]
        GEN["3 Generators"]
    end

    subgraph USER["Developer Machine"]
        CLAUDE["~/.claude/"]
        OC["~/.config/opencode/"]
        GEM["~/.gemini/"]
        OTHER["~/.codex/ · ~/.config/qwen/\n.github/copilot/"]
    end

    JS -->|"install-profiles.sh contracts"| PROV
    SHARED --> PROV
    SHARED --> PROJ
    PROJ -->|consumed by| TMPL & GEN
    PROV --> CLAUDE & OC & GEM & OTHER
```

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

## Quick Links

- [Getting Started](/getting-started) — install via javi-dots or directly
- [Providers](/providers) — all 6 providers documented
- [Shared Packages](/shared-packages) — shared cross-provider assets
- [Project Packages](/project-packages) — project-facing AI contracts
- [Install Surface](/install-surface) — `install-profiles.sh` reference
