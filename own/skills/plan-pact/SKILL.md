---
name: plan-pact
description: >
  Cross-agent negotiation protocol for planning documents with Decision Register, Decision Log, and dispute tracking.
  Trigger: When multiple agents collaborate on planning, when planning docs need formal tracking, or when user says "plan-pact", "negotiate", "decision register".
metadata:
  author: javi-ai
  version: "1.0"
  tags: [planning, negotiation, multi-agent, collaboration]
  category: workflow
allowed-tools: Read, Write, Edit, Task
---

## Purpose

Structured protocol for cross-agent planning where multiple agents (or sequential agent sessions) contribute to a planning document. Ensures decisions are tracked, disputes are visible, and the plan converges.

---

## When to Activate

- Multiple agents working on the same planning document
- Sequential sessions that need to build on prior decisions
- Complex planning where decisions need formal tracking
- User requests "decision register" or "plan-pact" protocol
- Multi-session SDD changes where context resets between sessions

---

## Plan-Pact Document Structure

Every Plan-Pact document has this structure:

```markdown
---
pact-version: 1
status: active | resolved | archived
participants: [agent-1, agent-2, user]
activated: 2026-03-17
---

# Plan-Pact: [Topic]

## Decision Register (Current State)
<!-- Always reflects the LATEST agreed state -->

| ID | Decision | Status | Owner | Date |
|----|----------|--------|-------|------|
| D-001 | Use PostgreSQL for persistence | agreed | agent-1 | 2026-03-17 |
| D-002 | JWT for auth (not sessions) | agreed | user | 2026-03-17 |
| D-003 | Monorepo vs multi-repo | disputed | - | 2026-03-17 |

## Decision Log (Append-Only History)
<!-- Never edit, only append -->

### 2026-03-17T10:00 — agent-1
- PROPOSED D-001: Use PostgreSQL for persistence
  Rationale: Team has PostgreSQL expertise, JSONB for flexible schemas
- PROPOSED D-003: Use monorepo with turborepo
  Rationale: Shared types, atomic deploys

### 2026-03-17T10:15 — agent-2
- AGREED D-001: PostgreSQL confirmed
- DISPUTED D-003: Multi-repo preferred
  Counter: Independent deploy cycles, team autonomy
  Evidence: Last monorepo caused CI bottlenecks

### 2026-03-17T10:30 — user
- PROPOSED D-002: JWT for auth
- RESOLVED D-003: Multi-repo wins
  Reasoning: User agrees with agent-2's CI concern

## Disputes
<!-- Active disputes with arguments from each side -->

### D-003: Monorepo vs Multi-repo (RESOLVED)
**For monorepo** (agent-1): Shared types, atomic deploys
**For multi-repo** (agent-2): Independent deploys, no CI bottleneck
**Resolution**: Multi-repo — user decision based on CI evidence

## Context
<!-- Shared context all participants should know -->

[Relevant background information]
```

---

## Protocol Rules

### Activation
Plan-Pact activates when:
1. User explicitly requests it
2. Two or more agents disagree on a planning decision
3. A planning document spans multiple sessions

### Decision States
- **proposed** — Someone suggested it, not yet agreed
- **agreed** — All participants accept
- **disputed** — At least one participant disagrees
- **resolved** — Dispute settled with reasoning
- **withdrawn** — Proposer retracted

### Append-Only Log
The Decision Log is **NEVER edited**. Only append new entries. This creates an audit trail.

### Decision Register
The Decision Register is the **current truth**. Update it when decisions move states.

### Dispute Resolution
1. Each side presents evidence (not just opinions)
2. User breaks ties when agents can't converge
3. Resolution must include reasoning (for future reference)

---

## Resumable Notes Format

When a Plan-Pact session is interrupted (compaction, context reset):

```
## Session State

### COMPLETED
- D-001: PostgreSQL agreed
- D-002: JWT agreed

### IN_PROGRESS
- D-003: Monorepo vs multi-repo — disputed, awaiting user input

### NEXT
- Decide on API style (REST vs GraphQL)
- Define deployment pipeline

### BLOCKERS
- D-003 blocks deployment pipeline design
```

Save this to Engram before any context reset.

---

## Rules

1. **Never edit the Decision Log** — append only
2. **Always include evidence** — "I prefer X" is not evidence
3. **User breaks ties** — agents don't override user decisions
4. **Save state on interruption** — use Engram mem_session_summary
5. **One decision per ID** — don't combine unrelated decisions
