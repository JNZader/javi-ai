# Development method (ADR-013 / ADR-014)

One method. ODD is the spine. OpenSpec **OPSX** is the Specified width, not Gentle `/sdd-*`. Size never selects OpenSpec. Do not dual-run `/sdd-*` and `/opsx:*`.

| Width | When | Artifact |
|-------|------|----------|
| Loose | 1–2 files, reversible, no new contract | Inline |
| Tracked | Several files, one boundary, session-survivable | `odd/tasks/` + design beat |
| Specified | Public/cross-package contract, auth/tenant/RLS, hard-to-revert data, or `/opsx:propose` | OPSX; amend with `/opsx:update` |

Requires `openspec` on PATH and `openspec init` in that repo the first time it is Specified.
