---
name: cost-tracking
description: >
  AI token usage and cost tracking patterns — per-session monitoring, budget alerts, model cost comparison, and optimization.
  Trigger: When tracking AI costs, setting usage budgets, comparing model costs, or optimizing token consumption.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

# Cost Tracking Skill

AI token usage and cost tracking patterns for per-session monitoring,
budget alerts, model cost comparison, and optimization.

---

## 1. Core Principle

AI API costs are invisible by default. Every token sent and received has a price,
but most tools hide this behind a monthly bill that arrives too late to act on.

**Without tracking, these problems compound:**

- Costs spiral as context windows grow across long sessions
- Cheap models end up doing expensive work (or vice versa)
- Cache opportunities are missed — you pay full price for repeated system prompts
- No visibility into which projects or tasks consume the most budget
- No way to compare whether switching models would save money

**Cost tracking gives you control:**

- See spend per session, per project, per day
- Compare models on a cost-per-task basis
- Set budget alerts before you blow past limits
- Optimize token usage through caching, pruning, and model tiering
- Make informed decisions about when to use expensive vs. cheap models

The goal is not to minimize cost at all costs — it is to maximize value per dollar.
Sometimes the expensive model saves hours of debugging. Sometimes the free model
handles the task perfectly. Tracking lets you know the difference.

---

## 2. Token Pricing Reference (2025)

| Provider  | Model             | Input $/1M | Output $/1M | Cache Read $/1M | Cache Write $/1M |
|-----------|-------------------|-----------|-------------|-----------------|------------------|
| Anthropic | Claude Opus 4     | $15.00    | $75.00      | $1.50           | $18.75           |
| Anthropic | Claude Sonnet 4   | $3.00     | $15.00      | $0.30           | $3.75            |
| Anthropic | Claude Haiku 3.5  | $0.80     | $4.00       | $0.08           | $1.00            |
| OpenAI    | GPT-4.1           | $2.00     | $8.00       | $0.50           | --               |
| OpenAI    | o4-mini           | $1.10     | $4.40       | $0.275          | --               |
| Google    | Gemini 2.5 Pro    | $1.25     | $10.00      | --              | --               |
| Alibaba   | Qwen3-Coder       | Free      | Free        | --              | --               |

> **Note**: Prices change frequently. The tracking pattern matters more than exact
> numbers. Update the pricing table in your config when rates change.

**Key observations:**

- Output tokens cost 3-5x more than input tokens across all providers
- Cache reads are 90% cheaper than fresh input on Anthropic
- Free tiers (Qwen, Gemini free) have rate limits — track those too
- Opus is 5x the cost of Sonnet — use it only when it matters

---

## 3. Cost Calculation

### Formula

```python
cost = (
    (input_tokens * input_price / 1_000_000) +
    (output_tokens * output_price / 1_000_000) +
    (cache_read_tokens * cache_read_price / 1_000_000) +
    (cache_write_tokens * cache_write_price / 1_000_000)
)
```

### Example: Claude Sonnet 4 Session

```
Input tokens:    12,000  -> 12000 * 3.00 / 1000000 = $0.036
Output tokens:    4,500  ->  4500 * 15.00 / 1000000 = $0.0675
Cache read:      8,000   ->  8000 * 0.30 / 1000000  = $0.0024
Cache write:     3,000   ->  3000 * 3.75 / 1000000  = $0.01125
                                              Total: $0.117
```

### Example: Claude Opus 4 Session (same tokens)

```
Input tokens:    12,000  -> 12000 * 15.00 / 1000000 = $0.18
Output tokens:    4,500  ->  4500 * 75.00 / 1000000 = $0.3375
Cache read:      8,000   ->  8000 * 1.50 / 1000000  = $0.012
Cache write:     3,000   ->  3000 * 18.75 / 1000000 = $0.05625
                                              Total: $0.586
```

The same session costs **5x more** on Opus vs Sonnet. This is why model selection
matters and why tracking makes the difference visible.

---

## 4. Per-Session Tracking

### Extracting Token Counts

**Claude Code** — Use `--output-format json` to get structured output:

```bash
claude --output-format json -p "your prompt" 2>/dev/null | \
  jq '{
    input: .usage.input_tokens,
    output: .usage.output_tokens,
    cache_read: .usage.cache_read_input_tokens,
    cache_write: .usage.cache_creation_input_tokens,
    model: .model
  }'
```

