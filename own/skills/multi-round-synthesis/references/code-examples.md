# Multi-Round Synthesis — Code Examples

## Claude Code — Task Tool Orchestration

```bash
# Pseudo-code: Coordinator logic in Claude Code

# ROUND 1 — Parallel delegation
Task(agent="react-specialist", prompt="""
  Context: User wants to build a real-time dashboard with WebSocket updates.
  Question: What's the best React architecture for real-time data?
  Constraints: Must handle 1000+ concurrent updates/second.
""")

Task(agent="backend-specialist", prompt="""
  Context: User wants to build a real-time dashboard with WebSocket updates.
  Question: What WebSocket server architecture handles 1000+ concurrent connections?
  Constraints: Must integrate with existing Express.js backend.
""")

# ROUND 1 — Review: React specialist suggested SSE, backend assumed WebSockets

# ROUND 2 — Follow-up
Task(agent="react-specialist", prompt="""
  Follow-up: You suggested SSE, but the backend specialist designed a WebSocket
  server. Can you adapt your React architecture to use WebSockets instead of SSE?
  Also explain the trade-offs between the two approaches.
""")

# ROUND 2 — Review: Now consistent. Synthesize.
```

---

## Full Coordinator Script (Python)

```python
# coordinator.py — Multi-round synthesis logic

import json
from dataclasses import dataclass, field


@dataclass
class AgentResponse:
    agent: str
    content: str
    round_num: int


@dataclass
class SynthesisState:
    user_question: str
    responses: list[AgentResponse] = field(default_factory=list)
    current_round: int = 0
    max_rounds: int = 3
    is_complete: bool = False
    synthesis: str = ""


def analyze_question(question: str) -> list[str]:
    """Determine which specialists to consult."""
    agents = []
    keywords_to_agents = {
        "react": "development-react-pro",
        "frontend": "development-react-pro",
        "component": "development-react-pro",
        "api": "development-backend-pro",
        "database": "development-backend-pro",
        "server": "development-backend-pro",
        "security": "quality-security-auditor",
        "auth": "quality-security-auditor",
        "vulnerability": "quality-security-auditor",
        "test": "quality-testing-engineer",
        "coverage": "quality-testing-engineer",
        "deploy": "infrastructure-devops-pro",
        "docker": "infrastructure-devops-pro",
        "kubernetes": "infrastructure-devops-pro",
        "architecture": "architecture-system-designer",
        "design": "architecture-system-designer",
        "scale": "architecture-system-designer",
    }
    question_lower = question.lower()
    for keyword, agent in keywords_to_agents.items():
        if keyword in question_lower and agent not in agents:
            agents.append(agent)
    return agents if agents else ["architecture-system-designer"]


def should_continue(state: SynthesisState) -> dict:
    """Decide if more rounds are needed."""
    if state.current_round >= state.max_rounds:
        return {"continue": False, "reason": "max_rounds_reached", "follow_ups": []}

    latest_responses = [r for r in state.responses if r.round_num == state.current_round]
    conflicts = detect_conflicts(latest_responses)
    if conflicts:
        return {
            "continue": True,
            "reason": "conflict_detected",
            "follow_ups": [
                {"agent": c["agent"], "question": f"Conflict with {c['other_agent']}: {c['description']}. Please provide evidence."}
                for c in conflicts
            ],
        }
    gaps = detect_gaps(state.user_question, latest_responses)
    if gaps:
        return {"continue": True, "reason": "gaps_detected", "follow_ups": gaps}
    return {"continue": False, "reason": "complete", "follow_ups": []}


def orchestrate(user_question: str) -> str:
    state = SynthesisState(user_question=user_question)
    agents = analyze_question(user_question)
    state.current_round = 1

    for agent in agents:
        response = delegate_to_agent(agent, user_question)
        state.responses.append(AgentResponse(agent=agent, content=response, round_num=1))

    while True:
        decision = should_continue(state)
        if not decision["continue"]:
            break
        state.current_round += 1
        for follow_up in decision["follow_ups"]:
            response = delegate_to_agent(follow_up["agent"], follow_up["question"])
            state.responses.append(AgentResponse(agent=follow_up["agent"], content=response, round_num=state.current_round))

    return synthesize(state)
```

---

## Synthesis Decision Function

