# Token Savings — RTK Reference

> Load when implementing RTK CLI integration, parsing RTK JSON output, or troubleshooting RTK errors.

## RTK CLI Overview

RTK (https://github.com/rtk-ai/rtk) is a token optimization toolkit that tracks savings from caching, compression, and context pruning across AI coding sessions.

### Installation

```bash
# Via npm
npm install -g rtk-ai

# Via brew (if available)
brew install rtk-ai/tap/rtk

# Verify
rtk --version
```

### Key Commands

| Command | Description |
|---------|-------------|
| `rtk gain` | Show token savings for current/last session |
| `rtk gain --format json` | Machine-readable savings output |
| `rtk gain --period today` | Aggregate savings for today |
| `rtk gain --period week` | Aggregate savings for this week |
| `rtk gain --period month` | Aggregate savings for this month |
| `rtk doctor` | Diagnose RTK installation issues |
| `rtk config` | Show current RTK configuration |

## JSON Output Schema

```typescript
interface RTKGainOutput {
  total_tokens_saved: number;        // All savings combined
  cache_tokens_saved: number;        // Savings from prompt caching
  compression_tokens_saved: number;  // Savings from context compression
  sessions_analyzed: number;         // How many sessions contribute
  period: string;                    // "session" | "today" | "week" | "month"
  timestamp: string;                 // ISO 8601
}
```

### Parsing Safely

```bash
# Safe parse with fallback
RTK_OUTPUT=$(rtk gain --format json 2>/dev/null)
if [[ $? -eq 0 ]] && echo "$RTK_OUTPUT" | jq -e '.total_tokens_saved' >/dev/null 2>&1; then
  TOKENS_SAVED=$(echo "$RTK_OUTPUT" | jq '.total_tokens_saved')
  CACHE_SAVED=$(echo "$RTK_OUTPUT" | jq '.cache_tokens_saved')
  COMPRESSION_SAVED=$(echo "$RTK_OUTPUT" | jq '.compression_tokens_saved')
else
  echo "RTK unavailable or output malformed, skipping savings data"
  TOKENS_SAVED=0
  CACHE_SAVED=0
  COMPRESSION_SAVED=0
fi
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `command not found: rtk` | Not installed or not in PATH | Install via npm/brew, check PATH |
| `rtk gain` returns empty JSON | No sessions tracked yet | Run at least one AI session first |
| `total_tokens_saved: 0` | Caching/compression disabled | Check `rtk config`, enable optimizations |
| JSON parse error | RTK version mismatch | Update RTK: `npm update -g rtk-ai` |
| Permission denied | Global install issue | Fix npm permissions or use npx |

## Combining with jq for Reports

```bash
# Full efficiency report combining RTK + cost-tracking
COST=$(jq -rs "[.[] | select(.timestamp | startswith(\"$(date -u +%Y-%m-%d)\")) | .cost_usd] | add // 0" .ai-costs/sessions.jsonl)
SAVED_JSON=$(rtk gain --period today --format json 2>/dev/null || echo '{"total_tokens_saved":0}')
SAVED_TOKENS=$(echo "$SAVED_JSON" | jq '.total_tokens_saved // 0')

echo "Today's Report:"
echo "  Spent: \$${COST}"
echo "  Tokens saved: ${SAVED_TOKENS}"
echo "  Estimated savings: \$$(echo "$SAVED_TOKENS * 0.003 / 1000" | bc -l | xargs printf '%.2f')"
```

## Version Compatibility

This skill targets RTK v1.x JSON output. If RTK changes its output schema:
1. Check `rtk --version` to detect version
2. Adapt parsing logic per version
3. Log a warning if output doesn't match expected schema
4. Never crash — always fall back to cost-only mode