**OpenAI Codex** — Parse the `turn.completed` event from streaming output:

```bash
# Codex outputs usage in the turn completion event
# Extract from the JSON stream
jq -r 'select(.type == "turn.completed") | .usage' codex-output.json
```

**OpenCode** — Check `~/.opencode/usage.json` or parse session logs.

### Log Format

Store session costs in an append-only JSONL file:

```
.ai-costs/
  sessions.jsonl      # Append-only log of all sessions
  daily/              # Optional daily rollups
  reports/            # Generated reports
```

Each line in `sessions.jsonl`:

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

### Logging Script

```bash
#!/usr/bin/env bash
# log-ai-cost.sh — Append a cost entry to the session log
set -euo pipefail

COST_DIR="${AI_COST_DIR:-.ai-costs}"
COST_LOG="${COST_DIR}/sessions.jsonl"
mkdir -p "$COST_DIR"

# Arguments
MODEL="${1:?Usage: log-ai-cost.sh MODEL INPUT_TOKENS OUTPUT_TOKENS [CACHE_READ] [CACHE_WRITE]}"
INPUT_TOKENS="${2:?}"
OUTPUT_TOKENS="${3:?}"
CACHE_READ="${4:-0}"
CACHE_WRITE="${5:-0}"

# Pricing lookup (extend as needed)
declare -A INPUT_PRICES=(
  ["claude-opus-4"]="15.00"
  ["claude-sonnet-4"]="3.00"
  ["claude-haiku-3.5"]="0.80"
  ["gpt-4.1"]="2.00"
  ["o4-mini"]="1.10"
  ["gemini-2.5-pro"]="1.25"
  ["qwen3-coder"]="0.00"
)
declare -A OUTPUT_PRICES=(
  ["claude-opus-4"]="75.00"
  ["claude-sonnet-4"]="15.00"
  ["claude-haiku-3.5"]="4.00"
  ["gpt-4.1"]="8.00"
  ["o4-mini"]="4.40"
  ["gemini-2.5-pro"]="10.00"
  ["qwen3-coder"]="0.00"
)
declare -A CACHE_READ_PRICES=(
  ["claude-opus-4"]="1.50"
  ["claude-sonnet-4"]="0.30"
  ["claude-haiku-3.5"]="0.08"
  ["gpt-4.1"]="0.50"
  ["o4-mini"]="0.275"
)
declare -A CACHE_WRITE_PRICES=(
  ["claude-opus-4"]="18.75"
  ["claude-sonnet-4"]="3.75"
  ["claude-haiku-3.5"]="1.00"
)

# Calculate cost
IP="${INPUT_PRICES[$MODEL]:-0}"
OP="${OUTPUT_PRICES[$MODEL]:-0}"
CRP="${CACHE_READ_PRICES[$MODEL]:-0}"
CWP="${CACHE_WRITE_PRICES[$MODEL]:-0}"

COST=$(echo "scale=6; ($INPUT_TOKENS * $IP + $OUTPUT_TOKENS * $OP + $CACHE_READ * $CRP + $CACHE_WRITE * $CWP) / 1000000" | bc)

# Get project name from git or directory
PROJECT=$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")

# Append to log
jq -nc \
  --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg sid "$(uuidgen 2>/dev/null || echo $$-$(date +%s))" \
  --arg project "$PROJECT" \
  --arg model "$MODEL" \
  --argjson input "$INPUT_TOKENS" \
  --argjson output "$OUTPUT_TOKENS" \
  --argjson cache_read "$CACHE_READ" \
  --argjson cache_write "$CACHE_WRITE" \
  --argjson cost "$COST" \
  '{
    timestamp: $ts,
    session_id: $sid,
    project: $project,
    model: $model,
    input_tokens: $input,
    output_tokens: $output,
    cache_read_tokens: $cache_read,
    cache_write_tokens: $cache_write,
    cost_usd: ($cost | tonumber | . * 100 | round | . / 100)
  }' >> "$COST_LOG"

echo "Logged: \$${COST} (${MODEL}, ${INPUT_TOKENS}in/${OUTPUT_TOKENS}out)"
```

---

## 5. Budget Alerts

### Configuration

```yaml
# .ai-config/cost-limits.yaml
budgets:
  daily: 10.00        # USD per day
  weekly: 50.00       # USD per week
  monthly: 200.00     # USD per month
  per_session: 2.00   # Alert if a single session exceeds this

alerts:
  threshold_warning: 0.80   # Alert at 80% of budget
  threshold_critical: 0.95  # Hard alert at 95%
  action: warn              # warn | pause | block

notifications:
  terminal: true       # Print to terminal
  file: .ai-costs/alerts.log
  # webhook: https://hooks.slack.com/...  # Optional
```

