# shared.memory — Engram Memory Integration

## Purpose

This package provides cross-provider memory integration assets for project repositories that want persistent AI session memory via [Engram](https://github.com/Gentleman-Programming/engram).

## What Engram Does

Engram is a persistent memory MCP server that stores and retrieves observations across AI coding sessions. It works with Claude Code, OpenCode, Gemini CLI, and any MCP-compatible assistant.

When configured:
- AI assistants remember architectural decisions, bug fixes, and patterns across sessions
- Memory persists through context resets and compaction
- Multiple tools can share the same memory store

## Integration Pattern

1. Install engram: `npm install -g engram`
2. Add the engram MCP server to your AI config (see `engram-config.md`)
3. Use `mem_save` and `mem_search` in your AI conversations to persist and retrieve knowledge

## Files In This Package

- `README.md` — this integration guide
- `engram-config.md` — provider-specific setup instructions

## Upstream Reference

- https://github.com/Gentleman-Programming/engram
- https://github.com/Gentleman-Programming/agent-teams-lite (engram usage patterns)

## Project Package Link

This package is the foundation for the `project.memory.engram` project-facing package published in `javi-ai/manifests/project-packages.yaml`. Downstream projects that request `project.memory.engram` inherit this package's integration assets.
