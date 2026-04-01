# Code Examples: Sub-Agent Observability

Full implementation scripts for parsing Claude Code JSONL session files.

---

## TypeScript Parser

```typescript
import { createReadStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { join, dirname } from 'node:path';

// --- Types ---

interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}

interface ContentBlock {
  type: 'thinking' | 'text' | 'tool_use';
  name?: string;
}

interface AgentMetrics {
  agentId: string;
  model: string;
  totalInput: number;
  totalOutput: number;
  totalCacheRead: number;
  totalCacheCreate: number;
  toolCalls: Record<string, number>;
  thinkingBlocks: number;
  toolUseBlocks: number;
  firstTimestamp: string;
  lastTimestamp: string;
  messageCount: number;
}

// --- Pricing ---

const PRICING: Record<string, { input: number; output: number; cache_read: number; cache_create: number }> = {
  'claude-opus-4-6':   { input: 15, output: 75, cache_read: 1.5, cache_create: 18.75 },
  'claude-sonnet-4-6': { input: 3,  output: 15, cache_read: 0.3, cache_create: 3.75 },
  'claude-haiku-3-5':  { input: 0.8, output: 4, cache_read: 0.08, cache_create: 1 },
};

// --- Parser ---

async function parseJsonlFile(filePath: string): Promise<Map<string, AgentMetrics>> {
  const agents = new Map<string, AgentMetrics>();
  const seenMessageIds = new Set<string>();

  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;

    let entry: any;
    try {
      entry = JSON.parse(line);
    } catch {
      continue; // Skip malformed lines
    }

    if (entry.type !== 'assistant' || !entry.message?.usage) continue;

    const msgId = entry.message.id;
    if (!msgId) continue;

    // Deduplicate: keep the entry with highest output_tokens per message.id
    const agentId = entry.agentId ?? 'main-session';
    const key = `${agentId}:${msgId}`;

    if (seenMessageIds.has(key)) {
      // Update if this entry has more output tokens (later stream chunk)
      const agent = agents.get(agentId);
      if (agent && entry.message.usage.output_tokens > 0) {
        // Already counted — skip duplicate
      }
      continue;
    }
    seenMessageIds.add(key);

    // Get or create agent metrics
    if (!agents.has(agentId)) {
      agents.set(agentId, {
        agentId,
        model: entry.message.model ?? 'unknown',
        totalInput: 0,
        totalOutput: 0,
        totalCacheRead: 0,
        totalCacheCreate: 0,
        toolCalls: {},
        thinkingBlocks: 0,
        toolUseBlocks: 0,
        firstTimestamp: entry.timestamp,
        lastTimestamp: entry.timestamp,
        messageCount: 0,
      });
    }

    const agent = agents.get(agentId)!;
    const usage: Usage = entry.message.usage;

    // Aggregate tokens
    agent.totalInput += usage.input_tokens ?? 0;
    agent.totalOutput += usage.output_tokens ?? 0;
    agent.totalCacheRead += usage.cache_read_input_tokens ?? 0;
    agent.totalCacheCreate += usage.cache_creation_input_tokens ?? 0;
    agent.messageCount++;

    // Track timestamps
    if (entry.timestamp < agent.firstTimestamp) agent.firstTimestamp = entry.timestamp;
    if (entry.timestamp > agent.lastTimestamp) agent.lastTimestamp = entry.timestamp;

    // Count content blocks
    const content: ContentBlock[] = entry.message.content ?? [];
    for (const block of content) {
      if (block.type === 'thinking') agent.thinkingBlocks++;
      if (block.type === 'tool_use') {
        agent.toolUseBlocks++;
        const toolName = block.name ?? 'unknown';
        agent.toolCalls[toolName] = (agent.toolCalls[toolName] ?? 0) + 1;
      }
    }
  }

  return agents;
}

// --- Session Scanner ---

async function scanSession(sessionPath: string): Promise<Map<string, AgentMetrics>> {
  const allAgents = new Map<string, AgentMetrics>();

  // Parse main session
  const mainMetrics = await parseJsonlFile(sessionPath);
  for (const [id, metrics] of mainMetrics) {
    allAgents.set(id, metrics);
  }

  // Parse sub-agent files
  const sessionDir = sessionPath.replace('.jsonl', '');
  const subagentDir = join(sessionDir, 'subagents');

  try {
    const files = await readdir(subagentDir);
    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;
      const subMetrics = await parseJsonlFile(join(subagentDir, file));
      for (const [id, metrics] of subMetrics) {
        allAgents.set(id, metrics);
      }
    }
  } catch {
    // No subagents directory — single session
  }

  return allAgents;
}

// --- Report Generator ---

function generateReport(agents: Map<string, AgentMetrics>): string {
  const lines: string[] = ['# Sub-Agent Observability Report\n'];
  const agentList = [...agents.values()];

  // --- Token Usage Table ---
  lines.push('## Token Usage Per Agent\n');
  lines.push('| Agent | Model | Input | Output | Cache Read | Cache Create | Total |');
  lines.push('|-------|-------|------:|-------:|-----------:|-------------:|------:|');

  for (const a of agentList) {
    const total = a.totalInput + a.totalOutput + a.totalCacheRead + a.totalCacheCreate;
    const shortId = a.agentId.length > 16 ? a.agentId.slice(0, 16) + '...' : a.agentId;
    lines.push(`| ${shortId} | ${a.model} | ${a.totalInput.toLocaleString()} | ${a.totalOutput.toLocaleString()} | ${a.totalCacheRead.toLocaleString()} | ${a.totalCacheCreate.toLocaleString()} | ${total.toLocaleString()} |`);
  }

  // --- Tool Call Frequency ---
  lines.push('\n## Tool Call Frequency\n');
  lines.push('| Agent | Tool | Calls |');
  lines.push('|-------|------|------:|');

  for (const a of agentList) {
    const sorted = Object.entries(a.toolCalls).sort(([, a], [, b]) => b - a);
    for (const [tool, count] of sorted) {
      const shortId = a.agentId.length > 16 ? a.agentId.slice(0, 16) + '...' : a.agentId;
      lines.push(`| ${shortId} | ${tool} | ${count} |`);
    }
  }

  // --- Thinking-to-Action Ratio ---
  lines.push('\n## Thinking-to-Action Ratio\n');
  lines.push('| Agent | Thinking | Tool Use | Ratio | Assessment |');
  lines.push('|-------|:--------:|:--------:|------:|------------|');

  for (const a of agentList) {
    const total = a.thinkingBlocks + a.toolUseBlocks;
    const ratio = total > 0 ? a.thinkingBlocks / total : 0;
    const assessment = ratio > 0.7 ? 'OVERTHINKING' : ratio < 0.3 ? 'UNDERTHINKING' : 'Healthy';
    const shortId = a.agentId.length > 16 ? a.agentId.slice(0, 16) + '...' : a.agentId;
    lines.push(`| ${shortId} | ${a.thinkingBlocks} | ${a.toolUseBlocks} | ${(ratio * 100).toFixed(1)}% | ${assessment} |`);
  }

  // --- Bottleneck Detection ---
  const tokenCounts = agentList.map(a => a.totalInput + a.totalOutput);
  const medianTokens = tokenCounts.sort((a, b) => a - b)[Math.floor(tokenCounts.length / 2)] ?? 0;

  lines.push('\n## Bottleneck Detection\n');
  lines.push('| Agent | Tokens | Duration (s) | Messages | Status |');
  lines.push('|-------|-------:|-------------:|---------:|--------|');

  for (const a of agentList) {
    const totalTokens = a.totalInput + a.totalOutput;
    const durationMs = new Date(a.lastTimestamp).getTime() - new Date(a.firstTimestamp).getTime();
    const durationS = Math.round(durationMs / 1000);
    const isBottleneck = totalTokens > medianTokens * 2;
    const shortId = a.agentId.length > 16 ? a.agentId.slice(0, 16) + '...' : a.agentId;
    lines.push(`| ${shortId} | ${totalTokens.toLocaleString()} | ${durationS} | ${a.messageCount} | ${isBottleneck ? '**BOTTLENECK**' : 'OK'} |`);
  }

  // --- Cost Breakdown ---
  lines.push('\n## Cost Breakdown\n');
  lines.push('| Agent | Model | Input Cost | Output Cost | Cache Cost | Total |');
  lines.push('|-------|-------|----------:|-----------:|-----------:|------:|');

  let grandTotal = 0;
  for (const a of agentList) {
    const p = PRICING[a.model] ?? PRICING['claude-sonnet-4-6'];
    const inputCost = (a.totalInput * p.input) / 1_000_000;
    const outputCost = (a.totalOutput * p.output) / 1_000_000;
    const cacheCost = (a.totalCacheRead * p.cache_read + a.totalCacheCreate * p.cache_create) / 1_000_000;
    const total = inputCost + outputCost + cacheCost;
    grandTotal += total;
    const shortId = a.agentId.length > 16 ? a.agentId.slice(0, 16) + '...' : a.agentId;
    lines.push(`| ${shortId} | ${a.model} | $${inputCost.toFixed(4)} | $${outputCost.toFixed(4)} | $${cacheCost.toFixed(4)} | $${total.toFixed(4)} |`);
  }
  lines.push(`| **TOTAL** | | | | | **$${grandTotal.toFixed(4)}** |`);

  return lines.join('\n');
}

// --- CLI Entry Point ---

async function main() {
  const sessionPath = process.argv[2];
  if (!sessionPath) {
    console.error('Usage: npx tsx observe.ts <path-to-session.jsonl>');
    process.exit(1);
  }

  const agents = await scanSession(sessionPath);
  console.log(generateReport(agents));
}

main().catch(console.error);
```