### Budget Checker Script

```bash
#!/usr/bin/env bash
# check-budget.sh — Check current spend against budgets
set -euo pipefail

COST_LOG="${AI_COST_DIR:-.ai-costs}/sessions.jsonl"
CONFIG="${AI_CONFIG_DIR:-.ai-config}/cost-limits.yaml"

if [[ ! -f "$COST_LOG" ]]; then
  echo "No cost data found at $COST_LOG"
  exit 0
fi

# Parse budgets (requires yq)
DAILY_BUDGET=$(yq '.budgets.daily // 10' "$CONFIG" 2>/dev/null || echo "10")
WEEKLY_BUDGET=$(yq '.budgets.weekly // 50' "$CONFIG" 2>/dev/null || echo "50")
MONTHLY_BUDGET=$(yq '.budgets.monthly // 200' "$CONFIG" 2>/dev/null || echo "200")
WARNING_THRESHOLD=$(yq '.alerts.threshold_warning // 0.80' "$CONFIG" 2>/dev/null || echo "0.80")

# Calculate today's spend
TODAY=$(date -u +%Y-%m-%d)
DAILY_SPEND=$(jq -rs "[.[] | select(.timestamp | startswith(\"$TODAY\")) | .cost_usd] | add // 0" "$COST_LOG")

# Calculate this week's spend (Monday-based)
WEEK_START=$(date -u -d "last monday" +%Y-%m-%d 2>/dev/null || date -u -v-monday +%Y-%m-%d 2>/dev/null || echo "$TODAY")
WEEKLY_SPEND=$(jq -rs "[.[] | select(.timestamp >= \"${WEEK_START}T00:00:00Z\") | .cost_usd] | add // 0" "$COST_LOG")

# Calculate this month's spend
MONTH_START=$(date -u +%Y-%m-01)
MONTHLY_SPEND=$(jq -rs "[.[] | select(.timestamp >= \"${MONTH_START}T00:00:00Z\") | .cost_usd] | add // 0" "$COST_LOG")

# Display status
echo "=== AI Cost Budget Status ==="
printf "  Daily:   \$%.2f / \$%.2f (%.0f%%)\n" "$DAILY_SPEND" "$DAILY_BUDGET" \
  "$(echo "$DAILY_SPEND / $DAILY_BUDGET * 100" | bc -l 2>/dev/null || echo 0)"
printf "  Weekly:  \$%.2f / \$%.2f (%.0f%%)\n" "$WEEKLY_SPEND" "$WEEKLY_BUDGET" \
  "$(echo "$WEEKLY_SPEND / $WEEKLY_BUDGET * 100" | bc -l 2>/dev/null || echo 0)"
printf "  Monthly: \$%.2f / \$%.2f (%.0f%%)\n" "$MONTHLY_SPEND" "$MONTHLY_BUDGET" \
  "$(echo "$MONTHLY_SPEND / $MONTHLY_BUDGET * 100" | bc -l 2>/dev/null || echo 0)"

# Check thresholds
check_threshold() {
  local label="$1" spend="$2" budget="$3"
  local ratio
  ratio=$(echo "scale=4; $spend / $budget" | bc -l 2>/dev/null || echo "0")
  if (( $(echo "$ratio >= 0.95" | bc -l) )); then
    echo "CRITICAL: $label spend at ${ratio}x of budget!"
    return 2
  elif (( $(echo "$ratio >= $WARNING_THRESHOLD" | bc -l) )); then
    echo "WARNING: $label spend at ${ratio}x of budget"
    return 1
  fi
  return 0
}

check_threshold "Daily" "$DAILY_SPEND" "$DAILY_BUDGET"
check_threshold "Weekly" "$WEEKLY_SPEND" "$WEEKLY_BUDGET"
check_threshold "Monthly" "$MONTHLY_SPEND" "$MONTHLY_BUDGET"
```

---

## 6. Model Selection by Cost

### Task-to-Model Routing

Not every task needs the most powerful (expensive) model. Match the task to the
model that provides sufficient quality at the lowest cost.

