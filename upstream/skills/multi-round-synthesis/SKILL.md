---
name: multi-round-synthesis
description: >
  Multi-round agent orchestration — coordinator delegates to specialists, synthesizes, and iterates until the answer is complete.
  Trigger: When orchestrating multiple agents, implementing group chat patterns, or building multi-step delegation workflows.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

# Multi-Round Synthesis

Coordinator-driven orchestration pattern where a central agent delegates to specialists
across multiple rounds, reviews responses, asks follow-ups, resolves conflicts, and
synthesizes a final answer only when the user's question is fully addressed.

---

## 1. Core Principle

Single-round delegation — "ask agent, get answer, done" — misses nuance every time.

When you ask one specialist a question and immediately return the answer to the user,
you lose:

- **Cross-domain insight**: The React specialist doesn't know what the security auditor
  would flag. The database expert doesn't know what the DevOps engineer needs.
- **Conflict detection**: Two specialists may give contradictory advice. Without a
  coordinator comparing their responses, the user gets whichever answer came last.
- **Depth**: A first-pass answer is rarely the best answer. Follow-up questions expose
  gaps, challenge assumptions, and force precision.
- **Coherence**: Multiple specialist responses stapled together don't form a coherent
  answer. Synthesis requires deliberate integration.

Multi-round synthesis fixes all of this. A coordinator agent:

1. **Delegates** to the right specialists (in parallel when possible)
2. **Reviews** their responses for completeness, correctness, and conflicts
3. **Asks follow-up questions** when something is unclear, incomplete, or contradictory
4. **Iterates** until satisfied that the user's question is fully addressed
5. **Synthesizes** a single, coherent final answer

This is inspired by Maestro's Group Chat moderator pattern and adapted for
CLI-based AI coding agents (Claude Code, OpenCode, Qwen Code).

### Why This Produces Better Results

```
Single-round:  User → Coordinator → Agent-A → User
               Quality: whatever Agent-A produces on first try

Multi-round:   User → Coordinator → Agent-A + Agent-B (parallel)
               Coordinator reviews → "Agent-A, clarify X"
               Coordinator reviews → synthesizes → User
               Quality: refined, cross-checked, coherent
```

The coordinator acts as an editorial layer. It doesn't just route — it thinks.

---

## 2. The Multi-Round Pattern

### Flow Diagram

```
User question arrives
       │
       ▼
┌─────────────┐
│ COORDINATOR  │  Analyzes the question
│  (Round 0)   │  Decides which specialists to consult
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│          ROUND 1 — Delegation       │
│                                     │
│  Coordinator → @Agent-A  (parallel) │
│  Coordinator → @Agent-B  (parallel) │
│                                     │
│  Both agents return responses       │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│        ROUND 1 — Review             │
│                                     │
│  Coordinator reads both responses   │
│  Identifies:                        │
│    - Gaps in Agent-A's answer       │
│    - Conflict between A and B       │
│    - Missing context from Agent-B   │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│         ROUND 2 — Follow-up         │
│                                     │
│  Coordinator → @Agent-A             │
│    "You said X, but Agent-B says Y. │
│     Can you provide evidence?"      │
│                                     │
│  Agent-A returns refined response   │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│         ROUND 2 — Review            │
│                                     │
│  Coordinator is now satisfied       │
│  All perspectives covered           │
│  Conflict resolved with evidence    │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│            FINAL — Synthesis        │
│                                     │
│  Coordinator produces coherent      │
│  answer integrating all inputs      │
│  NO @mentions = conversation done   │
└─────────────────────────────────────┘
```

### The Key Insight

**The coordinator decides when to stop.** The presence or absence of @mentions in the
coordinator's response signals whether the conversation continues:

- **Response contains @mentions** → another round begins, those agents are invoked
- **Response contains NO @mentions** → the coordinator is done, answer goes to the user

This is the same mechanism Maestro uses in its Group Chat pattern. The coordinator is
the only entity that decides routing and termination.

---

## 3. Coordinator Prompt Design

The coordinator needs two distinct system prompts that govern its behavior in different
phases of the conversation.

### 3.1 Base Prompt (Initial Routing)

```markdown
You are a coordinator agent. Your job is to route user questions to the right
specialist agents and synthesize their responses into a complete answer.

## Routing Rules

- Analyze the user's question to determine which domains are involved
- For simple, single-domain questions: answer directly WITHOUT delegating
- For complex or cross-domain questions: delegate to specialists via @mentions
- Always include FULL context when delegating — the specialist has no prior context
- You may @mention multiple specialists in a single message for parallel execution

## Available Specialists

- @development-react-pro — React, Next.js, frontend architecture
- @development-backend-pro — APIs, databases, server-side logic
- @quality-security-auditor — Security vulnerabilities, auth, data protection
- @quality-testing-engineer — Test strategies, coverage, test architecture
- @infrastructure-devops-pro — CI/CD, Docker, Kubernetes, deployment
- @architecture-system-designer — System design, patterns, trade-offs

## Delegation Format

When delegating, structure your message as:

@agent-name

**Context**: [full background the specialist needs]
**Question**: [specific question for this specialist]
**Constraints**: [any relevant constraints or requirements]

## Direct Answer Criteria

Answer directly (no delegation) when:
- The question is simple and single-domain
- You have high confidence in the answer
- Delegation overhead exceeds the value of specialist input
```

