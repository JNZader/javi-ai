# Plan: skill-layer-reorganization

## Goal

Reorganizar los skills de javi-ai para respetar la arquitectura de 3 capas documentada en ADR-003 (upstream → delta → own). Actualmente los 36 skills en `upstream/` vienen de 3+ fuentes distintas mezcladas, con modificaciones aplicadas directamente sobre los originales en vez de usar el modelo EXTENSION.md de ADR-004. Esto impide sincronizar con los repos de Gentleman y dificulta contribuir cambios de vuelta.

**Estado actual (roto):**
```
upstream/skills/ → 36 skills mezclados de ATL + Gentleman-Skills + propios
own/skills/      → 15 skills propios (correcto)
delta/           → solo orchestrators, no tiene extensions de skills
```

**Estado objetivo:**
```
upstream/
├── agent-teams-lite/skills/   → 12 skills (sync directo, sin modificar)
├── gentleman-skills/curated/  → 15 skills (sync directo, sin modificar)
├── _shared/                   → de ATL (sin modificar)

delta/
├── extensions/                → EXTENSION.md para skills con adiciones
├── overrides/                 → SKILL.md reemplazos completos
├── orchestrators/             → (ya existe, no tocar)
├── unified-instructions/      → (ya existe, no tocar)

own/skills/                    → 15 + ~14 skills que estaban mal clasificados en upstream
```

## Acceptance Criteria

- [ ] `upstream/agent-teams-lite/skills/` tiene los 12 skills del repo ATL actual (incluyendo branch-pr e issue-creation que faltaban), sin modificar
- [ ] `upstream/gentleman-skills/curated/` tiene los 15 skills del repo Gentleman-Skills actual (incluyendo angular y github-pr que faltaban), sin modificar
- [ ] `upstream/_shared/` tiene los 4 archivos de ATL/_shared sin modificar
- [ ] `delta/extensions/` tiene EXTENSION.md para sdd-apply y sdd-explore (migrados desde upstream/)
- [ ] `delta/overrides/` tiene los SKILL.md modificados de SDD skills que difieren del ATL original (sdd-propose, sdd-verify, skill-registry)
- [ ] Skills que no vienen de ningún upstream (adversarial-review, codebase-cartography, etc.) movidos a `own/skills/`
- [ ] `installer/skills.ts` actualizado para leer la nueva estructura de 3 capas
- [ ] El installer produce el mismo resultado final: SKILL.md + EXTENSION.md concatenados en el destino
- [ ] Los 283 tests existentes siguen pasando
- [ ] Integration tests cubren la nueva estructura
- [ ] `javi-ai install --cli claude --yes` instala >= 50 skills sin error

## Task List

| # | Task | Estimate | Depends On | Status |
|---|------|----------|------------|--------|
| 1 | Descargar skills frescos de ATL y Gentleman-Skills repos | 15m | — | pending |
| 2 | Clasificar los 36 skills actuales de upstream: cuáles son ATL, cuáles Gentleman-Skills, cuáles propios mal clasificados | 15m | 1 | pending |
| 3 | Crear nueva estructura de directorios (upstream/agent-teams-lite, upstream/gentleman-skills, delta/extensions, delta/overrides) | 5m | — | pending |
| 4 | Mover skills de ATL: copiar originales frescos a upstream/agent-teams-lite/skills/ | 10m | 1, 3 | pending |
| 5 | Mover skills de Gentleman-Skills: copiar originales frescos a upstream/gentleman-skills/curated/ | 10m | 1, 3 | pending |
| 6 | Mover _shared/ a upstream/_shared/ con originales frescos de ATL | 5m | 1, 3 | pending |
| 7 | Extraer deltas: diff ATL originals vs versiones modificadas → crear EXTENSION.md o override en delta/ | 20m | 2, 4 | pending |
| 8 | Mover skills propios mal clasificados (~14) de upstream/ a own/skills/ | 10m | 2 | pending |
| 9 | Eliminar viejo upstream/skills/ una vez que todo esté migrado | 5m | 4, 5, 6, 7, 8 | pending |
| 10 | Actualizar installer/skills.ts para leer nueva estructura (ATL + Gentleman + delta + own) | 30m | 9 | pending |
| 11 | Actualizar constants.ts si hay nuevas rutas | 5m | 10 | pending |
| 12 | Actualizar integration tests para nueva estructura | 15m | 10 | pending |
| 13 | Run tests completos (unit + integration) | 5m | 12 | pending |
| 14 | Test práctico: javi-ai install --cli claude --yes | 5m | 13 | pending |
| 15 | Actualizar SOURCES.md en javi-platform con la nueva estructura | 10m | 14 | pending |

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Skills propios reclasificados pierden contenido | Low | High | Verificar diff antes de mover, no borrar hasta confirmar |
| Installer rompe por paths nuevos | Med | High | Tests existentes + integration tests |
| ATL repo cambió desde la última sync | Med | Low | Descargar fresh, comparar con lo que tenemos |
| EXTENSION.md model no cubre todos los diffs | Low | Med | Usar overrides/ para skills con cambios profundos |

## Dependencies

- GitHub API access para descargar de Gentleman-Programming/agent-teams-lite y Gentleman-Programming/Gentleman-Skills
- javi-platform repo para actualizar SOURCES.md

## Notes

- ADR-003 (upstream/delta/own) y ADR-004 (EXTENSION.md model) documentan la arquitectura objetivo
- Los skills "mystery" que no vienen de ningún upstream (~14) probablemente fueron creados por el usuario y puestos en upstream/ por error. Moverlos a own/ es lo correcto.
- El installer debe seguir produciendo el mismo resultado final: para cada CLI, los skills instalados = upstream + delta/extensions appended + delta/overrides replacing + own
- La prioridad de capas: ATL < Gentleman-Skills < delta/overrides < own (own wins)