| Task Type            | Recommended Tier | Example Models            | Rationale                       |
|----------------------|-----------------|---------------------------|---------------------------------|
| Formatting / linting | Cheapest        | Haiku, Qwen free, o4-mini | Deterministic tasks, low risk   |
| Variable renaming    | Cheapest        | Haiku, Qwen free          | Simple pattern matching         |
| Boilerplate gen      | Low-mid         | Sonnet, GPT-4.1           | Needs context but predictable   |
| Bug fixing           | Mid             | Sonnet, GPT-4.1           | Needs reasoning + code context  |
| Architecture review  | High            | Opus, GPT-4.1             | Complex reasoning, high stakes  |
| Security audit       | Highest         | Opus                      | Must not miss vulnerabilities   |
| Exploration / Q&A    | Low-mid         | Sonnet, Gemini Pro        | Conversational, moderate depth  |

### Cost-Aware Model Router

```yaml
# .ai-config/model-router.yaml
rules:
  - pattern: "format|lint|prettier|eslint"
    model: claude-haiku-3.5
    reason: "Formatting is mechanical — cheapest model suffices"

  - pattern: "rename|refactor.*variable|extract.*method"
    model: claude-haiku-3.5
    reason: "Simple refactoring is pattern-based"

  - pattern: "fix|bug|error|debug"
    model: claude-sonnet-4
    reason: "Bug fixing needs reasoning but not max intelligence"

  - pattern: "architect|design|security|audit|review"
    model: claude-opus-4
    reason: "High-stakes decisions need the best model"

  - pattern: "explain|question|what.*is|how.*does"
    model: claude-sonnet-4
    reason: "Q&A is well-served by mid-tier models"

  default: claude-sonnet-4
```

### Cache-Optimized Routing

Maximize cache hits to reduce effective input costs:

- Keep a stable system prompt across sessions (cache it once, reuse 90% cheaper)
- Front-load project context in the system prompt so it gets cached
- Avoid reshuffling message order — caching is prefix-based on Anthropic
- For repeated tasks (e.g., reviewing 10 files), batch them in one session
  to amortize the system prompt cost

---

## 7. Cost Optimization Strategies

### 7.1 Prompt Caching

Anthropic offers prompt caching with significant discounts:
- Cache write: 25% more than standard input
- Cache read: **90% cheaper** than standard input
- Breakeven: If a prompt is reused 2+ times, caching saves money

**How to leverage caching:**
- Use a stable, detailed CLAUDE.md / system prompt (gets cached automatically)
- Avoid changing the system prompt between sessions
- Put frequently-referenced context (project rules, API schemas) at the start

### 7.2 Context Pruning

Every token in the context window costs money. Keep it lean:

- Use `.claudeignore` or `.opencodeignore` to exclude irrelevant files
- Summarize long conversations instead of keeping full history
- Avoid pasting entire files when a snippet suffices
- Remove debug output and logs from context before asking follow-ups

**Impact example:**
```
Before pruning: 50,000 input tokens * $3.00/1M = $0.15 per turn
After pruning:  15,000 input tokens * $3.00/1M = $0.045 per turn
Savings: 70% on input costs
```

### 7.3 Model Tiering

Route tasks to the cheapest model that handles them well:

```
Opus ($15/$75)  -->  Only for: architecture, security, complex bugs
Sonnet ($3/$15) -->  Default for: most coding tasks
Haiku ($0.80/$4) -> For: formatting, simple edits, boilerplate
Free (Qwen)     -->  For: local exploration, drafts, throwaway tasks
```

Monthly savings from tiering (hypothetical 100 sessions/month):
```
All Opus:    100 sessions * $0.50 avg = $50/month
Tiered:      20 Opus ($10) + 50 Sonnet ($5) + 30 Haiku ($1.20) = $16.20/month
Savings:     $33.80/month (67%)
```

### 7.4 Batch Operations

Combine related requests to amortize the system prompt cost:

```
Bad:  5 separate sessions to fix 5 similar bugs
      = 5x system prompt + 5x project context = 5x input cost

Good: 1 session to fix all 5 bugs
      = 1x system prompt + 1x project context + incremental turns
      = ~1.5x input cost
```

### 7.5 Local Models for Routine Tasks

Use Ollama or Qwen free tier for tasks that don't need frontier models:

- Code formatting and linting suggestions
- Generating boilerplate (tests, CRUD endpoints)
- Documentation drafts
- Quick explanations of code

Free tier costs: $0.00 (but watch rate limits and quality tradeoffs)

---

## 8. Reporting

