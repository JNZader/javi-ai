# Cost Tracking — Token Pricing Reference (2025)

## Provider Pricing Table

| Provider  | Model             | Input $/1M | Output $/1M | Cache Read $/1M | Cache Write $/1M |
|-----------|-------------------|-----------|-------------|-----------------|------------------|
| Anthropic | Claude Opus 4     | $15.00    | $75.00      | $1.50           | $18.75           |
| Anthropic | Claude Sonnet 4   | $3.00     | $15.00      | $0.30           | $3.75            |
| Anthropic | Claude Haiku 3.5  | $0.80     | $4.00       | $0.08           | $1.00            |
| OpenAI    | GPT-4.1           | $2.00     | $8.00       | $0.50           | --               |
| OpenAI    | o4-mini           | $1.10     | $4.40       | $0.275          | --               |
| Google    | Gemini 2.5 Pro    | $1.25     | $10.00      | --              | --               |
| Alibaba   | Qwen3-Coder       | Free      | Free        | --              | --               |

> Prices change frequently. Update your config when rates change.

**Key observations:**
- Output tokens cost 3-5x more than input across all providers
- Cache reads are 90% cheaper than fresh input on Anthropic
- Free tiers (Qwen, Gemini free) have rate limits
- Opus is 5x Sonnet — use it only when it matters

## Cost Formula

```python
cost = (
    (input_tokens * input_price / 1_000_000) +
    (output_tokens * output_price / 1_000_000) +
    (cache_read_tokens * cache_read_price / 1_000_000) +
    (cache_write_tokens * cache_write_price / 1_000_000)
)
```

## Example Calculations

**Claude Sonnet 4** (12K in, 4.5K out, 8K cache read, 3K cache write):
```
Input:  12000 * 3.00 / 1M = $0.036
Output: 4500 * 15.00 / 1M = $0.068
Cache:  8000 * 0.30 / 1M  = $0.002
Write:  3000 * 3.75 / 1M  = $0.011
Total: $0.117
```

**Same tokens on Opus 4**: $0.586 (5x more)

## Task-to-Model Routing

| Task Type | Tier | Models | Rationale |
|-----------|------|--------|-----------|
| Formatting/linting | Cheapest | Haiku, Qwen | Deterministic, low risk |
| Variable renaming | Cheapest | Haiku, Qwen | Simple pattern matching |
| Boilerplate gen | Low-mid | Sonnet, GPT-4.1 | Needs context, predictable |
| Bug fixing | Mid | Sonnet, GPT-4.1 | Reasoning + code context |
| Architecture review | High | Opus, GPT-4.1 | Complex reasoning |
| Security audit | Highest | Opus | Must not miss vulnerabilities |

## Model Router Config

```yaml
# .ai-config/model-router.yaml
rules:
  - pattern: "format|lint|prettier|eslint"
    model: claude-haiku-3.5
  - pattern: "rename|refactor.*variable"
    model: claude-haiku-3.5
  - pattern: "fix|bug|error|debug"
    model: claude-sonnet-4
  - pattern: "architect|design|security|audit"
    model: claude-opus-4
  - pattern: "explain|question|how.*does"
    model: claude-sonnet-4
  default: claude-sonnet-4
```

## Monthly Savings from Tiering

```
All Opus:  100 sessions * $0.50 = $50/month
Tiered:    20 Opus ($10) + 50 Sonnet ($5) + 30 Haiku ($1.20) = $16.20/month
Savings:   $33.80/month (67%)
```