### 3.2 Synthesis Prompt (After Receiving Responses)

```markdown
You have received responses from specialist agents. Your job is to decide the
next action and, when ready, synthesize a final answer.

## Decision Process

1. Read ALL agent responses carefully
2. Check for:
   - Completeness: Does each response fully address what was asked?
   - Consistency: Do responses conflict with each other?
   - Gaps: Is anything missing that the user needs?
   - Depth: Are responses superficial or thorough?

3. Based on your assessment:

   (a) If ALL answers are complete, consistent, and thorough:
       → Synthesize a final answer WITHOUT any @mentions
       → Integrate insights from all specialists into a coherent response
       → Highlight key points from each domain

   (b) If answers are INCOMPLETE or you need clarification:
       → @mention the specific agent(s) with follow-up questions
       → Include what they said and what you need clarified

   (c) If answers CONFLICT:
       → @mention both agents, describe the conflict
       → Ask each to provide evidence or reasoning
       → You will resolve the conflict in the next review round

## Synthesis Format

When synthesizing (no @mentions), structure as:

### Summary
[1-2 sentence answer to the user's original question]

### Details
[Integrated analysis from all specialist responses]

### Recommendations
[Concrete next steps or decisions]

### Trade-offs
[If applicable — what was considered and why certain approaches were chosen]

## Critical Rules

- NEVER synthesize prematurely — wait until you are confident the answer is complete
- NEVER exceed 3 rounds of delegation — if still incomplete, synthesize with caveats
- ALWAYS integrate, don't just concatenate agent responses
- Response with NO @mentions = final answer to user
```

---

## 4. Implementation Patterns

### 4.1 Claude Code — Task Tool Orchestration

Claude Code's Task tool launches sub-agents that run independently and return results.
This maps naturally to the multi-round pattern.

```bash
# Pseudo-code: Coordinator logic in Claude Code

# ROUND 1 — Parallel delegation
# The coordinator sends two Task calls in a single message:

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

# ROUND 1 — Review
# Coordinator reads both responses, identifies that the React specialist
# suggested Server-Sent Events while the backend specialist assumed WebSockets.

# ROUND 2 — Follow-up
Task(agent="react-specialist", prompt="""
  Follow-up: You suggested SSE, but the backend specialist designed a WebSocket
  server. Can you adapt your React architecture to use WebSockets instead of SSE?
  Also explain the trade-offs between the two approaches.
""")

# ROUND 2 — Review
# Coordinator now has consistent, complete responses from both specialists.

# FINAL — Synthesis
# Coordinator produces integrated answer (no more Task calls).
```

### 4.2 Claude Code — Full Coordinator Script

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
    """Decide if more rounds are needed.

    Returns:
        dict with keys:
          - "continue": bool
          - "reason": str
          - "follow_ups": list of {"agent": str, "question": str}
    """
    if state.current_round >= state.max_rounds:
        return {
            "continue": False,
            "reason": "max_rounds_reached",
            "follow_ups": [],
        }

    latest_responses = [
        r for r in state.responses if r.round_num == state.current_round
    ]

    # Check for conflicts between responses
    conflicts = detect_conflicts(latest_responses)
    if conflicts:
        return {
            "continue": True,
            "reason": "conflict_detected",
            "follow_ups": [
                {
                    "agent": c["agent"],
                    "question": f"Conflict with {c['other_agent']}: {c['description']}. "
                                f"Please provide evidence for your position.",
                }
                for c in conflicts
            ],
        }

    # Check for gaps
    gaps = detect_gaps(state.user_question, latest_responses)
    if gaps:
        return {
            "continue": True,
            "reason": "gaps_detected",
            "follow_ups": gaps,
        }

    return {"continue": False, "reason": "complete", "follow_ups": []}


def detect_conflicts(responses: list[AgentResponse]) -> list[dict]:
    """Identify conflicting recommendations between agent responses."""
    conflicts = []
    for i, resp_a in enumerate(responses):
        for resp_b in responses[i + 1 :]:
            # In practice, this uses semantic analysis or keyword matching
            # to detect contradictory statements
            if has_contradiction(resp_a.content, resp_b.content):
                conflicts.append({
                    "agent": resp_a.agent,
                    "other_agent": resp_b.agent,
                    "description": summarize_contradiction(
                        resp_a.content, resp_b.content
                    ),
                })
    return conflicts