### Daily Cost Report Generator

```bash
#!/usr/bin/env bash
# daily-cost-report.sh — Generate a daily cost report
set -euo pipefail

COST_LOG="${AI_COST_DIR:-.ai-costs}/sessions.jsonl"
REPORT_DIR="${AI_COST_DIR:-.ai-costs}/reports"
mkdir -p "$REPORT_DIR"

DATE="${1:-$(date -u +%Y-%m-%d)}"
REPORT_FILE="${REPORT_DIR}/report-${DATE}.txt"

if [[ ! -f "$COST_LOG" ]]; then
  echo "No cost data found."
  exit 0
fi

{
  echo "========================================"
  echo "  AI Cost Report: $DATE"
  echo "========================================"
  echo ""

  # Total spend for the day
  TOTAL=$(jq -rs "[.[] | select(.timestamp | startswith(\"$DATE\")) | .cost_usd] | add // 0" "$COST_LOG")
  SESSIONS=$(jq -rs "[.[] | select(.timestamp | startswith(\"$DATE\"))] | length" "$COST_LOG")
  printf "Total spend:    \$%.2f\n" "$TOTAL"
  printf "Total sessions: %d\n" "$SESSIONS"
  echo ""

  # Spend per model
  echo "--- By Model ---"
  jq -rs "
    [.[] | select(.timestamp | startswith(\"$DATE\"))]
    | group_by(.model)
    | .[]
    | {
        model: .[0].model,
        sessions: length,
        cost: ([.[].cost_usd] | add),
        input: ([.[].input_tokens] | add),
        output: ([.[].output_tokens] | add)
      }
  " "$COST_LOG" | jq -r '
    "  \(.model): $\(.cost | . * 100 | round | . / 100) (\(.sessions) sessions, \(.input)in/\(.output)out)"
  '
  echo ""

  # Spend per project
  echo "--- By Project ---"
  jq -rs "
    [.[] | select(.timestamp | startswith(\"$DATE\"))]
    | group_by(.project)
    | .[]
    | {project: .[0].project, cost: ([.[].cost_usd] | add), sessions: length}
  " "$COST_LOG" | jq -r '
    "  \(.project): $\(.cost | . * 100 | round | . / 100) (\(.sessions) sessions)"
  '
  echo ""

  # Most expensive session
  echo "--- Most Expensive Session ---"
  jq -rs "
    [.[] | select(.timestamp | startswith(\"$DATE\"))]
    | sort_by(.cost_usd) | reverse | .[0] // empty
  " "$COST_LOG" | jq -r '
    "  \(.session_id): $\(.cost_usd) (\(.model), \(.input_tokens)in/\(.output_tokens)out)"
  '
  echo ""

  # Cache efficiency
  echo "--- Cache Efficiency ---"
  jq -rs "
    [.[] | select(.timestamp | startswith(\"$DATE\"))]
    | {
        total_input: ([.[].input_tokens] | add // 0),
        total_cache_read: ([.[].cache_read_tokens] | add // 0)
      }
    | .cache_ratio = (if .total_input > 0 then (.total_cache_read / (.total_input + .total_cache_read) * 100) else 0 end)
  " "$COST_LOG" | jq -r '
    "  Cache hit ratio: \(.cache_ratio | . * 10 | round | . / 10)%"
  '

} | tee "$REPORT_FILE"

echo ""
echo "Report saved to: $REPORT_FILE"
```

### Weekly Summary (One-Liner)

```bash
# Last 7 days total spend
jq -rs "[.[] | select(.timestamp >= \"$(date -u -d '7 days ago' +%Y-%m-%dT00:00:00Z)\") | .cost_usd] | add // 0" .ai-costs/sessions.jsonl
```

### Monthly Model Comparison

```bash
# Cost per model this month
MONTH=$(date -u +%Y-%m)
jq -rs "
  [.[] | select(.timestamp | startswith(\"$MONTH\"))]
  | group_by(.model)
  | map({model: .[0].model, total: ([.[].cost_usd] | add), sessions: length})
  | sort_by(.total) | reverse
  | .[] | \"\(.model): \$\(.total | . * 100 | round | . / 100) across \(.sessions) sessions\"
" .ai-costs/sessions.jsonl
```

---

## 9. Integration with Framework

### 9.1 Model Router Hook

The `model-router` hook can use accumulated cost data to adjust model selection:

