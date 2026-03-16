# Architecture

## Layered Asset Model

`javi-ai` organizes AI assets in four layers with clear responsibilities:

```mermaid
flowchart TB
    subgraph "Layer 1: upstream/"
        US_SK["skills/<br/>37 skills from agent-teams-lite"]
        US_AG["agents/<br/>8 agent groups from PSF"]
    end

    subgraph "Layer 2: delta/"
        DL_OR["orchestrators/<br/>Claude + OpenCode domain agents"]
        DL_UI["unified-instructions/<br/>Instructions for other CLIs"]
    end

    subgraph "Layer 3: own/"
        OW_SK["skills/<br/>4 custom skills"]
        OW_PL["plugins/<br/>3 plugins"]
        OW_HK["hooks/<br/>2 Claude hooks"]
    end

    subgraph "Layer 4: configs/"
        CF["claude/ opencode/ gemini/<br/>qwen/ codex/ copilot/"]
    end

    US_SK --> DL_OR
    US_AG --> DL_OR
    DL_OR --> OW_SK
    DL_UI --> OW_SK
    OW_SK --> CF
    OW_PL --> CF
    OW_HK --> CF

    style US_SK fill:#334155,color:#e2e8f0
    style US_AG fill:#334155,color:#e2e8f0
    style DL_OR fill:#475569,color:#e2e8f0
    style DL_UI fill:#475569,color:#e2e8f0
    style OW_SK fill:#f97316,color:#fff
    style OW_PL fill:#f97316,color:#fff
    style OW_HK fill:#f97316,color:#fff
    style CF fill:#ea580c,color:#fff
```

## Install Flow

When you run `javi-ai install`, this is the sequence for each selected CLI:

```mermaid
sequenceDiagram
    participant User
    participant CLI as javi-ai
    participant FS as File System
    participant Backup as ~/.javi-ai/backups/

    User->>CLI: javi-ai install --cli claude

    rect rgb(249, 115, 22, 0.1)
        Note over CLI,FS: Skills Installation
        CLI->>FS: Read upstream/skills/*
        CLI->>FS: Append EXTENSION.md if present
        CLI->>FS: Read own/skills/*
        CLI->>FS: Write to ~/.claude/skills/
    end

    rect rgb(249, 115, 22, 0.1)
        Note over CLI,Backup: Config Installation
        CLI->>Backup: Backup existing configs
        CLI->>FS: Read configs/claude/*
        CLI->>FS: JSON deep merge .json files
        CLI->>FS: Marker merge .md files
        CLI->>FS: Create-if-absent other files
    end

    rect rgb(249, 115, 22, 0.1)
        Note over CLI,FS: Hooks (Claude only)
        CLI->>FS: Copy own/hooks/claude/* (if not exists)
        CLI->>FS: chmod +x
    end

    rect rgb(249, 115, 22, 0.1)
        Note over CLI,FS: Orchestrators
        CLI->>FS: Copy delta/orchestrators/claude/
        CLI->>FS: Write to ~/.claude/agents/
    end

    CLI->>FS: Update ~/.javi-ai/manifest.json
    CLI-->>User: Done
```

## Sync Flow

The `sync` command compiles project-level `.ai-config/` into per-CLI config files:

```mermaid
flowchart TB
    subgraph "Project"
        AC[".ai-config/"]
        AG["agents/"]
        SK["skills/"]
        CM["commands/"]
        SI[".skillignore"]
    end

    AC --> AG
    AC --> SK
    AC --> CM
    AC --> SI

    subgraph "Process"
        COLLECT["Collect markdown entries"]
        FILTER["Apply .skillignore"]
        BUILD["Build config content"]
        MERGE["Merge with markers"]
    end

    AG --> COLLECT
    SK --> COLLECT
    SI --> FILTER
    COLLECT --> FILTER
    FILTER --> BUILD

    subgraph "Output"
        CL["CLAUDE.md"]
        OC["AGENTS.md"]
        GM["GEMINI.md"]
        CX["CODEX.md"]
        CP[".github/copilot-instructions.md"]
    end

    BUILD --> MERGE
    MERGE --> CL
    MERGE --> OC
    MERGE --> GM
    MERGE --> CX
    MERGE --> CP

    CM -->|"Claude only"| CMD["project/.claude/commands/"]
```

## Merge Strategies

| File Type | Strategy | Details |
|-----------|----------|---------|
| `.json` | Deep merge | Nested objects merged recursively; arrays deduplicated by JSON equality |
| `.md` | Marker merge | Content wrapped in `<!-- BEGIN JAVI-AI -->` / `<!-- END JAVI-AI -->` markers |
| Other | Create-if-absent | Copied only if the target file doesn't exist |

## Tech Stack

| Component | Technology |
|-----------|------------|
| CLI framework | [meow](https://github.com/sindresorhus/meow) |
| TUI rendering | [Ink](https://github.com/vadimdemedes/ink) (React for CLI) |
| File operations | [fs-extra](https://github.com/jprichardson/node-fs-extra) |
| Language | TypeScript (strict) |
| Runtime | Node.js 18+ |
| Testing | Vitest + Stryker mutation testing |
