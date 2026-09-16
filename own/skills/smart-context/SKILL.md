---
name: smart-context
description: >
  Assemble portable repo context from RepoForge file-dep graphs, then Engram when available.
  Trigger: When gathering smart context, a RepoForge graph, Engram observations, or a file-dependency map before coding.
license: MIT
metadata:
  author: javi-ai
  version: "1.0"
allowed-tools: Read, Bash, Glob, Grep
---

## Purpose

Build a portable context packet from provider evidence only. This skill is not a broker server.

## When to Activate

- User asks for smart context, a dependency map, or what to load before a change
- A task needs RepoForge graph evidence and optional Engram memory
- Do NOT activate to run GHAGGA, Orca, Hermes, ERE, fusion ranking, or live recapture

## Critical Rules

1. RepoForge FIRST. Run exactly `repoforge graph -w . --v2 --format json` (file-dep imports). Consume `nodes` and `edges` plus identity fields `repository`, `source_revision`, `dirty`, `index_revision` when present.
2. Engram SECOND if available. Search previews are not full evidence; cite observation IDs; preserve lifecycle.
3. Classify each graph structure as `ok`, `unsupported`, or `error`. File-dep imports are the only `ok` structure. Treat `symbols`, `calls`, and `cross_service` as unsupported.
4. Preserve conflicts; do not pick a winner.
5. Honor budget; truncated and dropped ids stay visible.
6. `freshness` and `git_state` may be unknown; do not invent revisions.
7. Missing CLI, bad JSON, or no Engram: abstain that provider with detail; still emit what is known.
8. Never treat agent reasoning as provider evidence.

## MUST NOT

Do not use a broker server, GHAGGA, Orca, Hermes, ERE, or fusion ranking. Do not treat blast-radius or codemap as RepoForge evidence. Do not treat edge weight as confidence. Do not live-recapture md-evals fixtures.