```bash
# In model-router hook — check if daily budget is running low
DAILY_SPEND=$(jq -rs "
  [.[] | select(.timestamp | startswith(\"$(date -u +%Y-%m-%d)\")) | .cost_usd]
  | add // 0
" .ai-costs/sessions.jsonl)

DAILY_BUDGET=10.00
RATIO=$(echo "scale=4; $DAILY_SPEND / $DAILY_BUDGET" | bc -l)

if (( $(echo "$RATIO > 0.80" | bc -l) )); then
  # Budget running low — downgrade to cheaper model
  echo "Budget at ${RATIO}x — routing to Haiku" >&2
  echo "claude-haiku-3.5"
elif (( $(echo "$RATIO > 0.50" | bc -l) )); then
  # Budget half spent — use Sonnet
  echo "claude-sonnet-4"
else
  # Budget healthy — use requested model
  echo "$REQUESTED_MODEL"
fi
```

### 9.2 Learning Log Integration

Record cost decisions in the learning log for future reference:

```json
{
  "timestamp": "2025-12-15T14:30:00Z",
  "type": "cost-decision",
  "context": "Downgraded from Opus to Sonnet for test generation",
  "outcome": "Tests were identical quality, saved $0.42",
  "lesson": "Test generation does not benefit from Opus — always use Sonnet"
}
```

### 9.3 GGA (Guardian Angel) Integration

Add cost awareness to the Guardian review process:

```yaml
# In GGA config
checks:
  cost_check:
    enabled: true
    warn_if_session_exceeds: 2.00
    warn_if_model_overkill: true
    suggest_cheaper_model: true
    message: "This session cost ${cost}. Consider using ${cheaper_model} for similar tasks."
```

### 9.4 Session Memory — Cumulative Project Costs

Track total project costs in session memory:

```json
{
  "project": "my-app",
  "lifetime_cost_usd": 47.23,
  "session_count": 142,
  "avg_cost_per_session": 0.33,
  "most_used_model": "claude-sonnet-4",
  "last_updated": "2025-12-15T14:30:00Z"
}
```

### 9.5 Cross-Tool Comparison

Track costs across different AI coding tools:

```
Tool           | Avg Session Cost | Sessions/Day | Daily Cost
---------------|-----------------|--------------|----------
Claude Code    | $0.35           | 8            | $2.80
OpenCode       | $0.30           | 5            | $1.50
Codex CLI      | $0.20           | 3            | $0.60
Qwen (free)    | $0.00           | 4            | $0.00
                                    Total Daily: | $4.90
```

Use this to decide which tool gives best value for which task type.

---

## 10. Code Examples

### 10.1 Bash Cost Calculator from Claude JSON Output

```bash
#!/usr/bin/env bash
# calc-claude-cost.sh — Calculate cost from Claude Code JSON output
# Usage: claude --output-format json -p "prompt" | calc-claude-cost.sh

set -euo pipefail

INPUT=$(cat)

MODEL=$(echo "$INPUT" | jq -r '.model // "claude-sonnet-4"')
INPUT_TOKENS=$(echo "$INPUT" | jq -r '.usage.input_tokens // 0')
OUTPUT_TOKENS=$(echo "$INPUT" | jq -r '.usage.output_tokens // 0')
CACHE_READ=$(echo "$INPUT" | jq -r '.usage.cache_read_input_tokens // 0')
CACHE_WRITE=$(echo "$INPUT" | jq -r '.usage.cache_creation_input_tokens // 0')

# Determine prices based on model
case "$MODEL" in
  *opus*)   IP=15.00; OP=75.00; CRP=1.50;  CWP=18.75 ;;
  *sonnet*) IP=3.00;  OP=15.00; CRP=0.30;  CWP=3.75  ;;
  *haiku*)  IP=0.80;  OP=4.00;  CRP=0.08;  CWP=1.00  ;;
  *gpt-4*)  IP=2.00;  OP=8.00;  CRP=0.50;  CWP=0     ;;
  *o4*)     IP=1.10;  OP=4.40;  CRP=0.275; CWP=0     ;;
  *)        IP=3.00;  OP=15.00; CRP=0.30;  CWP=3.75  ;;
esac

COST=$(echo "scale=6; ($INPUT_TOKENS * $IP + $OUTPUT_TOKENS * $OP + $CACHE_READ * $CRP + $CACHE_WRITE * $CWP) / 1000000" | bc)

printf "Model:       %s\n" "$MODEL"
printf "Input:       %s tokens (\$%.4f)\n" "$INPUT_TOKENS" "$(echo "$INPUT_TOKENS * $IP / 1000000" | bc -l)"
printf "Output:      %s tokens (\$%.4f)\n" "$OUTPUT_TOKENS" "$(echo "$OUTPUT_TOKENS * $OP / 1000000" | bc -l)"
printf "Cache read:  %s tokens (\$%.4f)\n" "$CACHE_READ" "$(echo "$CACHE_READ * $CRP / 1000000" | bc -l)"
printf "Cache write: %s tokens (\$%.4f)\n" "$CACHE_WRITE" "$(echo "$CACHE_WRITE * $CWP / 1000000" | bc -l)"
printf "Total cost:  \$%.4f\n" "$COST"
```

