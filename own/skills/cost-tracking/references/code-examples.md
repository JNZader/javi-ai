# Cost Tracking — Code Examples

All bash/python scripts for cost logging, budget checking, and reporting.

> Load this file when implementing cost tracking infrastructure.

## Logging Script (log-ai-cost.sh)

Appends JSONL entries with model, tokens, calculated cost. Uses associative arrays for pricing lookup.

## Budget Checker (check-budget.sh)

Reads `.ai-config/cost-limits.yaml` for daily/weekly/monthly budgets. Calculates spend from `sessions.jsonl` using jq. Alerts at configurable thresholds (80% warning, 95% critical).

## Daily Report Generator (daily-cost-report.sh)

Generates report with: total spend, sessions count, spend by model, spend by project, most expensive session, cache efficiency ratio.

## Cost Calculator from Claude JSON (calc-claude-cost.sh)

Pipe Claude Code JSON output to calculate cost. Auto-detects model from output.

## Python Cost Aggregator

Loads sessions.jsonl, filters by date range (today/week/month/all), aggregates by model and project.

## Auto-Log Hook (post-session-cost.sh)

Automatically extracts usage from Claude Code JSON output and logs it after each session.

## Budget Config Format

```yaml
# .ai-config/cost-limits.yaml
budgets:
  daily: 10.00
  weekly: 50.00
  monthly: 200.00
  per_session: 2.00
alerts:
  threshold_warning: 0.80
  threshold_critical: 0.95
  action: warn  # warn | pause | block
```

## JSONL Log Entry Format

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
  "duration_seconds": 45
}
```

## Quick Shell Commands

```bash
# Today's total spend
jq -rs "[.[] | select(.timestamp | startswith(\"$(date -u +%Y-%m-%d)\")) | .cost_usd] | add // 0" .ai-costs/sessions.jsonl

# Most expensive model this month
jq -rs "[.[] | select(.timestamp | startswith(\"$(date -u +%Y-%m)\"))] | group_by(.model) | map({m:.[0].model, c:([.[].cost_usd]|add)}) | sort_by(.c) | reverse | .[0]" .ai-costs/sessions.jsonl

# Last 7 days total
jq -rs "[.[] | select(.timestamp >= \"$(date -u -d '7 days ago' +%Y-%m-%dT00:00:00Z)\") | .cost_usd] | add // 0" .ai-costs/sessions.jsonl
```

---

**Note**: The full implementation of each script was in the original monolithic SKILL.md. The scripts above are reference patterns; adapt to your specific tool and environment.
