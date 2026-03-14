# javi-ai

Capa especializada de IA para asistentes, agentes y tooling de desarrollo.

## Role

`javi-ai` concentra la plataforma de assets AI del ecosistema: upstreams preferidos, deltas propios, paquetes compartidos y perfiles por proveedor.

## Starter Layout

```text
javi-ai/
├── README.md
├── .gitignore
├── docs/
│   └── providers/
├── upstream/
│   ├── gentle-ai/
│   ├── agent-teams-lite/
│   └── engram/
├── delta/
│   ├── javi-dots/
│   ├── agentes-ia/
│   └── project-starter-framework/
├── packages/
│   ├── shared/
│   │   ├── agents/
│   │   ├── skills/
│   │   ├── hooks/
│   │   ├── commands/
│   │   ├── mcp/
│   │   ├── memory/
│   │   └── instructions/
│   └── providers/
│       ├── claude/
│       ├── opencode/
│       ├── gemini/
│       ├── qwen/
│       ├── codex/
│       └── copilot/
├── scripts/
└── manifests/
```

## Directory Intent

- `docs/`: arquitectura, matrices de integracion y notas por proveedor.
- `upstream/`: puntos de apoyo upstream-first para `gentle-ai`, `agent-teams-lite` y `engram`.
- `delta/`: customizaciones propias y fuentes legacy/delta trazables.
- `packages/shared/`: fuentes canonicas reutilizables entre CLIs.
- `packages/providers/`: perfiles first-class por runtime, con igual estatus arquitectonico.
- `scripts/`: sync, build e instalacion cuando se materialice la capa de packaging.
- `manifests/`: contratos declarativos para fuentes, composicion y targets.

## Boundaries

Este repo debe concentrarse en:

- configuracion de Claude Code, OpenCode, Gemini CLI, Codex CLI, Qwen, Copilot y herramientas similares
- agentes, skills, hooks, comandos, memoria, MCPs y orquestadores
- overlays y syncs controlados desde upstreams cuando convenga
- integraciones entre asistentes y tooling de IA

Este repo no deberia ser el hogar principal de:

- bootstrap general del sistema operativo
- dotfiles base y setup transversal de la maquina
- templates de productos y scaffolding general por stack

## Ecosystem Fit

- `../javi-dots`: instala el entorno base y debe consumir `javi-ai` por contratos, no por archivos internos.
- `../javi-forge`: puede reutilizar assets AI a nivel proyecto cuando existan contratos claros.
- `../vault/Javi.Dots`: referencia legacy para extraer delta util, no base principal.
- `../docs/migration/MIGRATION-MATRIX.md`: referencia de jerarquia upstream-first y destinos.

## Current State

Skeleton minimo de capas internas creado para preparar la migracion sin mover codigo legacy todavia.
