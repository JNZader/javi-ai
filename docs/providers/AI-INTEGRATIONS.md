# AI Integrations

## Purpose

This document is the canonical AI integration guide for the migrated Wave 5 slices
owned by `javi-ai`.

It publishes where shared AI assets and first-class provider profiles now live
after WI-018 and WI-019, and it records the WI-027 cutover that stops active
legacy derivation for the completed shared and provider slices.

## Canonical Authority

`javi-ai` is now the canonical owner for the migrated AI integration slices in:

- `packages/shared/`
- `packages/providers/`
- `manifests/providers.yaml`
- `manifests/packages.yaml`
- `manifests/targets.yaml`
- `scripts/install-profiles.sh`

Consumers such as `javi-dots` must use published provider IDs, package IDs,
target IDs, and the public install entrypoint instead of reading provider assets
from legacy paths.

## Shared Package Authority

The first extracted shared AI slice landed under these canonical package homes:

| Shared package ID | Canonical path | WI status |
|---|---|---|
| `shared.instructions` | `packages/shared/instructions/` | extracted in WI-018 |
| `shared.agents` | `packages/shared/agents/` | extracted in WI-018 |
| `shared.hooks` | `packages/shared/hooks/` | extracted subset in WI-018 |
| `shared.skills` | `packages/shared/skills/` | contract published, implementation pending later slices |
| `shared.commands` | `packages/shared/commands/` | contract published, implementation pending later slices |
| `shared.mcp` | `packages/shared/mcp/` | contract published, implementation pending later slices |
| `shared.memory` | `packages/shared/memory/` | contract published, implementation pending later slices |

Rule:

- reusable cross-provider behavior is canonical in shared packages, not in an
  individual provider profile

## Provider Integration Matrix

The six required first-class providers remain in parity scope.

| Provider | Package ID | Target ID | Canonical provider home | Migrated provider slice |
|---|---|---|---|---|
| Claude Code | `provider.claude.core` | `target.claude.user` | `packages/providers/claude/` | runtime settings, statusline override, theme override, target recipe |
| OpenCode | `provider.opencode.core` | `target.opencode.user` | `packages/providers/opencode/` | runtime config, theme override, target recipe |
| Gemini CLI | `provider.gemini.core` | `target.gemini.user` | `packages/providers/gemini/` | target recipe generated from shared authority |
| Qwen Code | `provider.qwen.core` | `target.qwen.user` | `packages/providers/qwen/` | QWEN context, runtime settings, target recipe |
| Codex CLI | `provider.codex.core` | `target.codex.user` | `packages/providers/codex/` | target recipe generated from shared authority |
| GitHub Copilot | `provider.copilot.core` | `target.copilot.repo` | `packages/providers/copilot/` | repo-profile target recipe generated from shared authority |

Each provider profile is the canonical home for provider-specific runtime files,
overrides, and target assembly inputs.

Each provider still composes required shared behavior from `shared.instructions`
and may add optional shared packages without taking ownership of them.

## How Consumers Should Read The Current State

- `manifests/providers.yaml` publishes the stable provider catalog
- `manifests/packages.yaml` publishes shared and provider package IDs
- `manifests/targets.yaml` publishes supported install targets and install modes
- `scripts/install-profiles.sh` remains the single public install entrypoint shape
- `packages/providers/<provider>/package.yaml` records provider-local lineage,
  extracted assets, and ownership boundaries

Current phase note:

- docs, package homes, and target recipes are canonical for the migrated slices
- WI-027 is complete for the extracted Wave 5 slices, so active runtime/source
  derivation now stays inside `javi-ai`
- listed legacy paths remain historical reference only for lineage and later
  non-migrated slices

## WI-027 Cutover Effect

For the completed slices from WI-018 and WI-019:

- `packages/shared/*/package.yaml` now records `active_legacy_dependency: none`
- `packages/providers/*/package.yaml` now records `active_legacy_dependency: none`
- provider target recipes keep legacy locations only as
  `reference_legacy_sources`
- new edits for these slices must land in `javi-ai`, not `vault/Javi.Dots`

This cutover does not claim that every future AI slice is migrated yet.

It only retires active legacy derivation for the shared/provider assets already
extracted into canonical package and provider homes.

## Legacy Docs Now Marked As Mirrors

For the migrated slices above, these legacy docs are no longer canonical:

- `vault/Javi.Dots/docs/ai-configuration.md`
- `vault/Javi.Dots/docs/ai-tools-integration.md`

Their remaining role is:

- explain legacy installer behavior still owned by `javi-dots`
- link readers back to this document and the published contract docs for current
  provider/package/target authority

## Reader Guidance

Use these docs together:

- `docs/providers/AI-INTEGRATIONS.md` for canonical integration ownership and
  migrated slice status
- `docs/providers/PROVIDER-CONTRACT.md` for the public provider/package contract
- `docs/providers/INSTALL-CONTRACT.md` for the public install surface
- `docs/providers/SIX-CLI-PARITY-CHECKLIST.md` for parity verification across the
  six required providers
