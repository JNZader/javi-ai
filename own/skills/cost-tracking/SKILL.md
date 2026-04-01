---
name: cost-tracking
description: >
  AI token usage and cost tracking patterns — per-session monitoring, budget alerts, model cost comparison, and optimization.
  Trigger: When tracking AI costs, setting usage budgets, comparing model costs, or optimizing token consumption.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.1"
---

# Cost Tracking

AI token usage and cost tracking for per-session monitoring, budget alerts, and optimization.

---

## 1. Core Principle

AI API costs are invisible by default. Without tracking: costs spiral, cache opportunities are missed, expensive models do cheap work, and no visibility into which projects consume the most budget.

**Goal**: Maximize value per dollar, not minimize cost.

---

## 2. Cost Optimization Strategies

### Prompt Caching
- Cache reads are **90% cheaper** on Anthropic
- Keep a stable system prompt (gets cached automatically)
- Put frequently-referenced context at the start (prefix-based caching)
- Breakeven: prompt reused 2+ times

### Context Pruning
- Use `.claudeignore` to exclude irrelevant files
- Summarize long conversations instead of full history
- Before: 50K tokens ($0.15/turn) → After: 15K tokens ($0.045/turn) = **70% savings**

### Model Tiering
```
Opus ($15/$75)  → Only for: architecture, security, complex bugs
Sonnet ($3/$15) → Default for: most coding tasks
Haiku ($0.80/$4) → For: formatting, simple edits, boilerplate
Free (Qwen)    → For: local exploration, drafts, throwaway
```

### Batch Operations
1 session for 5 bugs = ~1.5x cost. 5 separate sessions = 5x cost.

---

## 3. Per-Session Tracking

Store costs in append-only JSONL:

```
.ai-costs/
  sessions.jsonl      # All sessions
  reports/            # Generated reports
```

Extract tokens from Claude Code: `claude --output-format json -p "prompt" | jq '.usage'`

---

## 4. Budget Alerts

Configure in `.ai-config/cost-limits.yaml`:
- Daily/weekly/monthly budgets
- Warning at 80%, critical at 95%
- Actions: warn, pause, or block

---

## 5. Framework Integration

- **Model Router Hook**: Downgrade model when budget runs low (80%+ → Haiku, 50%+ → Sonnet)
- **Learning Log**: Record cost decisions and outcomes
- **Session Memory**: Track cumulative project costs
- **Cross-Tool Comparison**: Compare cost-effectiveness across Claude Code, OpenCode, Codex

---

## 6. Anti-Patterns

1. **Track without acting** — If tracking doesn't change behavior, it's overhead
2. **Expensive models for everything** — Opus for formatting is burning money
3. **Ignore cache opportunities** — 90% savings missed on repeated system prompts
4. **Forget free tier limits** — Rate limits bottleneck workflows
5. **Store prompts in cost logs** — Security risk. Token counts suffice
6. **Optimize prematurely** — Start tracking at >$50/month
7. **Compare raw costs without productivity** — $2 Opus in 1min > $0.05 Haiku in 30min

> @reference references/pricing-reference.md — Load when checking token prices, calculating costs, or configuring model routing rules

> @reference references/code-examples.md — Load when implementing cost logging scripts, budget checkers, report generators, or auto-log hooks

---

## Quick Reference

| Metric | Formula | Target |
|--------|---------|--------|
| Daily spend | Sum cost_usd for today | < $10 |
| Cost per session | Daily / sessions | < $0.50 |
| Cache hit ratio | cache_read / (input + cache_read) | > 60% |
| Budget utilization | Monthly spend / budget | 50-80% |

```
.ai-costs/sessions.jsonl    # Cost log
.ai-config/cost-limits.yaml # Budget config
.ai-config/model-router.yaml # Model routing
```
