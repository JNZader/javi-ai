# Unified Orchestrator Instructions

Instrucciones unificadas con orquestación integrada para GitHub Copilot, Gemini CLI y OpenAI Codex.

## Propósito

Las herramientas que usan un único archivo de instrucciones (Copilot, Gemini, Codex) necesitan un enfoque diferente a OpenCode (que usa múltiples agentes seleccionables).

Estas instrucciones unificadas incluyen:
- **Detección automática** de dominio basada en keywords
- **Patrones** de Frontend, Backend, DevOps, Quality, Data/AI, Architecture, Business y Specialized
- **Reglas de decisión** para elegir el enfoque correcto
- **Estándares de calidad** y seguridad

## Estructura

```
unified-instructions/
└── orchestrator.md          # Archivo maestro unificado
```

El archivo `orchestrator.md` contiene:

1. **Context Detection Matrix** - Detecta el dominio automáticamente
2. **Section 1: Task Analysis Protocol** - Protocolo de análisis
3. **Section 2-9: Domain Patterns** - Patrones específicos por dominio:
   - Frontend (React, Vue, Angular, TypeScript)
   - Backend (Python, Go, Java, Node)
   - DevOps (Docker, K8s, CI/CD)
   - Quality (Testing, Security)
   - Data/AI (ML, Analytics)
   - Architecture (API Design, Microservices)
   - Business (User Stories, Documentation)
   - Specialized (Blockchain, Games)
4. **Decision Rules** - Reglas para múltiples dominios
5. **Security Rules** - Reglas de seguridad
6. **Output Quality Standards** - Estándares de calidad

## Instalación

### Opción 1: Menú interactivo
```bash
./skills/setup.sh
# Seleccionar opción 11, 12, 13 o 14
```

### Opción 2: CLI directo
```bash
# Solo Copilot
./skills/setup.sh --install-copilot-orchestrator

# Solo Gemini
./skills/setup.sh --install-gemini-orchestrator

# Solo Codex
./skills/setup.sh --install-codex-orchestrator

# Todos
./skills/setup.sh --install-all-orchestrators
```

## Archivos generados

Después de la instalación:

```
Javi.Dots/
├── .github/
│   └── copilot-instructions.md    # Copilot usa este archivo
├── GEMINI.md                       # Gemini usa este archivo
└── CODEX.md                        # Codex usa este archivo
```

## Cómo funciona

### Ejemplo de uso

**Usuario**: "Necesito crear una API en Python con FastAPI"

**AI detecta**: Keywords "API", "Python", "FastAPI" → Dominio: **Backend**

**AI aplica**:
- Section 3: Backend Patterns
- Python FastAPI subsection
- Database schema patterns
- Security rules

**AI genera**:
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class UserCreate(BaseModel):
    email: str
    name: str

@app.post("/users")
def create_user(user: UserCreate):
    # Implementation with validation
    ...
```

### Ventajas

1. **Single Source of Truth**: Un archivo con todo
2. **Context-aware**: Detecta automáticamente el dominio
3. **Consistente**: Mismos patrones en todas las herramientas
4. **Mantenible**: Actualizas un solo archivo

## Comparación con OpenCode

| Característica | OpenCode | Copilot/Gemini/Codex |
|----------------|----------|---------------------|
| **Mecanismo** | 12 agentes seleccionables | 1 archivo unificado |
| **Interacción** | Tab → seleccionar agente | AI detecta automáticamente |
| **Especialistas** | 90+ en subcarpetas | Integrados en secciones |
| **Ventaja** | Control explícito | Zero-config |

## Actualización

Para actualizar después de un `git pull`:

```bash
# Actualizar todos los orquestadores
./skills/setup.sh --install-all-orchestrators

# O solo el que necesites
./skills/setup.sh --install-copilot-orchestrator
```

## Personalización

Para añadir tus propios patrones:

1. Edita `unified-instructions/orchestrator.md`
2. Agrega tu sección o modifica existente
3. Corre `./skills/setup.sh --install-all-orchestrators`

## Backups

Cada instalación crea un backup del archivo anterior:
- `.github/copilot-instructions.md.backup-YYYYMMDD-HHMMSS`
- `GEMINI.md.backup-YYYYMMDD-HHMMSS`
- `CODEX.md.backup-YYYYMMDD-HHMMSS`