def detect_gaps(question: str, responses: list[AgentResponse]) -> list[dict]:
    """Identify aspects of the question not covered by any response."""
    # In practice, this compares the question's requirements against
    # the content of all responses to find uncovered topics
    return []


def has_contradiction(content_a: str, content_b: str) -> bool:
    """Check if two responses contain contradictory recommendations."""
    # Semantic analysis placeholder
    return False


def summarize_contradiction(content_a: str, content_b: str) -> str:
    """Describe the contradiction between two responses."""
    return ""


def synthesize(state: SynthesisState) -> str:
    """Produce the final integrated answer."""
    all_responses = state.responses
    agents_consulted = list({r.agent for r in all_responses})
    rounds_taken = state.current_round

    synthesis = f"## Synthesis\n\n"
    synthesis += f"Consulted {len(agents_consulted)} specialists "
    synthesis += f"over {rounds_taken} round(s).\n\n"

    for agent in agents_consulted:
        agent_responses = [r for r in all_responses if r.agent == agent]
        synthesis += f"### From @{agent}\n\n"
        for r in agent_responses:
            synthesis += f"**Round {r.round_num}**: {r.content}\n\n"

    synthesis += "### Integrated Recommendation\n\n"
    synthesis += "[Coordinator integrates all insights here]\n"

    return synthesis


# --- Main orchestration loop ---

def orchestrate(user_question: str) -> str:
    state = SynthesisState(user_question=user_question)

    # Round 0: Analyze and delegate
    agents = analyze_question(user_question)
    state.current_round = 1

    # Delegate to agents (parallel)
    for agent in agents:
        response = delegate_to_agent(agent, user_question)
        state.responses.append(
            AgentResponse(agent=agent, content=response, round_num=1)
        )

    # Review loop
    while True:
        decision = should_continue(state)
        if not decision["continue"]:
            break

        state.current_round += 1
        for follow_up in decision["follow_ups"]:
            response = delegate_to_agent(
                follow_up["agent"], follow_up["question"]
            )
            state.responses.append(
                AgentResponse(
                    agent=follow_up["agent"],
                    content=response,
                    round_num=state.current_round,
                )
            )

    return synthesize(state)


def delegate_to_agent(agent: str, question: str) -> str:
    """Send a question to a specialist agent and return its response."""
    # In Claude Code, this maps to the Task tool
    # In OpenCode, this maps to a Tab agent invocation
    raise NotImplementedError("Platform-specific implementation")
```

### 4.3 OpenCode — Tab Agent Orchestration

In OpenCode, Tab agents serve as specialists. The orchestrator runs in the main
conversation and delegates via Tab invocations.

```yaml
# .opencode/agents.yaml — Orchestrator configuration

orchestrator:
  name: multi-round-coordinator
  model: anthropic/claude-sonnet-4-20250514
  system_prompt: |
    You are a coordinator agent. Route questions to specialists via Tabs.
    Review responses and iterate until the answer is complete.

    Available tabs:
    - react-specialist (Tab 1)
    - backend-specialist (Tab 2)
    - security-specialist (Tab 3)

    Workflow:
    1. Analyze the user's question
    2. Open relevant Tabs and send context + question
    3. Read Tab responses
    4. If incomplete/conflicting, send follow-ups to specific Tabs
    5. When satisfied, synthesize and respond (close Tabs)

tabs:
  - name: react-specialist
    model: anthropic/claude-sonnet-4-20250514
    system_prompt: |
      You are a React/frontend specialist. Answer questions about
      React architecture, component design, state management,
      and frontend performance.

  - name: backend-specialist
    model: anthropic/claude-sonnet-4-20250514
    system_prompt: |
      You are a backend specialist. Answer questions about APIs,
      databases, server-side logic, and system integration.

  - name: security-specialist
    model: anthropic/claude-sonnet-4-20250514
    system_prompt: |
      You are a security specialist. Analyze code and architectures
      for vulnerabilities, recommend security best practices.
```

### 4.4 Qwen Code — Task-Based Approach

Qwen Code follows a similar pattern to Claude Code, using task-based delegation.

```
# Qwen Code pseudo-orchestration

1. Parse user question
2. Identify relevant specialists from available agent pool
3. Create parallel tasks for each specialist with full context
4. Collect responses
5. Run synthesis decision function
6. If more rounds needed, create follow-up tasks
7. Otherwise, produce final synthesis
```

### 4.5 Domain Orchestrators Integration

The Javi.Dots framework defines 6 domain orchestrators:

| Orchestrator | Domain | Specialists |
|-------------|--------|-------------|
| `development-orchestrator` | Code & features | react-pro, backend-pro, fullstack-senior |
| `quality-orchestrator` | Quality & security | testing-engineer, security-auditor, code-reviewer |
| `infrastructure-orchestrator` | DevOps & infra | devops-pro, cloud-architect, sre-engineer |
| `architecture-orchestrator` | Design & patterns | system-designer, domain-modeler, api-designer |
| `data-orchestrator` | Data & AI | data-engineer, ml-engineer, analytics-pro |
| `product-orchestrator` | Product & UX | product-manager, ux-designer, tech-writer |

Each orchestrator already routes to its domain specialists. Multi-round synthesis
upgrades them from single-round to multi-round by adding:

1. **A review step** after each delegation
2. **A follow-up capability** when responses are incomplete
3. **A synthesis step** that integrates all specialist inputs
4. **Cross-orchestrator communication** for truly cross-domain questions

```
# Cross-orchestrator multi-round flow

