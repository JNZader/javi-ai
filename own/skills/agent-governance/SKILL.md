---
name: agent-governance
description: >
  Declarative agent capability model with privilege rings, kill switches, and behavioral anomaly detection.
  Trigger: When configuring agent permissions, setting up safety guardrails, discussing agent trust, or user mentions governance, capabilities, permissions.
metadata:
  author: javi-ai
  version: "1.0"
  tags: [governance, security, safety, permissions]
  category: safety
allowed-tools: Read, Write, Edit, Bash
---

## Purpose

Define and enforce what agents can and cannot do through declarative capability models, privilege tiers, and anomaly detection. Non-blocking governance (<0.1ms policy evaluation).

---

## Capability Model

Every agent operates under a capability declaration:

```yaml
# agent-capabilities.yaml
agent: development
capabilities:
  allowed_tools:
    - Read
    - Write
    - Edit
    - Bash
    - Glob
    - Grep
  denied_tools:
    - WebFetch  # no internet access
  constraints:
    max_files_per_session: 20
    max_tokens_per_call: 50000
    allowed_paths:
      - src/
      - tests/
      - docs/
    denied_paths:
      - .env*
      - secrets/
      - ~/.ssh/
    allowed_commands:
      - npm test
      - npm run build
      - git status
      - git diff
    denied_commands:
      - rm -rf
      - git push --force
      - npm publish
```

### Enforcement

1. **Pre-execution check**: Before any tool use, validate against capabilities
2. **Fail-closed**: If capability file is missing or corrupt, deny all
3. **Audit log**: Every denied action is logged with reason

---

## 4-Tier Privilege Rings

Inspired by OS privilege rings, from most to least privileged:

| Ring | Name | Can Do | Use Case |
|------|------|--------|----------|
| **Ring 0** | Supervisor | Everything, override policies | User-initiated emergency actions |
| **Ring 1** | Orchestrator | Spawn agents, read all, write config | Domain orchestrators |
| **Ring 2** | Worker | Read/write project files, run tests | Task execution agents |
| **Ring 3** | Observer | Read only, no writes, no commands | Code review, analysis agents |

### Ring Assignment

```yaml
rings:
  ring-0:
    agents: [user-direct]
    note: "Only the user operates at ring 0"
  ring-1:
    agents: [orchestrator, sdd-orchestrator]
    inherits: [ring-2]
  ring-2:
    agents: [development, infrastructure, data-ai]
    inherits: [ring-3]
  ring-3:
    agents: [quality, code-reviewer, analyst]
```

### Ring Escalation

An agent can request Ring escalation:
1. Agent outputs `ESCALATION_REQUEST: [reason]`
2. User approves or denies
3. If approved, temporary ring upgrade for current task only
4. Reverts to original ring after task completion

---

## Behavioral Anomaly Detection

### Red Flags

| Signal | Severity | Action |
|--------|----------|--------|
| Agent tries to access denied path | Medium | Block + log |
| Agent runs >5 denied commands in a session | High | Kill switch |
| Agent tries to modify its own capability file | Critical | Immediate kill |
| Agent tries to disable hooks/guardrails | Critical | Immediate kill |
| Unusual file access patterns (reading many unrelated files) | Low | Log + alert |
| Agent spawns >10 sub-agents | Medium | Rate limit |

### Kill Switch

When triggered:
1. **Immediately stop** the current agent
2. **Log the trigger** with full context
3. **Notify the user** with explanation
4. **Do NOT auto-restart** — user must review and re-authorize

---

## Policy Evaluation

Policies are evaluated as a fast-path check:

```
1. Check denied_tools → BLOCK (immediate)
2. Check denied_paths → BLOCK (immediate)  
3. Check denied_commands → BLOCK (immediate)
4. Check allowed_tools → if not listed, BLOCK
5. Check constraints → if exceeded, BLOCK
6. ALLOW
```

Target: <0.1ms per evaluation (no I/O, no LLM calls).

---

## Pre-Commit Policy Hook

Add to `.git/hooks/pre-commit`:

```bash
# Check that no agent-capabilities.yaml was modified by an agent
if git diff --cached --name-only | grep -q 'agent-capabilities.yaml'; then
  echo "ERROR: Agent capability files must be modified by humans only"
  exit 1
fi
```

---

## Rules

1. **Fail-closed** — if uncertain, deny
2. **Humans set policies, agents follow them** — agents never modify their own capabilities
3. **Log everything** — every deny is auditable
4. **Ring 0 is human-only** — no agent should ever operate at Ring 0
5. **Kill switch is non-negotiable** — critical anomalies trigger immediate stop
6. **Policies are fast** — <0.1ms evaluation, no blocking operations
