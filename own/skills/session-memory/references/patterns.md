# Session Memory — Patterns & Anti-Patterns

## Integration Patterns

### Session Memory + Engram MCP Server

Engram handles long-term semantic memory (vector-based, cross-project). Session memory handles working memory (recent decisions, active gotchas, file-based, zero infrastructure).

```
/remember decision → .ai-memory/session.md (session-memory)
/engram store      → Engram vector store (long-term)

On session start:
  1. Load session-memory (fast, file-based, ~500 tokens)
  2. Query Engram for relevant context (semantic search)
  3. Merge into active context
```

### Toolsets + Domain Orchestrators

Auto-set toolset profiles per SDD phase:

```yaml
sdd_toolsets:
  explore: explore    # Read-only codebase discovery
  propose: plan       # Planning and architecture
  spec: docs          # Writing specifications
  design: plan        # Architecture decisions
  tasks: plan         # Task breakdown
  apply: build        # Implementation
  verify: review      # Validation against specs
  archive: docs       # Documentation sync
```

### /remember + SDD Workflow

During SDD phases, `/remember` gains contextual tags:

```
# During /sdd:explore
/remember "The payments module uses event sourcing"
→ Stored in: Gotchas (tagged: sdd:explore, payments)

# During /sdd:apply
/remember "Had to use a workaround for the Stripe webhook race condition"
→ Stored in: Gotchas (tagged: sdd:apply, payments, stripe)
```

### Session Memory + Codebase Cartography

Reference map regions in memory entries:

```markdown
## Gotchas
- [2024-02-10] The auth module (map:core/auth) has circular deps with user module
- [2024-02-12] The API gateway (map:infra/gateway) rate limits are per-IP, not per-user
```

---

## Anti-Patterns

### 1. Storing Sensitive Data in Memory

**Never** store secrets, API keys, passwords, tokens, or PII. Memory files may be committed to git.

```markdown
# BAD
- [2024-01-15] API key for Stripe: sk_live_abc123def456

# GOOD
- [2024-01-15] Stripe API key is in 1Password vault "Engineering Shared"
```

### 2. Letting Memory Files Grow Unbounded

Run `/memories prune` regularly. Keep under 500-token budget. A 2000-token memory file consumes valuable context window space.

### 3. Micromanaging with Toolsets

Toolsets are guardrails, not cages. The `build` profile should be default for most work. Don't create ultra-restrictive profiles that prevent the AI from working.

### 4. Forgetting to Prune Outdated Memories

Stale memories actively mislead the AI. Review monthly. Mark time-sensitive entries with TTLs.

### 5. Mixing Personal and Project Memories

Personal preferences go in `~/.ai-memory/global.md` (user-level). Project memory should only contain team-relevant decisions.

### 6. Duplicating Existing Documentation

Store only delta information — things not obvious from codebase or existing docs. Session memory complements documentation, doesn't replace it.

### 7. Ignoring Token Budget Warnings

500 tokens of high-signal memory > 2000 tokens of noise. Treat the budget as a hard constraint.