User: "Build a real-time analytics dashboard with proper security"

Round 1 (parallel):
  → development-orchestrator → @react-pro (dashboard architecture)
  → data-orchestrator → @analytics-pro (real-time data pipeline)
  → quality-orchestrator → @security-auditor (WebSocket security)

Round 1 review:
  Coordinator notes: react-pro suggests polling, analytics-pro
  suggests WebSockets — need alignment.

Round 2:
  → development-orchestrator → @react-pro
    "analytics-pro recommends WebSocket push. Adapt your
     architecture to WebSocket-based real-time updates."

Round 2 review:
  All responses now aligned. Security recommendations integrated.

Final synthesis:
  Coherent architecture combining all three perspectives.
```

---

## 5. When to Use Multi-Round vs Single-Round

Not every question needs multi-round synthesis. The overhead of multiple rounds
is only justified when it produces meaningfully better results.

| Scenario | Pattern | Why |
|----------|---------|-----|
| Simple question, one domain | Single-round | Overhead not justified — one specialist is enough |
| Cross-domain question | **Multi-round** | Need multiple perspectives that may conflict |
| Complex architecture decision | **Multi-round** | Need debate, trade-off analysis, synthesis |
| Bug investigation | **Multi-round** | Need hypothesis refinement across rounds |
| Quick code review | Single-round | One specialist (code-reviewer) suffices |
| Security audit | **Multi-round** | Need depth — initial scan, then targeted follow-ups |
| Simple refactoring | Single-round | Straightforward, one domain |
| New feature design | **Multi-round** | Multiple domains, trade-offs, integration concerns |
| Documentation update | Single-round | Low complexity, one specialist |
| Performance optimization | **Multi-round** | Need profiling → analysis → recommendation cycle |

### Decision Heuristic

```
IF question involves 1 domain AND is straightforward:
    → Single-round

IF question involves 2+ domains OR requires trade-off analysis:
    → Multi-round

IF question requires iterative refinement (debugging, optimization):
    → Multi-round

IF delegation overhead > value of specialist input:
    → Single-round (coordinator answers directly)
```

---

## 6. Mention-Based Routing

@mentions are the routing mechanism. They control which agents are invoked and
when the conversation terminates.

### Routing Table

```
@development-react-pro       → React, Next.js, frontend architecture
@development-backend-pro     → APIs, databases, server-side logic
@development-fullstack-senior → Full-stack integration questions
@quality-security-auditor    → Security analysis, vulnerability assessment
@quality-testing-engineer    → Test strategy, coverage, test architecture
@quality-code-reviewer       → Code quality, patterns, best practices
@infrastructure-devops-pro   → CI/CD, Docker, Kubernetes, deployment
@infrastructure-cloud-architect → Cloud services, scaling, cost optimization
@architecture-system-designer → System design, patterns, trade-offs
@architecture-api-designer   → API design, contracts, versioning
@data-ml-engineer            → Machine learning, model training
@data-analytics-pro          → Analytics, dashboards, data pipelines
```

### Routing Rules

1. **Single @mention** → one agent invoked, response returned to coordinator
2. **Multiple @mentions in one message** → all agents invoked in parallel
3. **@mentions in follow-up** → only mentioned agents invoked
4. **No @mentions** → coordinator is speaking directly to the user (terminal)

### Example Routing

```markdown
# Coordinator's Round 1 message (two @mentions = parallel):

@development-react-pro
Context: User wants a dashboard with live charts.
Question: Best React charting library for real-time data?

@development-backend-pro
Context: User wants a dashboard with live charts.
Question: Best approach for streaming data to the frontend?

# Coordinator's Round 2 message (one @mention = follow-up):

@development-react-pro
Follow-up: You recommended Recharts, but the backend will stream via
WebSocket. Does Recharts handle WebSocket-driven data well, or should
we consider a different library?

# Coordinator's final message (no @mentions = synthesis):

## Recommendation

Based on the specialists' analysis, here is the recommended architecture...
```

---

## 7. Conflict Resolution

When specialists disagree, the coordinator must resolve the conflict explicitly.
Silently picking one side without explanation erodes trust and may choose wrong.

### Resolution Protocol

```
Step 1: IDENTIFY the disagreement
  "Agent-A recommends WebSockets. Agent-B recommends SSE.
   These are mutually exclusive approaches."

