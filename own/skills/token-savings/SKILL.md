---
name: token-savings
description: >
  Token savings analytics combining RTK gain data with cost-tracking to show real savings per session alongside dollar costs. Gracefully skips when RTK is not installed.
  Trigger: When user asks about token savings, says "rtk gain", "how much did I save", "token efficiency", or invokes /token-savings.
license: MIT
metadata:
  author: javi-ai
  version: "1.0"
  tags: [tokens, cost, analytics, rtk, optimization]
  category: observability
  inspired-by: https://github.com/rtk-ai/rtk
dependencies:
  - cost-tracking
allowed-tools: Read, Bash
---

# Token Savings Analytics

Combine RTK token savings data with cost-tracking to show real efficiency metrics: how many tokens were saved, how much money that saved, and what your effective cost-per-session is.

---

## 1. Core Principle

Cost tracking tells you what you SPENT. Token savings tells you what you DIDN'T spend. Together they give the full picture: actual cost, avoided cost, and efficiency ratio. Without savings tracking, you can't measure the ROI of caching, context pruning, or `.claudeignore` optimizations.

```
Spent: $1.23 (45K tokens)
Saved: $0.87 (32K tokens via cache + compression)
Efficiency: 41% savings → effective cost $1.23 instead of $2.10
```

---

## 2. RTK Integration

### Detection

Before using RTK data, check availability:

```bash
command -v rtk >/dev/null 2>&1 && echo "available" || echo "unavailable"
```

If RTK is not installed:
- Skip all RTK-specific metrics
- Show only standard cost-tracking data
- Suggest: "Install RTK (https://github.com/rtk-ai/rtk) for token savings analytics"

### Capturing RTK Gain Data

When RTK is available, capture savings data:

```bash
# Get savings for current session as JSON
rtk gain --format json

# Example output:
# {
#   "total_tokens_saved": 32400,
#   "cache_tokens_saved": 28000,
#   "compression_tokens_saved": 4400,
#   "sessions_analyzed": 1,
#   "period": "session",
#   "timestamp": "2025-12-15T14:30:00Z"
# }
```

```bash
# Get savings for today
rtk gain --period today --format json

# Get savings for this week
rtk gain --period week --format json
```

**If `rtk gain` returns an error or unexpected format**: Log the error, fall back to cost-tracking-only mode, do NOT crash.

---

## 3. Combined Metrics

### Per-Session Report

After a session, combine RTK gain with cost-tracking JSONL to produce:

```
Session Efficiency Report
─────────────────────────
Tokens used:     45,000
Tokens saved:    32,400  (RTK)
  ├─ Cache:      28,000
  └─ Compression: 4,400
Gross tokens:    77,400  (without optimizations)
Savings ratio:   41.9%

Cost incurred:   $1.23
Cost avoided:    $0.87
Effective rate:  $0.016 / 1K tokens (vs $0.026 gross)
```

### Calculations

```
gross_tokens     = tokens_used + tokens_saved
savings_ratio    = tokens_saved / gross_tokens * 100
cost_avoided     = tokens_saved * cost_per_token  # Use model-specific pricing
effective_rate   = cost_incurred / tokens_used * 1000
gross_rate       = (cost_incurred + cost_avoided) / gross_tokens * 1000
```

**Cost per token by model** (from cost-tracking pricing reference):

| Model | Input (per 1K) | Output (per 1K) |
|-------|----------------|-----------------|
| Opus | $0.015 | $0.075 |
| Sonnet | $0.003 | $0.015 |
| Haiku | $0.0008 | $0.004 |

For savings calculations, use the **input** rate (saved tokens are almost always input/cache tokens).

---

## 4. JSONL Extension

Extend the existing cost-tracking JSONL format with savings fields:

```json
{
  "timestamp": "2025-12-15T14:30:00Z",
  "session_id": "abc123",
  "project": "my-app",
  "model": "claude-sonnet-4-20250514",
  "tool": "claude-code",
  "input_tokens": 12000,
  "output_tokens": 4500,
  "cache_read_tokens": 8000,
  "cache_write_tokens": 3000,
  "cost_usd": 0.117,
  "task_type": "bugfix",
  "duration_seconds": 45,
  "rtk_available": true,
  "tokens_saved_total": 32400,
  "tokens_saved_cache": 28000,
  "tokens_saved_compression": 4400,
  "cost_avoided_usd": 0.087,
  "savings_ratio": 0.419
}
```

