---
name: session-stop
description: Al finalizar sesion, persiste resumen de trabajo y decisiones. Trigger: Stop
event: Stop
action: execute
metadata:
  author: javi-ai
  version: "1.0"
---

# Session Stop Hook

> Persiste un resumen de la sesion al finalizar para facilitar la continuidad.

## Proposito

Al cerrar una sesion AI, guardar automaticamente un resumen de lo trabajado, las decisiones tomadas y los proximos pasos para que la siguiente sesion pueda retomar sin friccion.

## Evento

- **Trigger:** Stop
- **Herramientas:** engram (mem_session_summary, mem_save)
- **Condicion:** Se ejecuta al finalizar cada sesion

## Logica

```
SI engram esta disponible
ENTONCES
  1. Generar resumen de sesion (mem_session_summary)
  2. Guardar proximos pasos como observacion
  3. Guardar archivos modificados con contexto
SINO
  1. Imprimir resumen en consola
  2. El usuario puede copiar manualmente
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
            "command": "echo '=== SESSION SUMMARY ===' && echo 'Commits this session:' && git log --oneline --since='4 hours ago' 2>/dev/null | head -10 && echo '--- Files changed ---' && git diff --stat HEAD~3..HEAD 2>/dev/null | tail -5 && echo '=== END SESSION ===' || true"
          }
        ]
      }
    ]
  }
}
```

## Datos Persistidos

### Resumen de Sesion
- Que se trabajo (features, bugs, refactors)
- Commits realizados
- Archivos creados o modificados

### Decisiones
- Decisiones arquitectonicas tomadas
- Tradeoffs evaluados
- Alternativas descartadas y por que

### Proximos Pasos
- Tareas pendientes identificadas
- Bloqueantes encontrados
- Sugerencias para la proxima sesion

## Notas

Funciona en conjunto con `session-start.md` para crear un ciclo de persistencia automatico. Este hook es el complemento de cierre que asegura que nada se pierda entre sesiones.