Step 2: REQUEST evidence from each agent
  @Agent-A: "Why WebSockets over SSE for this use case? What are the
             trade-offs? Provide concrete technical reasoning."

  @Agent-B: "Why SSE over WebSockets for this use case? What are the
             trade-offs? Provide concrete technical reasoning."

Step 3: EVALUATE the evidence
  - Which approach better fits the user's constraints?
  - Which has stronger technical justification?
  - Which is more practical given the existing codebase?
  - Are there hybrid approaches that combine the best of both?

Step 4: DECIDE and DOCUMENT
  "After reviewing both perspectives:
   - WebSockets chosen because: bidirectional communication needed
   - SSE rejected because: user needs to send data upstream
   - Trade-off acknowledged: WebSockets are more complex to implement
   - Mitigation: use Socket.IO for abstraction layer"
```

### Conflict Categories

| Category | Example | Resolution Strategy |
|----------|---------|-------------------|
| Technology choice | "Use Redis" vs "Use Memcached" | Compare against requirements |
| Architecture pattern | "Monolith" vs "Microservices" | Evaluate team size, scale needs |
| Implementation approach | "ORM" vs "Raw SQL" | Benchmark performance, consider maintainability |
| Priority | "Security first" vs "Ship fast" | Defer to user's stated priorities |
| Scope | "MVP" vs "Full feature" | Align with project timeline |

### When Conflicts Cannot Be Resolved

If evidence is balanced and no clear winner exists, the coordinator should:

1. Present both options with pros/cons
2. Make a recommendation with explicit reasoning
3. Note that the alternative is viable
4. Let the user make the final decision

```markdown
## Two Viable Approaches

**Option A: WebSockets**
- Pro: Bidirectional, lower latency
- Con: More complex, requires sticky sessions

**Option B: SSE**
- Pro: Simpler, works with HTTP/2 multiplexing
- Con: Unidirectional only

**Recommendation**: WebSockets, because your use case requires
upstream data from the client. However, if you later simplify
to read-only dashboards, SSE would be the better choice.
```

---

## 8. Code Examples

### 8.1 Full Coordinator Using Claude Code Task Tool

```bash
#!/usr/bin/env bash
# multi-round-coordinator.sh
#
# Demonstrates the multi-round pattern using Claude Code's Task tool.
# In practice, this logic runs inside the coordinator agent's reasoning.

MAX_ROUNDS=3
ROUND=0

# --- Round 1: Parallel delegation ---
ROUND=$((ROUND + 1))
echo "=== Round $ROUND: Initial delegation ==="

# These would be Task tool calls in Claude Code (parallel)
REACT_RESPONSE=$(task "react-specialist" \
  "Context: Building real-time dashboard. \
   Question: Best React architecture for WebSocket-driven updates?")

BACKEND_RESPONSE=$(task "backend-specialist" \
  "Context: Building real-time dashboard. \
   Question: WebSocket server architecture for 1000+ connections?")

# --- Review ---
echo "=== Round $ROUND: Review ==="
NEEDS_FOLLOWUP=$(review_responses "$REACT_RESPONSE" "$BACKEND_RESPONSE")

# --- Round 2: Follow-up if needed ---
if [ "$NEEDS_FOLLOWUP" = "true" ] && [ $ROUND -lt $MAX_ROUNDS ]; then
  ROUND=$((ROUND + 1))
  echo "=== Round $ROUND: Follow-up ==="

  REACT_FOLLOWUP=$(task "react-specialist" \
    "Follow-up: Backend will use Socket.IO. \
     Adapt your React architecture to use socket.io-client.")

  echo "=== Round $ROUND: Review ==="
  NEEDS_FOLLOWUP=$(review_responses "$REACT_FOLLOWUP" "$BACKEND_RESPONSE")
fi