Fields `rtk_available` through `savings_ratio` are optional — only present when RTK is installed. Consumers MUST handle their absence gracefully.

---

## 5. Aggregation Commands

### Daily Savings Summary

```bash
# Today's savings (requires jq)
rtk gain --period today --format json | jq '{
  tokens_saved: .total_tokens_saved,
  cache_saved: .cache_tokens_saved,
  compression_saved: .compression_tokens_saved
}'
```

### Weekly Trend

```bash
# Combine with cost-tracking for full picture
echo "=== This Week ==="
echo "Spent:"
jq -rs "[.[] | select(.timestamp >= \"$(date -u -d '7 days ago' +%Y-%m-%dT00:00:00Z)\") | .cost_usd] | add // 0" .ai-costs/sessions.jsonl
echo "Saved:"
rtk gain --period week --format json | jq '.total_tokens_saved'
```

### Project Comparison

When multiple projects are tracked, compare efficiency:

```bash
# Savings ratio by project (from extended JSONL)
jq -rs '
  [.[] | select(.rtk_available == true)]
  | group_by(.project)
  | map({
      project: .[0].project,
      avg_savings: ([.[].savings_ratio] | add / length * 100),
      total_saved_usd: ([.[].cost_avoided_usd] | add)
    })
  | sort_by(.avg_savings) | reverse
' .ai-costs/sessions.jsonl
```

---

## 6. Graceful Degradation

| RTK Status | Behavior |
|------------|----------|
| Installed, working | Full savings analytics |
| Installed, erroring | Log error, show cost-only, suggest `rtk doctor` |
| Not installed | Cost-tracking only, one-time suggestion to install |
| JSON parse failure | Log raw output, fall back to cost-only |

**Never block** on RTK unavailability. Cost tracking works independently.

---

## 7. Integration Points

### With Cost Tracking Skill

Token savings extends cost-tracking, not replaces it. The cost-tracking skill's JSONL format gains optional fields. Reports gain a "Savings" section. Budget alerts can factor in savings for net cost.

### With Hot Cache

The hot cache can include a `session_cost` block with savings data:

```yaml
session_cost:
  total_usd: 1.23
  tokens_used: 45000
  tokens_saved: 32400
  savings_ratio: 0.419
```

### With Subagent Observability

When analyzing sub-agent metrics, savings data adds a dimension: which sub-agents benefited most from caching? This helps tune prompt caching strategies per agent type.

### With SDD Orchestrator

After `sdd-archive`, the orchestrator can report total savings for the entire change lifecycle:

```
Change "add-auth" completed:
  Total cost:    $4.56 across 12 sessions
  Total saved:   $2.34 (33.9% efficiency)
  Costliest phase: apply ($2.10)
  Most efficient:  verify (52% savings via cache)
```

---

## 8. Anti-Patterns

1. **Trusting RTK output blindly** — Validate JSON structure before parsing. RTK versions may change output format.
2. **Blocking on RTK errors** — Always graceful degradation. Cost tracking is the primary, RTK is the enhancement.
3. **Comparing savings across models** — $1 saved on Opus != $1 saved on Haiku. Always show model context.
4. **Optimizing for savings over productivity** — High savings ratio with slow completion is worse than low savings with fast delivery. Track both.
5. **Running RTK in CI** — RTK gain is for local development sessions. CI costs should be tracked separately.

> @reference references/rtk-reference.md — Load when implementing RTK CLI integration, parsing RTK JSON output, or troubleshooting RTK errors

---

## Quick Reference

| Metric | Formula | Target |
|--------|---------|--------|
| Savings ratio | saved / (used + saved) | > 30% |
| Cost avoided | saved_tokens * input_rate | — |
| Effective rate | cost / tokens_used * 1K | < gross_rate |
| ROI of optimization | cost_avoided / effort_to_optimize | > 5x |

```
RTK check:    command -v rtk >/dev/null 2>&1
RTK gain:     rtk gain --format json
RTK period:   rtk gain --period {today|week|month} --format json
Cost log:     .ai-costs/sessions.jsonl
```
