# OpenCode Orchestrator Agents

Estructura de orquestadores para OpenCode - 12 agentes organizados en UI limpia.

## Agentes Visibles en UI (12)

| Agente | Descripción | Uso |
|--------|-------------|-----|
| `gentleman` | Javi.Dots expert | Dotfiles, TUI, Vim Trainer |
| `sdd-orchestrator` | SDD workflow | Spec-Driven Development |
| `master-orchestrator` | Master delegador | Detecta y delega a especializados |
| `architect-orchestrator` | Arquitectura | System design, APIs, DB |
| `frontend-orchestrator` | Frontend | React, Vue, Angular |
| `backend-orchestrator` | Backend | Python, Go, Java, Node |
| `devops-orchestrator` | DevOps | Docker, K8s, CI/CD |
| `data-ai-orchestrator` | Data/AI | ML, AI, Analytics |
| `quality-orchestrator` | Calidad | Testing, Security, Review |
| `business-orchestrator` | Negocio | PM, Analysis, Docs |
| `specialized-orchestrator` | Especializados | Blockchain, Games, Embedded |
| `planner-orchestrator` | Planning | Freelance, Workflows |

## Instalación

```bash
./skills/setup.sh --install-opencode-agents
```

O desde el menú interactivo:
```bash
./skills/setup.sh
# Seleccionar opción 10
```

## Estructura Resultante

```
~/.config/opencode/
├── agents/                    # 12 orquestadores VISIBLES
│   ├── gentleman.md
│   ├── sdd-orchestrator.md
│   ├── master-orchestrator.md
│   ├── architect-orchestrator.md
│   ├── frontend-orchestrator.md
│   ├── backend-orchestrator.md
│   ├── devops-orchestrator.md
│   ├── data-ai-orchestrator.md
│   ├── quality-orchestrator.md
│   ├── business-orchestrator.md
│   ├── specialized-orchestrator.md
│   └── planner-orchestrator.md
│
└── specialists/               # Especialistas OCULTOS
    ├── development/          # React, Vue, Python, Go, etc.
    ├── infrastructure/       # Docker, K8s, Cloud
    ├── quality/              # Testing, Security
    ├── data-ai/              # ML, AI
    ├── business/             # PM, Analyst
    ├── domains/              # Blockchain, Games
    ├── planner/              # Freelance, Workflows
    └── docs/                 # Documentación
```

## Cómo funciona

### Uso directo
Presionás **Tab** en OpenCode y seleccionás el orquestador apropiado:
- React → `frontend-orchestrator`
- API Python → `backend-orchestrator`
- Docker → `devops-orchestrator`

### Uso vía Master
El `master-orchestrator` detecta automáticamente qué orquestador necesitás:
```
Usuario: "Necesito una API en Python"
    ↓
master-orchestrator → backend-orchestrator
    ↓
Lee specialists/development/python-specialist.md
    ↓
Genera código con patrones expertos
```

### Especialistas
Los 90+ agentes especialistas están en `~/.config/opencode/specialists/` pero **no aparecen en la UI**. Los orquestadores los leen directamente para obtener patrones detallados.

## Actualización

Para actualizar los agentes después de un `git pull`:
```bash
./skills/setup.sh --install-opencode-agents
```

Esto sobreescribe los orquestadores con las últimas versiones del repo.