```python
def decide_next_action(user_question, responses, current_round, max_rounds=3):
    """Core decision function for multi-round synthesis.
    Returns: {"action": "synthesize"} | {"action": "follow_up", "targets": [...]} | {"action": "escalate", "reason": "..."}
    """
    if current_round >= max_rounds:
        return {"action": "synthesize"}
    latest = [r for r in responses if r.round_num == current_round]
    if not latest:
        return {"action": "synthesize"}
    # Check conflicts
    for i, a in enumerate(latest):
        for b in latest[i + 1:]:
            if responses_conflict(a, b):
                return {"action": "follow_up", "targets": [
                    {"agent": a.agent, "question": f"Your recommendation conflicts with @{b.agent}. They said: '{b.content[:200]}...'. Can you address this?"},
                    {"agent": b.agent, "question": f"Your recommendation conflicts with @{a.agent}. They said: '{a.content[:200]}...'. Can you address this?"},
                ]}
    # Check gaps
    uncovered = find_uncovered_aspects(user_question, latest)
    if uncovered:
        return {"action": "follow_up", "targets": [{"agent": pick_best_agent_for(a, latest), "question": f"Your response didn't cover: {a}. Can you address this?"} for a in uncovered]}
    # Check shallow responses
    shallow = [r for r in latest if len(r.content) < 100]
    if shallow:
        return {"action": "follow_up", "targets": [{"agent": r.agent, "question": "Can you provide more detail?"} for r in shallow]}
    return {"action": "synthesize"}
```

---

## Example Multi-Round Conversation Transcript

```
USER: I need to add real-time notifications to our React app.
      Users should see alerts for new messages, system events,
      and admin broadcasts. We use Express.js on the backend
      and PostgreSQL for storage.

COORDINATOR (Round 1):
  @development-react-pro — Context: Adding real-time notifications. Question: React architecture for multiple notification types?
  @development-backend-pro — Context: Express.js + PostgreSQL. Question: Server architecture for real-time delivery?

REACT-PRO (Round 1): Recommend NotificationProvider + Zustand + WebSocket hook + Toast UI.
BACKEND-PRO (Round 1): Recommend SSE (simpler than WebSockets) + PostgreSQL LISTEN/NOTIFY + Redis Pub/Sub.

COORDINATOR (Review): Conflict — React-pro assumes WebSockets, Backend-pro recommends SSE.
  @development-react-pro — Follow-up: Backend recommends SSE. Can your architecture work with SSE?

REACT-PRO (Round 2): SSE works. Replace WebSocket hook with EventSource. Zustand stays. Caveat: need WebSockets later for read receipts.

COORDINATOR (Synthesis): Use SSE + PostgreSQL LISTEN/NOTIFY + Redis Pub/Sub. React EventSource + Zustand. Upgrade path to WebSockets if needed.
```

---

## OpenCode Orchestrator Configuration

```yaml
# .opencode/orchestrator.yaml
multi_round_synthesis:
  coordinator:
    model: anthropic/claude-sonnet-4-20250514
    max_rounds: 3
    parallel_delegation: true
    routing_rules:
      - pattern: "react|frontend|component|next.js"
        agent: development-react-pro
      - pattern: "api|backend|database|server"
        agent: development-backend-pro
      - pattern: "security|auth|vulnerability"
        agent: quality-security-auditor
      - pattern: "test|coverage|e2e"
        agent: quality-testing-engineer
      - pattern: "deploy|docker|kubernetes"
        agent: infrastructure-devops-pro
      - pattern: "architecture|design|pattern|scale"
        agent: architecture-system-designer
    synthesis_rules:
      min_confidence: 0.8
      conflict_resolution: evidence_based
      max_follow_ups_per_agent: 2
```

---

## OpenCode Tab Agent Configuration

```yaml
# .opencode/agents.yaml
orchestrator:
  name: multi-round-coordinator
  model: anthropic/claude-sonnet-4-20250514
  system_prompt: |
    You are a coordinator agent. Route questions to specialists via Tabs.
    Review responses and iterate until the answer is complete.
tabs:
  - name: react-specialist
    model: anthropic/claude-sonnet-4-20250514
    system_prompt: "You are a React/frontend specialist."
  - name: backend-specialist
    model: anthropic/claude-sonnet-4-20250514
    system_prompt: "You are a backend specialist."
  - name: security-specialist
    model: anthropic/claude-sonnet-4-20250514
    system_prompt: "You are a security specialist."
```

---

## Bash Coordinator Script

```bash
#!/usr/bin/env bash
# multi-round-coordinator.sh
MAX_ROUNDS=3
ROUND=0

# Round 1: Parallel delegation
ROUND=$((ROUND + 1))
echo "=== Round $ROUND: Initial delegation ==="
REACT_RESPONSE=$(task "react-specialist" "Context: Building real-time dashboard. Question: Best React architecture for WebSocket-driven updates?")
BACKEND_RESPONSE=$(task "backend-specialist" "Context: Building real-time dashboard. Question: WebSocket server architecture for 1000+ connections?")

# Review
NEEDS_FOLLOWUP=$(review_responses "$REACT_RESPONSE" "$BACKEND_RESPONSE")

# Round 2: Follow-up if needed
if [ "$NEEDS_FOLLOWUP" = "true" ] && [ $ROUND -lt $MAX_ROUNDS ]; then
  ROUND=$((ROUND + 1))
  REACT_FOLLOWUP=$(task "react-specialist" "Follow-up: Backend will use Socket.IO. Adapt your architecture.")
fi

# Final synthesis
synthesize "$REACT_RESPONSE" "$BACKEND_RESPONSE" "$REACT_FOLLOWUP"
```
