# sdd-explore Extensions

These extensions are appended to the upstream SKILL.md during installation.
Each extension is tracked with a STATUS comment for easy upstream sync monitoring.

---

## Extension: Perspective Mode (v2.1)

<!-- STATUS: Not yet submitted to agent-teams-lite upstream -->
<!-- ACTION: If Gentleman incorporates perspective mode in upstream, remove this section -->
<!-- PR: pending -->

**What this adds**: An optional `perspective` parameter that turns the agent into a specialist analyst rather than a generalist. When absent, behavior is 100% identical to upstream — full backward compatibility.

---

### What You Receive (Extended)

In addition to the base inputs, the orchestrator may pass:
- `perspective` (optional) — analytical lens to focus through (e.g., `architecture`, `risk`, `testing`, `dx`). When present, constrain ALL analysis to this perspective.

---

### Perspective Mode Rules

**When `perspective` IS provided:**
- You are a **specialist**, not a generalist. Focus your ENTIRE analysis through that lens.
- The perspective colors EVERYTHING: what you investigate, what risks you identify, what approaches you compare, and what you recommend.
- Prioritize findings relevant to your assigned perspective. Go deeper on your specialty rather than broader across all concerns.
- You may still note critical findings outside your perspective, but flag them as "outside perspective scope".

**When `perspective` is NOT provided:**
- Behavior is exactly as defined in the base skill: general-purpose exploration covering all relevant angles.

**Perspective focus reference:**

| Perspective | Focus Areas |
|-------------|------------|
| `architecture` | Patterns, coupling, modularity, code organization, abstractions, integration points, extensibility |
| `risk` | Breaking changes, migration risks, backward compatibility, failure modes, effort estimation, security |
| `testing` | Testability, coverage gaps, edge cases, regression risk, CI impact, testing strategy |
| `dx` | Developer experience, ergonomics, discoverability, learning curve, documentation needs, API design |

---

### Output Format (Extended)

**When `perspective` was provided**, use this title format:
```
## Exploration: {topic} (Perspective: {perspective})
```

Include `perspective: {name}` in the returned metadata envelope.
When NO perspective was provided, use the standard title — no change.
