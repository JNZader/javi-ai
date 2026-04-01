---
name: subagent-observability
description: >
  Parse Claude Code JSONL session files to extract per-sub-agent metrics: token usage, tool call frequency, thinking-to-action ratio, bottleneck identification, and cost breakdown.
  Trigger: When analyzing sub-agent performance, debugging SDD workflow costs, or user mentions observability, agent metrics, token breakdown, session analysis.
metadata:
  author: javi-ai
  version: "1.0"
  tags: [observability, metrics, sub-agents, tokens, cost, SDD]
  category: observability
allowed-tools: Read, Bash
---

## Purpose

SDD workflows spawn multiple sub-agents with zero visibility into what each one consumes. This skill extracts actionable metrics from Claude Code JSONL session logs to answer: which agent burned the most tokens? Which tools were called most? Where are the bottlenecks?

---

## 1. JSONL Session File Structure

Claude Code stores session logs as JSONL (one JSON object per line):

```
~/.claude/projects/{project-path-encoded}/
  {session-id}.jsonl              # Main session
  {session-id}/subagents/
    agent-{agent-id}.jsonl        # One file per sub-agent
```

### Key Entry Types

| `type` | Contains | Use For |
|--------|----------|---------|
| `assistant` | `message.usage` (tokens), `message.content` (tool_use, thinking, text) | Token counting, tool tracking |
| `user` | `tool_result` responses | Matching tool results to calls |
| `progress` | Hook and status updates | Timeline reconstruction |
| `file-history-snapshot` | File backup metadata | Ignore for metrics |

### Assistant Entry Shape

```typescript
interface AssistantEntry {
  type: 'assistant';
  agentId?: string;          // Present in sub-agent files
  sessionId: string;
  timestamp: string;         // ISO 8601
  message: {
    model: string;           // e.g. "claude-opus-4-6"
    usage: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens: number;
      cache_read_input_tokens: number;
    };
    content: Array<
      | { type: 'thinking' }
      | { type: 'text'; text: string }
      | { type: 'tool_use'; name: string; input: Record<string, unknown> }
    >;
  };
}
```

**Important**: A single API response may produce MULTIPLE JSONL lines (one per content block streamed). Deduplicate by `message.id` before aggregating `usage` — only count usage ONCE per unique `message.id`.

---

## 2. Five Core Metrics

### 2.1 Token Usage Per Sub-Agent

Aggregate from `message.usage` across all entries for each `agentId`:

| Metric | Field | Cost Weight |
|--------|-------|-------------|
| Input tokens | `input_tokens` | Full price |
| Output tokens | `output_tokens` | Higher price (3-5x input) |
| Cache creation | `cache_creation_input_tokens` | 1.25x input price |
| Cache read | `cache_read_input_tokens` | 0.1x input price |

**Deduplication rule**: Group entries by `message.id`. Take `usage` from the entry with the HIGHEST `output_tokens` (the final streamed chunk has cumulative totals).

### 2.2 Tool Call Frequency

Count `content` blocks where `type === 'tool_use'`. Group by `name` field.

Report format:

```
| Agent | Tool | Calls | % of Total |
|-------|------|-------|------------|
| agent-a70... | Read | 12 | 35% |
| agent-a70... | Bash | 8 | 24% |
| agent-a70... | Edit | 6 | 18% |
```

**Watch for**: Agents with high `Bash` + `Read` and low `Edit`/`Write` are exploring, not implementing.

### 2.3 Thinking-to-Action Ratio

```
ratio = thinking_blocks / (thinking_blocks + tool_use_blocks)
```

| Ratio | Interpretation |
|-------|---------------|
| > 0.7 | Agent is overthinking — may need clearer instructions |
| 0.3-0.7 | Healthy balance |
| < 0.3 | Agent is acting without thinking — may produce low-quality output |

### 2.4 Bottleneck Identification

For SDD workflows, compare metrics across phases:

