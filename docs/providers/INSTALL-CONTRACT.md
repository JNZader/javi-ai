# Install Contract

## Purpose

This document defines the current public install surface for `javi-ai`.

The stable entrypoint for published provider contracts is:

- `scripts/install-profiles.sh`

## Entrypoint Scope

`scripts/install-profiles.sh` is the public install surface for `javi-ai`.

After the `javi-ai-completion` milestone, it implements real file installation
(symlink-based delivery) in addition to request validation.


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

The entrypoint now guarantees:

- the entrypoint name and location are stable for current wave work
- unsupported provider, package, target, or contract-version requests fail fast
- `--list-contracts` exposes the published identifier set without reading repo
  internals
- request shape is provider/package/target driven rather than path driven

The entrypoint does not yet guarantee:

- full preset resolution behavior
- preset resolution behavior
- extraction-backed profile materialization for all future providers
- interactive install wizard behavior

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

The javi-ai-completion milestone adds real file installation to the established contract surface.

File installation uses symlinks by default. Add `--home PATH` for user targets.

