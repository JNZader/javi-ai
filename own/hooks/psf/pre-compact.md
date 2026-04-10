---
name: pre-compact
description: Antes de compactar contexto, persiste estado critico en engram para evitar perdida de informacion. Trigger: PreCompact
event: Stop
action: execute
metadata:
  author: javi-ai
  version: "1.0"
---

# Pre-Compact Hook

> Persiste estado critico antes de que el contexto sea compactado.

## Proposito

Cuando el AI CLI detecta que el contexto esta por ser compactado (por limite de tokens), este hook guarda las decisiones pendientes, el estado de tareas en curso y cualquier hallazgo no persistido para que sobrevivan la compactacion.

## Evento

- **Trigger:** Stop (ejecutado antes de compactacion o cierre de sesion)
- **Herramientas:** engram (mem_save)
- **Condicion:** Se ejecuta cuando la sesion esta por terminar o compactar

## Logica

```
SI hay estado SDD activo
ENTONCES
  1. Guardar progreso de apply en curso (tareas completadas)
  2. Guardar decisiones tomadas en esta sesion
  3. Guardar archivos modificados y su proposito
SINO
  1. Guardar resumen de lo trabajado en la sesion
  2. Guardar archivos tocados
```

## Implementacion Claude Code

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo '=== PRE-COMPACT SAVE ===' && echo 'Branch:' && git branch --show-current 2>/dev/null && echo 'Modified files:' && git diff --name-only 2>/dev/null | head -20 && echo '=== END PRE-COMPACT ===' || true"
          }
        ]
      }
    ]
  }
}
```

## Datos Persistidos

- Estado actual del pipeline SDD (que fase, que tareas completadas)
- Decisiones arquitectonicas tomadas en la sesion
- Lista de archivos modificados con descripcion breve
- Bugs encontrados o workarounds aplicados
- Proximos pasos planificados

## Notas

Este hook trabaja en conjunto con `session-start.md` que restaura el estado al inicio de la siguiente sesion. La combinacion de ambos crea un ciclo de persistencia que sobrevive las compactaciones.