```
| Phase | Agent | Tokens | Duration | Tool Calls | Status |
|-------|-------|--------|----------|------------|--------|
| propose | agent-a1... | 12K | 45s | 8 | OK |
| spec | agent-b2... | 18K | 62s | 12 | OK |
| design | agent-c3... | 85K | 280s | 42 | BOTTLENECK |
| apply | agent-d4... | 45K | 120s | 25 | OK |
```

**Bottleneck detection**: Flag agents where `tokens > 2x median` OR `duration > 2x median`.

Duration is computed from `timestamp` of first entry to last entry for each agentId.

### 2.5 Cost Breakdown

```typescript
const PRICING = {
  'claude-opus-4-6':   { input: 15, output: 75, cache_read: 1.5, cache_create: 18.75 },
  'claude-sonnet-4-6': { input: 3,  output: 15, cache_read: 0.3, cache_create: 3.75 },
  'claude-haiku-3-5':  { input: 0.8, output: 4, cache_read: 0.08, cache_create: 1 },
}; // per 1M tokens

function costForAgent(usage, model) {
  const p = PRICING[model];
  return (
    (usage.input * p.input +
     usage.output * p.output +
     usage.cache_read * p.cache_read +
     usage.cache_create * p.cache_create) / 1_000_000
  );
}
```

---

## 3. Configuration

Override pricing or thresholds in project config:

```yaml
# In openspec/config.yaml or .ai-config/observability.yaml
observability:
  pricing:
    claude-opus-4-6:
      input: 15
      output: 75
      cache_read: 1.5
      cache_create: 18.75
  bottleneck:
    token_multiplier: 2.0    # Flag if > 2x median
    duration_multiplier: 2.0
  report:
    format: markdown          # markdown | json
    include_raw: false        # Include raw token counts
```

---

## 4. Usage Patterns

### Quick Session Analysis

```bash
# Find latest session for current project
SESSION=$(ls -t ~/.claude/projects/-home-javier-*/*.jsonl | head -1)

# Count sub-agents
ls "$(dirname "$SESSION")"/subagents/ 2>/dev/null | wc -l

# Quick token summary (requires jq)
cat "$SESSION" | jq -r 'select(.type=="assistant" and .message.usage) | [.message.id, .message.usage.input_tokens, .message.usage.output_tokens] | @tsv' | sort -u | awk '{i+=$2; o+=$3} END {print "Input:", i, "Output:", o}'
```

### SDD Workflow Analysis

After an `/sdd-ff` or `/sdd-apply`:
1. Find the session JSONL
2. List all sub-agent files in `subagents/`
3. Parse each, extract metrics
4. Generate comparison report
5. Identify bottleneck phase

---

## 5. Anti-Patterns

1. **Parse without deduplicating** — Streaming produces duplicate usage entries per message.id. Always deduplicate.
2. **Load entire file into memory** — Session files can be 10MB+. Stream line-by-line.
3. **Ignore cache tokens** — Cache reads are 90% cheaper. Ignoring them inflates cost estimates.
4. **Compare agents without context** — An `apply` agent SHOULD use more tokens than `propose`. Compare within phase types.
5. **Track without acting** — If metrics don't change behavior, they're overhead. Use bottleneck data to improve prompts.
6. **Hardcode pricing** — Model prices change. Use configurable pricing tables.

---

## 6. Relationship to Other Skills

| Skill | Relationship |
|-------|-------------|
| **cost-tracking** | Cost-tracking monitors budget limits; observability provides per-agent breakdown |
| **circuit-breaker** | Circuit-breaker kills runaway agents in real-time; observability analyzes post-hoc |
| **session-memory** | Session memory stores decisions; observability stores metrics |

---

## Quick Reference

| Metric | Formula | Healthy Range |
|--------|---------|---------------|
| Token efficiency | output / input | 0.1 - 0.5 |
| Cache hit ratio | cache_read / (input + cache_read) | > 60% |
| Thinking ratio | thinking / (thinking + tool_use) | 0.3 - 0.7 |
| Cost per agent | See pricing formula | < $0.50 for non-apply |
| Bottleneck flag | tokens > 2x median | Should be rare |

> @reference references/code-examples.md -- Load when implementing parsing scripts, report generators, or analyzing real session files