# --- Final synthesis ---
echo "=== Synthesis ==="
synthesize "$REACT_RESPONSE" "$BACKEND_RESPONSE" "$REACT_FOLLOWUP"
```

### 8.2 Synthesis Decision Function

```python
def decide_next_action(
    user_question: str,
    responses: list[AgentResponse],
    current_round: int,
    max_rounds: int = 3,
) -> dict:
    """Core decision function for multi-round synthesis.

    Returns one of:
    - {"action": "synthesize"} — produce final answer
    - {"action": "follow_up", "targets": [...]} — ask more questions
    - {"action": "escalate", "reason": "..."} — cannot resolve, ask user
    """

    # Hard stop: max rounds reached
    if current_round >= max_rounds:
        return {"action": "synthesize"}

    latest = [r for r in responses if r.round_num == current_round]

    # Check: did we get responses from all expected agents?
    if not latest:
        return {"action": "synthesize"}  # No responses, nothing to follow up

    # Check: are there conflicts?
    for i, a in enumerate(latest):
        for b in latest[i + 1:]:
            if responses_conflict(a, b):
                return {
                    "action": "follow_up",
                    "targets": [
                        {
                            "agent": a.agent,
                            "question": (
                                f"Your recommendation conflicts with "
                                f"@{b.agent}. They said: '{b.content[:200]}...'. "
                                f"Can you address this and provide evidence?"
                            ),
                        },
                        {
                            "agent": b.agent,
                            "question": (
                                f"Your recommendation conflicts with "
                                f"@{a.agent}. They said: '{a.content[:200]}...'. "
                                f"Can you address this and provide evidence?"
                            ),
                        },
                    ],
                }

    # Check: are there gaps?
    uncovered_aspects = find_uncovered_aspects(user_question, latest)
    if uncovered_aspects:
        targets = []
        for aspect in uncovered_aspects:
            best_agent = pick_best_agent_for(aspect, latest)
            targets.append({
                "agent": best_agent,
                "question": (
                    f"Your response didn't cover: {aspect}. "
                    f"Can you address this?"
                ),
            })
        return {"action": "follow_up", "targets": targets}

    # Check: are responses too shallow?
    shallow = [r for r in latest if len(r.content) < 100]
    if shallow:
        return {
            "action": "follow_up",
            "targets": [
                {
                    "agent": r.agent,
                    "question": "Can you provide more detail and specifics?",
                }
                for r in shallow
            ],
        }

    # All checks pass — ready to synthesize
    return {"action": "synthesize"}


def responses_conflict(a: AgentResponse, b: AgentResponse) -> bool:
    """Detect semantic conflicts between two responses."""
    # Implementation: keyword analysis, or delegate to an LLM call
    # that specifically checks for contradictions
    pass


def find_uncovered_aspects(
    question: str, responses: list[AgentResponse]
) -> list[str]:
    """Find aspects of the question not addressed by any response."""
    # Implementation: extract key topics from question,
    # check which are covered by responses
    pass


def pick_best_agent_for(
    aspect: str, responses: list[AgentResponse]
) -> str:
    """Pick the most relevant agent to answer a specific aspect."""
    # Implementation: match aspect keywords to agent domains
    pass
```

### 8.3 Example Multi-Round Conversation Transcript

```
USER: I need to add real-time notifications to our React app.
      Users should see alerts for new messages, system events,
      and admin broadcasts. We use Express.js on the backend
      and PostgreSQL for storage.

COORDINATOR (Round 1):
  This requires frontend, backend, and potentially security input.

  @development-react-pro
  Context: Adding real-time notifications to a React + Express.js app.
  Users need alerts for: new messages, system events, admin broadcasts.
  Question: What React architecture handles real-time notifications
  with multiple notification types? Consider UI components, state
  management, and connection management.

  @development-backend-pro
  Context: Adding real-time notifications to Express.js + PostgreSQL.
  Notification types: new messages, system events, admin broadcasts.
  Question: What server architecture supports real-time notification
  delivery? Consider connection management, message queuing, and
  PostgreSQL integration (LISTEN/NOTIFY or polling).

REACT-PRO (Round 1 response):
  Recommend a NotificationProvider context with WebSocket connection.
  Use a notification store (Zustand) with categories. Toast UI
  component for display. React Query for notification history.
  [detailed implementation...]

BACKEND-PRO (Round 1 response):
  Recommend Server-Sent Events (SSE) for notifications — simpler than
  WebSockets for unidirectional push. Use PostgreSQL LISTEN/NOTIFY for
  database-driven events. Redis Pub/Sub for cross-instance delivery.
  [detailed implementation...]

COORDINATOR (Round 1 review):
  Conflict detected: React-pro assumes WebSockets, Backend-pro
  recommends SSE. Need alignment.

  @development-react-pro
  Follow-up: The backend specialist recommends SSE instead of
  WebSockets (simpler for unidirectional push). Can your React
  architecture work with SSE? What changes would be needed?
  Also: are there cases where we'd need WebSockets instead?

REACT-PRO (Round 2 response):
  SSE works well for notifications since they're server→client only.
  Changes: replace WebSocket hook with EventSource. Zustand store
  stays the same. One caveat: if we later need read receipts or
  typing indicators, we'd need to upgrade to WebSockets.
  [updated implementation...]

COORDINATOR (Round 2 review):
  Responses now aligned on SSE. React-pro noted WebSocket upgrade
  path for future features. Complete and coherent.

COORDINATOR (Final synthesis):
  ## Real-Time Notifications Architecture

  ### Summary
  Use Server-Sent Events (SSE) for real-time notification delivery,
  with PostgreSQL LISTEN/NOTIFY for event sourcing and Redis Pub/Sub
  for multi-instance support.

  ### Frontend
  - NotificationProvider context with EventSource connection
  - Zustand store for notification state (categories, read/unread)
  - Toast component for display, React Query for history
  [integrated details from react-pro...]

  ### Backend
  - Express.js SSE endpoint with Redis Pub/Sub subscription
  - PostgreSQL LISTEN/NOTIFY triggers for data-driven events
  - Admin broadcast channel via Redis
  [integrated details from backend-pro...]

  ### Future Considerations
  - If bidirectional communication needed (read receipts, typing),
    upgrade SSE to WebSockets (architecture supports this migration)

  ### Trade-offs
  - SSE chosen over WebSockets: simpler, sufficient for push-only
  - PostgreSQL LISTEN/NOTIFY over polling: real-time, lower latency
  - Redis Pub/Sub: enables horizontal scaling
