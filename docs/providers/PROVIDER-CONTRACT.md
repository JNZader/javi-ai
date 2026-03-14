# Provider Contract

## Purpose

This document is the canonical human-readable contract guide for Wave 3 of
`ecosystem-restructure` in `javi-ai`.

It explains how consumers should read the published provider catalog and package
composition without depending on internal `packages/` layout.

## Canonical Surfaces

- `manifests/providers.yaml`
- `manifests/packages.yaml`
- `manifests/targets.yaml`
- `scripts/install-profiles.sh`

These surfaces are additive and contract-first.

Consumers must depend on published IDs and fields only.

## Required First-Class Providers

The current required provider set is:

- `claude`
- `opencode`
- `gemini`
- `qwen`
- `codex`
- `copilot`

Each provider entry in `manifests/providers.yaml` publishes:

- stable `id`
- display name
- `profile_status`
- `profile_metadata`
- supported install target IDs
- minimum package IDs
- optional shared package groups
- `contract_version`

## Provider Package Rules

`manifests/packages.yaml` is the package-composition contract.

Shared package IDs currently published:

- `shared.instructions`
- `shared.agents`
- `shared.skills`
- `shared.hooks`
- `shared.commands`
- `shared.mcp`
- `shared.memory`

Provider package IDs currently published:

- `provider.claude.core`
- `provider.opencode.core`
- `provider.gemini.core`
- `provider.qwen.core`
- `provider.codex.core`
- `provider.copilot.core`

Consumer rules:

- consume published package IDs only
- do not infer package composition from internal directories in `javi-ai`
- treat shared packages as canonical composition inputs owned by manifest data

## Provider-To-Target Mapping

Current provider-to-target mapping is one-to-one for the first-class set:

| Provider ID | Provider package ID | Install target ID |
|---|---|---|
| `claude` | `provider.claude.core` | `target.claude.user` |
| `opencode` | `provider.opencode.core` | `target.opencode.user` |
| `gemini` | `provider.gemini.core` | `target.gemini.user` |
| `qwen` | `provider.qwen.core` | `target.qwen.user` |
| `codex` | `provider.codex.core` | `target.codex.user` |
| `copilot` | `provider.copilot.core` | `target.copilot.repo` |

This mapping is the published contract that consumer repos such as
`javi-dots/modules/ai/module.yaml` should use.

## Canonical vs Legacy Status

For Wave 3, `javi-ai` is canonical for provider IDs, package IDs, install target
IDs, and install entrypoint shape.

Legacy installer notes or provider-specific path knowledge remain reference-only.
They are not valid public contracts for new consumer work.

## Non-Goals For WI-012

This work item does not:

- extract provider assets
- declare provider profile implementation complete
- make legacy runtime paths canonical again
- authorize consumers to read `packages/providers/*` directly
