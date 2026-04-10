---
name: session-start
description: Al iniciar sesion, carga contexto critico desde engram y estado del proyecto. Trigger: SessionStart
event: SessionStart
action: execute
metadata:
  author: javi-ai
  version: "1.0"
---

# Session Start Hook

> Carga contexto persistente y estado del proyecto al iniciar cada sesion AI.

## Proposito

Restaurar el contexto de trabajo al inicio de cada sesion para evitar perder decisiones, convenciones y estado de cambios en curso entre sesiones.

## Evento

- **Trigger:** SessionStart
- **Herramientas:** Ninguna (read-only)
- **Condicion:** Se ejecuta automaticamente al inicio de cada sesion

## Logica

```
SI existe engram disponible
ENTONCES
  1. Cargar ultimas decisiones del proyecto (mem_context)
  2. Cargar estado SDD activo si existe
  3. Cargar skill-registry del proyecto
SINO
  1. Cargar estado git (branch, ultimos commits)
  2. Leer CLAUDE.md/AGENTS.md si existe
```

## Implementacion Claude Code

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo '=== SESSION START ===' && git branch --show-current 2>/dev/null && git log --oneline -3 2>/dev/null && echo '--- Pending Changes ---' && git status --short 2>/dev/null | head -10 && echo '=== END SESSION START ===' || true"
          }
        ]
      }
    ]
  }
}
```

## Datos Cargados

### Desde Engram (si disponible)
- Decisiones arquitectonicas recientes
- Estado del pipeline SDD en curso
- Skill registry del proyecto
- Bugs conocidos y workarounds

### Desde Git (fallback)
- Branch actual y ultimos commits
- Cambios sin commitear
- TODOs y FIXMEs pendientes

## Notas

Este hook es read-only y no modifica archivos. El objetivo es reducir la friccion de retomar el trabajo donde se dejo.
