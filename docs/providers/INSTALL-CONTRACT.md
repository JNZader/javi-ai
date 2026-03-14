# Install Contract

## Purpose

This document defines the current public install surface for `javi-ai`.

The stable entrypoint for published provider contracts is:

- `scripts/install-profiles.sh`

## Entrypoint Scope

`scripts/install-profiles.sh` is currently a scaffolded contract surface.

It defines the request shape that consumers may rely on now, while deferring real
install behavior to later work items.

## Supported Arguments

- `--provider ID` repeatable published provider ID
- `--package ID` repeatable published package ID
- `--preset ID` reserved preset identifier
- `--target ID` published install target ID
- `--contract-version VER` contract negotiation or pinning
- `--dry-run` validate request shape without installation
- `--list-contracts` print published providers, packages, and targets
- `-h`, `--help` show CLI help

## Current Contract Guarantees

The scaffold guarantees:

- the entrypoint name and location are stable for current wave work
- unsupported provider, package, target, or contract-version requests fail fast
- `--list-contracts` exposes the published identifier set without reading repo
  internals
- request shape is provider/package/target driven rather than path driven

The scaffold does not yet guarantee:

- file installation side effects
- preset resolution behavior
- extraction-backed provider profile materialization
- cutover from legacy runtime logic

## Published Install Targets

The current install target IDs are:

- `target.claude.user`
- `target.opencode.user`
- `target.gemini.user`
- `target.qwen.user`
- `target.codex.user`
- `target.copilot.repo`

`target.copilot.repo` is repository-scoped.

All other published targets are user-profile targets.

## Consumer Usage Rules

- reference published provider, package, and target IDs only
- do not construct requests from `javi-ai` internal directory names
- prefer `--list-contracts` or manifest reads when discovering supported IDs
- treat this entrypoint as the only public install surface for the current wave

## Wave 3 Readiness Statement

Wave 3 establishes install contract authority, not full install execution.

Consumers may now standardize on a single public entrypoint shape before later
implementation and cutover waves land.