```

### 8.4 OpenCode Orchestrator Configuration

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
      - pattern: "security|auth|vulnerability|xss|csrf"
        agent: quality-security-auditor
      - pattern: "test|coverage|e2e|unit test"
        agent: quality-testing-engineer
      - pattern: "deploy|docker|kubernetes|ci/cd"
        agent: infrastructure-devops-pro
      - pattern: "architecture|design|pattern|scale"
        agent: architecture-system-designer

    synthesis_rules:
      min_confidence: 0.8
      conflict_resolution: evidence_based
      max_follow_ups_per_agent: 2
```

---

## 9. Integration with Adversarial Review

The multi-round-synthesis pattern enhances the adversarial-review skill significantly.

### Adversarial Review Recap

The adversarial-review skill uses 3 fixed perspectives:
1. **Advocate** — argues for the proposed approach
2. **Critic** — argues against, finds weaknesses
3. **Pragmatist** — evaluates practical trade-offs

In single-round adversarial review, each perspective gives one response, and
the coordinator synthesizes. This misses follow-up opportunities.

### Combined Pattern: Adversarial + Multi-Round

```
Round 1 (parallel):
  → @advocate: "Argue for this architecture"
  → @critic: "Find weaknesses in this architecture"
  → @pragmatist: "Evaluate practical trade-offs"

Round 1 review:
  Coordinator reads all three perspectives.
  Critic raised a valid concern about database bottleneck.
  Advocate didn't address it. Pragmatist was vague on mitigation.

Round 2 (targeted follow-ups):
  → @advocate: "The critic raised a concern about database
     bottleneck at scale. How does your architecture handle this?"
  → @pragmatist: "What's the concrete cost of the database
     bottleneck mitigation? Is it worth doing now or later?"

Round 2 review:
  Advocate proposed read replicas. Pragmatist said defer until
  1000 concurrent users. Aligned.

Final synthesis:
  Architecture approved with noted caveat: add read replicas
  when concurrent users exceed 1000. Critic's concern valid
  but addressable without architectural change.
```

### Why This Combination Is Powerful

- **Adversarial review** ensures multiple perspectives are heard
- **Multi-round synthesis** ensures those perspectives are stress-tested
- Together, they catch issues that neither pattern catches alone:
  - The critic raises a concern (adversarial review)
  - The coordinator forces the advocate to address it (multi-round)
  - The pragmatist evaluates the mitigation cost (multi-round)
  - The final synthesis is battle-tested from all angles

### Implementation

```python
def adversarial_multi_round(proposal: str, max_rounds: int = 3) -> str:
    """Run adversarial review with multi-round synthesis."""
    state = SynthesisState(
        user_question=f"Evaluate this proposal:\n{proposal}",
        max_rounds=max_rounds,
    )

    # Round 1: All three perspectives (parallel)
    perspectives = ["advocate", "critic", "pragmatist"]
    prompts = {
        "advocate": f"Argue FOR this proposal. Why is it the right approach?\n\n{proposal}",
        "critic": f"Argue AGAINST this proposal. Find every weakness.\n\n{proposal}",
        "pragmatist": f"Evaluate the practical trade-offs of this proposal.\n\n{proposal}",
    }

    state.current_round = 1
    for perspective in perspectives:
        response = delegate_to_agent(perspective, prompts[perspective])
        state.responses.append(
            AgentResponse(
                agent=perspective,
                content=response,
                round_num=1,
            )
        )

    # Multi-round follow-up loop
    while True:
        decision = decide_next_action(
            state.user_question,
            state.responses,
            state.current_round,
            state.max_rounds,
        )

        if decision["action"] == "synthesize":
            break

        state.current_round += 1
        for target in decision["targets"]:
            response = delegate_to_agent(target["agent"], target["question"])
            state.responses.append(
                AgentResponse(
                    agent=target["agent"],
                    content=response,
                    round_num=state.current_round,
                )
            )

    return synthesize(state)
```

---

## 10. Anti-Patterns

These are the mistakes to avoid when implementing multi-round synthesis.

### 10.1 Too Many Rounds (Diminishing Returns)

**Problem**: Running 5+ rounds trying to get a "perfect" answer.

**Why it's bad**: After round 3, you're typically refining marginal details.
The cost (tokens, latency, user patience) exceeds the value.

**Rule**: Hard cap at 3 rounds. If the answer isn't satisfactory after 3 rounds,
synthesize with explicit caveats about what remains unresolved.