### 10.2 Python Cost Aggregator

```python
#!/usr/bin/env python3
"""Aggregate costs from sessions.jsonl and print summary."""

import json
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

COST_LOG = Path(".ai-costs/sessions.jsonl")


def load_sessions(path: Path) -> list[dict]:
    """Load all session entries from JSONL file."""
    if not path.exists():
        return []
    sessions = []
    with path.open() as f:
        for line in f:
            line = line.strip()
            if line:
                sessions.append(json.loads(line))
    return sessions


def filter_by_date(sessions: list[dict], since: datetime) -> list[dict]:
    """Filter sessions to those after the given datetime."""
    since_str = since.isoformat()
    return [s for s in sessions if s.get("timestamp", "") >= since_str]


def aggregate(sessions: list[dict]) -> dict:
    """Aggregate session data into a summary."""
    by_model = defaultdict(lambda: {"cost": 0.0, "sessions": 0, "input": 0, "output": 0})
    by_project = defaultdict(lambda: {"cost": 0.0, "sessions": 0})
    total_cost = 0.0

    for s in sessions:
        cost = s.get("cost_usd", 0.0)
        model = s.get("model", "unknown")
        project = s.get("project", "unknown")
        total_cost += cost

        by_model[model]["cost"] += cost
        by_model[model]["sessions"] += 1
        by_model[model]["input"] += s.get("input_tokens", 0)
        by_model[model]["output"] += s.get("output_tokens", 0)

        by_project[project]["cost"] += cost
        by_project[project]["sessions"] += 1

    return {
        "total_cost": total_cost,
        "total_sessions": len(sessions),
        "by_model": dict(by_model),
        "by_project": dict(by_project),
    }


def main():
    period = sys.argv[1] if len(sys.argv) > 1 else "today"
    now = datetime.now(timezone.utc)

    if period == "today":
        since = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        since = now - timedelta(days=7)
    elif period == "month":
        since = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "all":
        since = datetime.min.replace(tzinfo=timezone.utc)
    else:
        since = datetime.fromisoformat(period).replace(tzinfo=timezone.utc)

    sessions = load_sessions(COST_LOG)
    filtered = filter_by_date(sessions, since)
    summary = aggregate(filtered)

    print(f"\n=== AI Cost Summary ({period}) ===")
    print(f"Total: ${summary['total_cost']:.2f} across {summary['total_sessions']} sessions\n")

    print("By Model:")
    for model, data in sorted(summary["by_model"].items(), key=lambda x: -x[1]["cost"]):
        print(f"  {model}: ${data['cost']:.2f} ({data['sessions']} sessions)")

    print("\nBy Project:")
    for project, data in sorted(summary["by_project"].items(), key=lambda x: -x[1]["cost"]):
        print(f"  {project}: ${data['cost']:.2f} ({data['sessions']} sessions)")


if __name__ == "__main__":
    main()
```

### 10.3 Hook: Auto-Log Costs After Each Session

```bash
#!/usr/bin/env bash
# hooks/post-session-cost.sh
# Automatically log costs after each AI session completes
# Place in .claude/hooks/ or equivalent for your tool

set -euo pipefail

# Read the session output (piped or from file)
SESSION_OUTPUT="${1:-/dev/stdin}"

# Extract token usage (Claude Code format)
if command -v jq &>/dev/null; then
  USAGE=$(jq -r '.usage // empty' "$SESSION_OUTPUT" 2>/dev/null)
  if [[ -n "$USAGE" ]]; then
    MODEL=$(jq -r '.model // "unknown"' "$SESSION_OUTPUT")
    INPUT=$(echo "$USAGE" | jq -r '.input_tokens // 0')
    OUTPUT=$(echo "$USAGE" | jq -r '.output_tokens // 0')
    CACHE_READ=$(echo "$USAGE" | jq -r '.cache_read_input_tokens // 0')
    CACHE_WRITE=$(echo "$USAGE" | jq -r '.cache_creation_input_tokens // 0')

    # Normalize model name for pricing lookup
    SHORT_MODEL=$(echo "$MODEL" | sed -E 's/claude-([a-z]+)-([0-9]).*/claude-\1-\2/')

    # Log it
    bash log-ai-cost.sh "$SHORT_MODEL" "$INPUT" "$OUTPUT" "$CACHE_READ" "$CACHE_WRITE"
  fi
fi
```

