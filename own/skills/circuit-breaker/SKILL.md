---
name: circuit-breaker
description: >
  Runtime safety protocol for detecting and killing runaway SDD sub-agents. Monitors token consumption, tool calls, duration, and consecutive failures.
  Trigger: When configuring sub-agent safety, discussing runaway agents, or user mentions circuit breaker, runaway, agent limits.
metadata:
  author: javi-ai
  version: "1.0"
  tags: [safety, circuit-breaker, sub-agents, orchestration]
  category: safety
  inspired-by: https://github.com/SethGammon/Citadel
dependencies:
  - sdd-apply
allowed-tools: Read, Bash
---

## Purpose

Detect and kill runaway sub-agents before they burn tokens, loop infinitely, or spam failing tool calls. The orchestrator embeds these rules in sub-agent prompts and monitors signals between calls.

---

## Detection Signals

| Signal | What It Detects | Observable By |
|--------|----------------|---------------|
| **Token consumption** | Agent burning context on low-value work | Orchestrator (track cumulative tokens) |
| **Tool call count** | Agent in a retry/exploration loop | Orchestrator (count tool invocations) |
| **Wall-clock duration** | Agent stuck or excessively slow | Orchestrator (timestamp at launch) |
| **Consecutive failures** | Agent repeating a broken action | Orchestrator (track sequential errors) |

### Red Flag Combinations

| Pattern | Severity | Meaning |
|---------|----------|---------|
| High tokens + low tool calls | Medium | Agent writing verbose output, not looping |
| High tool calls + high failures | Critical | Agent in a broken retry loop |
| Max duration + low progress | High | Agent stuck or blocked |
| 3+ consecutive identical tool calls | High | Infinite loop detected |

---

## Configuration

```yaml
# In openspec/config.yaml or project config
circuit-breaker:
  enabled: true
  defaults:
    max_tokens_per_agent: 100000
    max_tool_calls: 50
    max_duration_minutes: 15
    max_consecutive_failures: 5
  phases:
    explore:
      max_duration_minutes: 10
      max_tool_calls: 30
    propose:
      max_tokens_per_agent: 50000
      max_tool_calls: 20
    spec:
      max_tokens_per_agent: 50000
      max_tool_calls: 20
    design:
      max_tokens_per_agent: 80000
      max_tool_calls: 40
    apply:
      max_tokens_per_agent: 200000
      max_tool_calls: 100
      max_duration_minutes: 20
    verify:
      max_tokens_per_agent: 80000
      max_tool_calls: 40
```

### Threshold Resolution

```
1. Check phases.{current-phase}.{signal} → use if defined
2. Fallback to defaults.{signal}
3. If no config exists → use hardcoded defaults (values above)
```

---

## Kill Protocol

When ANY threshold is exceeded:

```
1. STOP — Do not send another prompt to the sub-agent
2. LOG — Record: agent name, phase, trigger signal, threshold vs actual value
3. REPORT — Show structured kill report to user (format below)
4. DO NOT auto-restart — User must review and decide
```

### Kill Report Format

```markdown
## Circuit Breaker Triggered

**Agent**: {phase} sub-agent for {change-name}
**Signal**: {token_consumption | tool_calls | duration | consecutive_failures}
**Threshold**: {configured limit}
**Actual**: {measured value}
**Phase**: {sdd phase name}

### What Happened
{Brief description of what the agent was doing when killed}

### Suggested Actions
- [ ] Review the agent's last output for errors
- [ ] Check if the task is too large — consider splitting
- [ ] Adjust threshold in config if the limit is too aggressive
- [ ] Re-run the phase with `/sdd-apply` (or relevant command)
```

---

## Orchestrator Integration

### Embedding in Sub-Agent Prompts

Add this block to every sub-agent launch prompt:

```
CIRCUIT BREAKER (active):
You are being monitored. If you detect yourself in any of these states, STOP and return immediately:
- You have made >5 consecutive failing tool calls
- You are repeating the same action with no progress
- You have been running for an unusually long time
Self-report with: CIRCUIT_BREAKER: {signal} — {description}
```

### Monitoring Between Calls

The orchestrator tracks these counters per sub-agent:

```
agent_metrics = {
  tokens_consumed: 0,      # cumulative from API response
  tool_calls: 0,           # increment per tool invocation
  start_time: timestamp,   # set at launch
  consecutive_failures: 0, # reset on success, increment on failure
}
```

After each sub-agent response, check:

```
IF agent_metrics.tokens_consumed > threshold.max_tokens_per_agent → KILL
IF agent_metrics.tool_calls > threshold.max_tool_calls → KILL
IF now() - agent_metrics.start_time > threshold.max_duration_minutes → KILL
IF agent_metrics.consecutive_failures > threshold.max_consecutive_failures → KILL
ELSE → continue
```

---

## Relationship to Agent Governance

| Aspect | Agent Governance | Circuit Breaker |
|--------|-----------------|-----------------|
| **When** | Before execution (policy check) | During execution (runtime monitoring) |
| **What** | Allowed tools, paths, commands | Token burn, loops, failures |
| **How** | Declarative capability YAML | Threshold monitoring + kill |
| **Scope** | All agents, all contexts | SDD sub-agents specifically |

They are complementary: governance sets what an agent CAN do, circuit breaker stops agents that ARE doing too much.

---

## Rules

1. **Kill is non-negotiable** — when a threshold is hit, stop immediately
2. **Never auto-restart** — human reviews the kill report first
3. **Self-reporting is a bonus** — agents SHOULD self-detect, but the orchestrator is the enforcer
4. **Per-phase thresholds** — apply phase needs more room than propose; configure accordingly
5. **Conservative defaults** — better to kill a healthy agent than let a rogue one burn tokens
6. **Log everything** — every kill is auditable with signal, threshold, and actual values
7. **Consecutive failure counter resets on success** — one good call resets the streak
