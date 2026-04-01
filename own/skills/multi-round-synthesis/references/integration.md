# Multi-Round Synthesis — Integration Patterns

## Integration with Adversarial Review

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
  -> @advocate: "Argue for this architecture"
  -> @critic: "Find weaknesses in this architecture"
  -> @pragmatist: "Evaluate practical trade-offs"

Round 1 review:
  Coordinator reads all three perspectives.
  Critic raised a valid concern about database bottleneck.
  Advocate didn't address it. Pragmatist was vague on mitigation.

Round 2 (targeted follow-ups):
  -> @advocate: "The critic raised a concern about database
     bottleneck at scale. How does your architecture handle this?"
  -> @pragmatist: "What's the concrete cost of the database
     bottleneck mitigation? Is it worth doing now or later?"

Round 2 review:
  Advocate proposed read replicas. Pragmatist said defer until
  1000 concurrent users. Aligned.

Final synthesis:
  Architecture approved with noted caveat: add read replicas
  when concurrent users exceed 1000.
```

### Why This Combination Is Powerful

- **Adversarial review** ensures multiple perspectives are heard
- **Multi-round synthesis** ensures those perspectives are stress-tested
- Together, they catch issues that neither pattern catches alone

### Implementation

```python
def adversarial_multi_round(proposal: str, max_rounds: int = 3) -> str:
    """Run adversarial review with multi-round synthesis."""
    state = SynthesisState(user_question=f"Evaluate this proposal:\n{proposal}", max_rounds=max_rounds)
    perspectives = ["advocate", "critic", "pragmatist"]
    prompts = {
        "advocate": f"Argue FOR this proposal. Why is it the right approach?\n\n{proposal}",
        "critic": f"Argue AGAINST this proposal. Find every weakness.\n\n{proposal}",
        "pragmatist": f"Evaluate the practical trade-offs of this proposal.\n\n{proposal}",
    }
    state.current_round = 1
    for perspective in perspectives:
        response = delegate_to_agent(perspective, prompts[perspective])
        state.responses.append(AgentResponse(agent=perspective, content=response, round_num=1))

    while True:
        decision = decide_next_action(state.user_question, state.responses, state.current_round, state.max_rounds)
        if decision["action"] == "synthesize":
            break
        state.current_round += 1
        for target in decision["targets"]:
            response = delegate_to_agent(target["agent"], target["question"])
            state.responses.append(AgentResponse(agent=target["agent"], content=response, round_num=state.current_round))

    return synthesize(state)
```

---

## Domain Orchestrators Integration

The Javi.Dots framework defines 6 domain orchestrators:

| Orchestrator | Domain | Specialists |
|-------------|--------|-------------|
| `development-orchestrator` | Code & features | react-pro, backend-pro, fullstack-senior |
| `quality-orchestrator` | Quality & security | testing-engineer, security-auditor, code-reviewer |
| `infrastructure-orchestrator` | DevOps & infra | devops-pro, cloud-architect, sre-engineer |
| `architecture-orchestrator` | Design & patterns | system-designer, domain-modeler, api-designer |
| `data-orchestrator` | Data & AI | data-engineer, ml-engineer, analytics-pro |
| `product-orchestrator` | Product & UX | product-manager, ux-designer, tech-writer |

Multi-round synthesis upgrades them from single-round to multi-round by adding:
1. A review step after each delegation
2. A follow-up capability when responses are incomplete
3. A synthesis step that integrates all specialist inputs
4. Cross-orchestrator communication for truly cross-domain questions

```
# Cross-orchestrator multi-round flow
User: "Build a real-time analytics dashboard with proper security"

Round 1 (parallel):
  -> development-orchestrator -> @react-pro (dashboard architecture)
  -> data-orchestrator -> @analytics-pro (real-time data pipeline)
  -> quality-orchestrator -> @security-auditor (WebSocket security)

Round 1 review:
  react-pro suggests polling, analytics-pro suggests WebSockets — need alignment.

Round 2:
  -> development-orchestrator -> @react-pro
    "analytics-pro recommends WebSocket push. Adapt your architecture."

Final synthesis: Coherent architecture combining all three perspectives.
```