```python
# BAD — no limit
while not is_perfect(responses):
    ask_more_questions()  # Could loop forever

# GOOD — hard cap
MAX_ROUNDS = 3
while current_round < MAX_ROUNDS:
    decision = should_continue(state)
    if not decision["continue"]:
        break
    current_round += 1
    # ... follow-up logic ...
# Always synthesize after the loop
```

### 10.2 Delegating Simple Questions

**Problem**: Routing "What's the React hook for side effects?" to a specialist.

**Why it's bad**: The coordinator already knows the answer. Delegation adds
latency and token cost for no benefit.

**Rule**: If the coordinator can answer with high confidence and the question
involves a single domain, answer directly.

```python
# BAD — always delegate
def handle_question(q):
    agents = analyze_question(q)
    return delegate_to_all(agents, q)

# GOOD — direct answer when appropriate
def handle_question(q):
    if is_simple_single_domain(q) and coordinator_confident(q):
        return answer_directly(q)
    agents = analyze_question(q)
    return orchestrate_multi_round(agents, q)
```

### 10.3 Agents Talking to Each Other Directly

**Problem**: Agent-A references Agent-B's response or asks Agent-B a question.

**Why it's bad**: The coordinator loses control of the conversation. Agents
don't have each other's full context. Routing becomes unpredictable.

**Rule**: All communication flows through the coordinator. Agents never
see each other's responses unless the coordinator explicitly includes them.

```
BAD:
  Agent-A → Agent-B: "What do you think about my suggestion?"

GOOD:
  Agent-A → Coordinator: "Here's my suggestion: X"
  Coordinator → Agent-B: "Agent-A suggests X. What's your assessment?"
  Agent-B → Coordinator: "I disagree because Y"
  Coordinator: [resolves conflict]
```

### 10.4 Missing Context in Delegations

**Problem**: Sending a specialist a bare question without the surrounding context.

**Why it's bad**: The specialist doesn't know what the user asked, what
constraints exist, or what other specialists have said. Their response
will be generic and possibly irrelevant.

**Rule**: Every delegation includes full context: the original user question,
relevant constraints, and (in follow-ups) what other agents have said.

```markdown
# BAD — no context
@backend-pro
How should we handle WebSocket connections?

# GOOD — full context
@backend-pro
**Original question**: User wants real-time notifications in a React +
Express.js app. Types: messages, system events, admin broadcasts.
**Constraint**: PostgreSQL database, must support horizontal scaling.
**Other agents said**: React specialist recommends Zustand for state.
**Your question**: What WebSocket server architecture handles this?
```

### 10.5 Premature Synthesis

**Problem**: Synthesizing after round 1 even though responses are incomplete
or conflicting.

**Why it's bad**: The whole point of multi-round is to catch and fix issues
before synthesizing. Premature synthesis defeats the purpose.

**Rule**: Only synthesize when the decision function returns `"synthesize"`,
meaning all completeness, consistency, and depth checks have passed.

```python
# BAD — synthesize immediately after round 1
responses = delegate_to_all(agents, question)
return synthesize(responses)  # Never checks for issues

# GOOD — check before synthesizing
responses = delegate_to_all(agents, question)
decision = decide_next_action(question, responses, round=1)
if decision["action"] == "follow_up":
    # ... more rounds ...
    pass
return synthesize(all_responses)
```

### 10.6 Ignoring the Coordinator's Judgment

**Problem**: Always trusting the specialist with the longest response or the
highest "confidence" score.

**Why it's bad**: Length doesn't equal quality. The coordinator's job is to
evaluate substance, not volume.

**Rule**: The coordinator evaluates responses on relevance, correctness,
and completeness — not on superficial metrics.

---

## Quick Reference

```
Multi-Round Synthesis Checklist:
  [ ] Coordinator analyzes question before delegating
  [ ] Full context included in every delegation
  [ ] Parallel delegation where possible
  [ ] Review step after each round
  [ ] Conflict detection and resolution
  [ ] Hard cap at 3 rounds
  [ ] Synthesis only when decision function approves
  [ ] No @mentions in final synthesis = conversation complete
  [ ] Simple questions answered directly (no delegation)
  [ ] All communication flows through coordinator
```

---

## Summary

| Concept | Key Point |
|---------|-----------|
| Core idea | Coordinator iterates with specialists until satisfied |
| Routing | @mentions control which agents are invoked |
| Termination | No @mentions = conversation complete |
| Max rounds | 3 (hard cap — diminishing returns after) |
| Conflict resolution | Evidence-based, coordinator decides |
| Direct answers | Simple questions don't need delegation |
| Context | Always include full context in every delegation |
| Communication | All flows through coordinator (hub-and-spoke) |
| Integration | Enhances adversarial-review for deeper analysis |
| Implementation | Task tool (Claude), Tabs (OpenCode), similar patterns (Qwen) |
