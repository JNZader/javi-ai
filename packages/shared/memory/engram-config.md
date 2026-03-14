# Engram Memory Configuration Guide

## Prerequisites

```bash
npm install -g engram
# Verify installation
engram --version
```

## Claude Code Configuration

Add to your `~/.claude/mcp-servers.json` (or merge into existing):

```json
{
  "mcpServers": {
    "engram": {
      "type": "stdio",
      "command": "engram",
      "args": ["mcp"]
    }
  }
}
```

## OpenCode Configuration

Add to your `~/.config/opencode/opencode.json` under the `mcp` key:

```json
{
  "mcp": {
    "engram": {
      "command": ["engram", "mcp"],
      "enabled": true,
      "type": "local"
    }
  }
}
```

## Gemini CLI Configuration

Add to your Gemini CLI settings file:

```json
{
  "mcpServers": {
    "engram": {
      "command": "engram",
      "args": ["mcp"]
    }
  }
}
```

## Basic Usage

Once configured, use these tools in your AI conversations:

```
# Save a finding
mem_save(title: "Fixed N+1 query in UserList", type: "bugfix", content: "...")

# Search past sessions
mem_search(query: "authentication middleware")

# Load recent context
mem_context(project: "my-project")
```

## Project-Level Memory

For project repos, add a `project` identifier to scope memory:

```
mem_save(project: "my-project", title: "...", content: "...")
mem_search(project: "my-project", query: "...")
```

## Documentation

- Full API: https://github.com/Gentleman-Programming/engram
- Usage patterns: https://github.com/Gentleman-Programming/agent-teams-lite
