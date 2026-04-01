---
name: multi-round-synthesis
description: >
  Multi-round agent orchestration — coordinator delegates to specialists, synthesizes, and iterates until the answer is complete.
  Trigger: When orchestrating multiple agents, implementing group chat patterns, or building multi-step delegation workflows.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.1"
---

# Multi-Round Synthesis

Coordinator-driven orchestration where a central agent delegates to specialists across multiple rounds, reviews responses, resolves conflicts, and synthesizes a final answer.

---

## 1. Core Principle

Single-round delegation misses cross-domain insight, conflict detection, depth, and coherence. Multi-round synthesis fixes this:

1. **Delegates** to specialists (in parallel when possible)
2. **Reviews** responses for completeness, correctness, conflicts
3. **Asks follow-ups** when incomplete or contradictory
4. **Iterates** until satisfied (max 3 rounds)
5. **Synthesizes** a single, coherent final answer

**Termination signal**: Response with NO @mentions = final answer to user.

---

## 2. The Multi-Round Pattern

```
User question
     │
     ▼
COORDINATOR (Round 0) — Analyzes, decides specialists
     │
     ▼
ROUND 1 — Parallel delegation → Agents return responses
     │
     ▼
REVIEW — Gaps? Conflicts? Incomplete?
     │          │
     No         Yes → ROUND 2 (targeted follow-ups) → REVIEW
     │                                                    │
     ▼                                                    ▼
SYNTHESIS — Integrated, coherent answer to user
```

---

## 3. Coordinator Prompt Design

### Initial Routing Prompt

The coordinator analyzes the question, routes to specialists via @mentions with FULL context, or answers directly for simple single-domain questions.

### Synthesis Prompt (After Responses)

The coordinator checks: completeness, consistency, gaps, depth. Then either:
- **(a)** All good → synthesize WITHOUT @mentions (= done)
- **(b)** Incomplete → @mention agents with follow-ups
- **(c)** Conflict → @mention both agents, request evidence

**Synthesis format**: Summary → Details → Recommendations → Trade-offs

**Critical rules**: Never synthesize prematurely. Never exceed 3 rounds. Always integrate, don't concatenate. No @mentions = final answer.

---

## 4. When to Use Multi-Round vs Single-Round

| Use Multi-Round | Use Single-Round |
|----------------|-----------------|
| Cross-domain questions | Simple, single-domain |
| Architecture decisions | Quick code review |
| Bug investigation | Documentation update |
| Security audit | Simple refactoring |
| New feature design | Low complexity tasks |

**Heuristic**: 2+ domains OR trade-off analysis → multi-round. 1 domain AND straightforward → single-round or direct answer.

---

## 5. Mention-Based Routing

@mentions control routing and termination:
- **Single @mention** → one agent invoked
- **Multiple @mentions** → parallel execution
- **No @mentions** → terminal (answer to user)

All communication flows through coordinator (hub-and-spoke). Agents NEVER communicate directly.

---

## 6. Conflict Resolution

```
1. IDENTIFY the disagreement
2. REQUEST evidence from each agent
3. EVALUATE: which fits constraints better? Which has stronger justification?
4. DECIDE and DOCUMENT: chosen approach + rejected approach + rationale
```

| Category | Resolution Strategy |
|----------|-------------------|
| Technology choice | Compare against requirements |
| Architecture pattern | Evaluate team size, scale |
| Implementation | Benchmark, consider maintainability |
| Priority | Defer to user's stated priorities |

When balanced: present both options with pros/cons, make recommendation, note alternative is viable.

---

## 7. Anti-Patterns

1. **Too many rounds** — Hard cap at 3. After that, synthesize with caveats.
2. **Delegating simple questions** — If coordinator knows with high confidence, answer directly.
3. **Agents talking to each other** — All communication through coordinator.
4. **Missing context in delegations** — Always include original question, constraints, other agents' input.
5. **Premature synthesis** — Only synthesize when all checks pass.
6. **Judging by length** — Evaluate substance, not volume.

> @reference references/code-examples.md — Load when implementing the orchestration pattern (Python coordinator, bash scripts, OpenCode config, conversation transcript examples)

> @reference references/integration.md — Load when combining with adversarial-review or integrating with domain orchestrators

---

## Quick Reference

| Concept | Key Point |
|---------|-----------|
| Routing | @mentions control agent invocation |
| Termination | No @mentions = done |
| Max rounds | 3 (hard cap) |
| Conflict resolution | Evidence-based, coordinator decides |
| Direct answers | Simple questions skip delegation |
| Context | Full context in every delegation |
| Communication | Hub-and-spoke through coordinator |
