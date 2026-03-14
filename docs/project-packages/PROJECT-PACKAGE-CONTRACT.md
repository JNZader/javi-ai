# Project Package Contract

## Purpose

This document is the canonical human-readable contract guide for the
project-facing AI package catalog published by `javi-ai`.

It explains which project package IDs are currently published, which remain
reserved, and how downstream consumers such as `javi-forge` should interpret the
catalog.

## Canonical Surface

- `manifests/project-packages.yaml`

Consumers must read published project package IDs from this catalog only.

Project package contracts are separate from:

- provider package contracts in `manifests/providers.yaml` and `manifests/packages.yaml`
- install target contracts in `manifests/targets.yaml`
- internal implementation paths under `packages/`

## Published Project Package IDs

The current stable project-facing package set is:

- `project.ai.instructions`
- `project.sdd.base`
- `project.memory.engram`
- `project.ai.review`

All four packages are now published as of the `javi-ai-completion` milestone.

## Package Composition Rules

Project-facing packages may:

- compose published shared package IDs
- expose project-safe capabilities for generated repositories
- stay independent from user-profile or repo-profile provider runtime contracts

Project-facing packages must not:

- expose `provider.*` package IDs as project-level dependencies
- require consumers to read `packages/shared/*` or `packages/providers/*`
- rely on internal file layout as part of the public contract

## Current Published Packages

### `project.ai.instructions`

Purpose:

- provide provider-neutral AI instructions and policy assets for project repos

Current shared package inputs:

- `shared.instructions`

Safe consumer expectation:

- repos may request this package when they need a base AI instruction layer
  without coupling to any specific provider runtime

### `project.sdd.base`

Purpose:

- provide the minimum project-safe AI package set for repositories that adopt
  spec-driven development workflows

Current shared package inputs:

- `shared.instructions`
- `shared.agents`

Safe consumer expectation:

- repos may request this package when they need project-level SDD guidance and
  orchestrator-facing assets without depending on internal shared file layout

## Current Published Packages Summary

| Package ID | Shared inputs | Purpose |
|---|---|---|
| `project.ai.instructions` | `shared.instructions` | Provider-neutral AI instruction base |
| `project.sdd.base` | `shared.instructions`, `shared.agents` | SDD workflow for project repos |
| `project.memory.engram` | `shared.memory`, `shared.instructions` | Engram persistent memory integration |
| `project.ai.review` | `shared.hooks`, `shared.agents`, `shared.instructions` | AI-assisted code review |

## Consumer Rules

- `javi-forge` may list only published project package IDs in its allowed or
  optional AI integration mappings
- generated repos consume project package IDs, never provider package IDs
- all four published IDs are now stable and safe to depend on