---

## 11. Anti-Patterns

### Don't track without acting

Collecting cost data that nobody looks at is waste. Set up alerts, review weekly
reports, and adjust model routing based on what you learn. If tracking doesn't
change behavior, it's just overhead.

### Don't use expensive models for everything

Opus at $15/$75 per million tokens is 18x more expensive than Haiku at $0.80/$4.
If you use Opus for formatting code, you are burning money. Reserve expensive
models for tasks that genuinely need their capabilities.

### Don't ignore cache opportunities

On Anthropic, cache reads are 90% cheaper than fresh input. If you're sending
the same system prompt and project context repeatedly without caching, you're
paying 10x what you should for that portion of the input. Structure your prompts
to maximize cache prefix hits.

### Don't forget free tier limits

Qwen3-Coder is free via OAuth, but it has rate limits. If your workflow depends
on high throughput, the free tier will bottleneck you. Track rate limit hits
alongside costs so you can see the full picture.

### Don't store prompts in cost logs

The cost log should contain tokens, model, timestamp, and cost. Never store the
actual prompt content or responses — that creates a security risk if the log is
shared or backed up. Token counts are sufficient for cost tracking.

### Don't optimize prematurely

If your total monthly AI spend is $20, spending hours building a cost tracking
system is not economical. Start tracking when costs reach a level where
optimization would save meaningful money (e.g., > $50/month).

### Don't compare raw costs without considering productivity

A $2 Opus session that solves a bug in 1 minute is cheaper than a $0.05 Haiku
session that takes 30 minutes of back-and-forth. Factor in your time when
evaluating model cost-effectiveness.

---

## 12. Quick Reference

### File Structure

```
.ai-costs/
  sessions.jsonl          # Append-only session cost log
  alerts.log              # Budget alert history
  reports/
    report-YYYY-MM-DD.txt # Daily reports
  daily/                  # Optional daily rollups

.ai-config/
  cost-limits.yaml        # Budget configuration
  model-router.yaml       # Cost-aware model routing rules
```

### Common Commands

```bash
# Log a cost entry
bash log-ai-cost.sh claude-sonnet-4 12000 4500 8000 3000

# Check budget status
bash check-budget.sh

# Generate daily report
bash daily-cost-report.sh

# Quick: today's total spend
jq -rs "[.[] | select(.timestamp | startswith(\"$(date -u +%Y-%m-%d)\")) | .cost_usd] | add // 0" .ai-costs/sessions.jsonl

# Quick: most expensive model this month
jq -rs "[.[] | select(.timestamp | startswith(\"$(date -u +%Y-%m)\"))] | group_by(.model) | map({m:.[0].model, c:([.[].cost_usd]|add)}) | sort_by(.c) | reverse | .[0]" .ai-costs/sessions.jsonl

# Quick: total sessions today
jq -rs "[.[] | select(.timestamp | startswith(\"$(date -u +%Y-%m-%d)\"))] | length" .ai-costs/sessions.jsonl
```

### Key Metrics to Track

| Metric              | Formula                                        | Target          |
|---------------------|------------------------------------------------|-----------------|
| Daily spend         | Sum of cost_usd for today                      | < $10           |
| Cost per session    | Daily spend / session count                    | < $0.50         |
| Cache hit ratio     | cache_read / (input + cache_read) * 100        | > 60%           |
| Model efficiency    | Task quality / cost                            | Maximize        |
| Budget utilization  | Monthly spend / monthly budget                 | 50-80%          |
| Ops per dollar      | Sessions / daily spend                         | Maximize        |

---

*Cost tracking is a practice, not a product. Start simple with a JSONL log and
a budget check script. Add complexity (reports, routing, alerts) only as your
AI usage grows. The best cost tracking system is the one you actually use.*