---

## Python Parser

```python
#!/usr/bin/env python3
"""Parse Claude Code JSONL session files for sub-agent observability metrics."""

import json
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

# --- Pricing (per 1M tokens) ---

PRICING = {
    "claude-opus-4-6":   {"input": 15, "output": 75, "cache_read": 1.5, "cache_create": 18.75},
    "claude-sonnet-4-6": {"input": 3,  "output": 15, "cache_read": 0.3, "cache_create": 3.75},
    "claude-haiku-3-5":  {"input": 0.8, "output": 4, "cache_read": 0.08, "cache_create": 1},
}


def parse_jsonl(filepath: str) -> dict[str, dict]:
    """Stream-parse a JSONL file and aggregate metrics per agent."""
    agents: dict[str, dict] = {}
    seen_msg_ids: set[str] = set()

    with open(filepath, "r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            if entry.get("type") != "assistant" or "message" not in entry:
                continue
            msg = entry["message"]
            if "usage" not in msg:
                continue

            msg_id = msg.get("id", "")
            agent_id = entry.get("agentId", "main-session")
            dedup_key = f"{agent_id}:{msg_id}"

            if dedup_key in seen_msg_ids:
                continue
            seen_msg_ids.add(dedup_key)

            if agent_id not in agents:
                agents[agent_id] = {
                    "model": msg.get("model", "unknown"),
                    "input": 0, "output": 0,
                    "cache_read": 0, "cache_create": 0,
                    "tool_calls": defaultdict(int),
                    "thinking_blocks": 0, "tool_use_blocks": 0,
                    "first_ts": entry.get("timestamp", ""),
                    "last_ts": entry.get("timestamp", ""),
                    "messages": 0,
                }

            a = agents[agent_id]
            usage = msg["usage"]
            a["input"] += usage.get("input_tokens", 0)
            a["output"] += usage.get("output_tokens", 0)
            a["cache_read"] += usage.get("cache_read_input_tokens", 0)
            a["cache_create"] += usage.get("cache_creation_input_tokens", 0)
            a["messages"] += 1

            ts = entry.get("timestamp", "")
            if ts and (not a["first_ts"] or ts < a["first_ts"]):
                a["first_ts"] = ts
            if ts and ts > a["last_ts"]:
                a["last_ts"] = ts

            for block in msg.get("content", []):
                btype = block.get("type")
                if btype == "thinking":
                    a["thinking_blocks"] += 1
                elif btype == "tool_use":
                    a["tool_use_blocks"] += 1
                    a["tool_calls"][block.get("name", "unknown")] += 1

    return agents


def scan_session(session_path: str) -> dict[str, dict]:
    """Parse main session + all sub-agent files."""
    all_agents = parse_jsonl(session_path)

    subagent_dir = Path(session_path.replace(".jsonl", "")) / "subagents"
    if subagent_dir.is_dir():
        for f in subagent_dir.glob("*.jsonl"):
            sub = parse_jsonl(str(f))
            all_agents.update(sub)

    return all_agents


def duration_seconds(first: str, last: str) -> int:
    """Compute duration between two ISO timestamps."""
    try:
        t1 = datetime.fromisoformat(first.replace("Z", "+00:00"))
        t2 = datetime.fromisoformat(last.replace("Z", "+00:00"))
        return int((t2 - t1).total_seconds())
    except (ValueError, TypeError):
        return 0


def generate_report(agents: dict[str, dict]) -> str:
    """Generate markdown observability report."""
    lines = ["# Sub-Agent Observability Report\n"]

    items = list(agents.items())

    # Token usage
    lines.append("## Token Usage\n")
    lines.append("| Agent | Model | Input | Output | Cache Read | Cache Create |")
    lines.append("|-------|-------|------:|-------:|-----------:|-------------:|")
    for aid, a in items:
        short = aid[:16] + "..." if len(aid) > 16 else aid
        lines.append(f"| {short} | {a['model']} | {a['input']:,} | {a['output']:,} | {a['cache_read']:,} | {a['cache_create']:,} |")

    # Tool calls
    lines.append("\n## Tool Calls\n")
    lines.append("| Agent | Tool | Calls |")
    lines.append("|-------|------|------:|")
    for aid, a in items:
        short = aid[:16] + "..." if len(aid) > 16 else aid
        for tool, count in sorted(a["tool_calls"].items(), key=lambda x: -x[1]):
            lines.append(f"| {short} | {tool} | {count} |")

    # Thinking ratio
    lines.append("\n## Thinking-to-Action Ratio\n")
    lines.append("| Agent | Thinking | Actions | Ratio | Status |")
    lines.append("|-------|:--------:|:-------:|------:|--------|")
    for aid, a in items:
        short = aid[:16] + "..." if len(aid) > 16 else aid
        total = a["thinking_blocks"] + a["tool_use_blocks"]
        ratio = a["thinking_blocks"] / total if total > 0 else 0
        status = "OVERTHINKING" if ratio > 0.7 else ("UNDERTHINKING" if ratio < 0.3 else "Healthy")
        lines.append(f"| {short} | {a['thinking_blocks']} | {a['tool_use_blocks']} | {ratio:.1%} | {status} |")

    # Bottlenecks
    token_counts = sorted([a["input"] + a["output"] for a in agents.values()])
    median = token_counts[len(token_counts) // 2] if token_counts else 0

    lines.append("\n## Bottlenecks\n")
    lines.append("| Agent | Tokens | Duration | Messages | Status |")
    lines.append("|-------|-------:|---------:|---------:|--------|")
    for aid, a in items:
        short = aid[:16] + "..." if len(aid) > 16 else aid
        total_tok = a["input"] + a["output"]
        dur = duration_seconds(a["first_ts"], a["last_ts"])
        flag = "**BOTTLENECK**" if total_tok > median * 2 else "OK"
        lines.append(f"| {short} | {total_tok:,} | {dur}s | {a['messages']} | {flag} |")

    # Cost
    lines.append("\n## Cost Breakdown\n")
    lines.append("| Agent | Input $ | Output $ | Cache $ | Total $ |")
    lines.append("|-------|--------:|---------:|--------:|--------:|")
    grand = 0.0
    for aid, a in items:
        short = aid[:16] + "..." if len(aid) > 16 else aid
        p = PRICING.get(a["model"], PRICING["claude-sonnet-4-6"])
        ic = a["input"] * p["input"] / 1_000_000
        oc = a["output"] * p["output"] / 1_000_000
        cc = (a["cache_read"] * p["cache_read"] + a["cache_create"] * p["cache_create"]) / 1_000_000
        total = ic + oc + cc
        grand += total
        lines.append(f"| {short} | ${ic:.4f} | ${oc:.4f} | ${cc:.4f} | ${total:.4f} |")
    lines.append(f"| **TOTAL** | | | | **${grand:.4f}** |")

    return "\n".join(lines)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python observe.py <path-to-session.jsonl>", file=sys.stderr)
        sys.exit(1)
    agents = scan_session(sys.argv[1])
    print(generate_report(agents))
```

---

## Quick One-Liners

### Count tokens per sub-agent (bash + jq)

```bash
# List all sub-agent token totals for a session
for f in ~/.claude/projects/*/subagents/*.jsonl; do
  agent=$(basename "$f" .jsonl)
  tokens=$(jq -r 'select(.type=="assistant" and .message.usage) | .message.usage | [.input_tokens, .output_tokens] | add' "$f" 2>/dev/null | paste -sd+ | bc)
  echo "$agent: ${tokens:-0} tokens"
done
```

### Find most expensive session

```bash
# Sum output tokens across all sessions (output tokens dominate cost)
for f in ~/.claude/projects/*/*.jsonl; do
  total=$(jq -r 'select(.type=="assistant" and .message.usage) | .message.usage.output_tokens // 0' "$f" 2>/dev/null | paste -sd+ | bc 2>/dev/null)
  echo "${total:-0} $f"
done | sort -rn | head -5
```

### Tool call histogram

```bash
# Top 10 tools across all sessions
jq -r 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use") | .name' ~/.claude/projects/*/*.jsonl 2>/dev/null | sort | uniq -c | sort -rn | head -10
```
