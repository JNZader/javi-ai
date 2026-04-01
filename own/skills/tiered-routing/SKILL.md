---
name: tiered-routing
description: >
  4-tier cost-optimized routing protocol for the SDD orchestrator. Resolves routing via pattern match, session state, keyword lookup, and LLM classification — in that order.
  Trigger: When the orchestrator needs to route a user request to a skill or agent. Always active as routing logic.
metadata:
  author: javi-ai
  version: "1.0"
  tags: [routing, orchestration, cost-optimization, tokens]
  category: orchestration
  inspired-by: https://github.com/SethGammon/Citadel
allowed-tools: Read, Bash, Glob, Grep
---

## Purpose

Eliminate unnecessary LLM calls for routing decisions. Most user requests can be resolved with pattern matching or state lookup — zero tokens consumed. LLM classification becomes the fallback, not the default.

---

## Routing Flow

```
User Input
    |
    v
Tier 1: Pattern Match ──match──> Route (0 tokens)
    | no match
    v
Tier 2: Session State ──match──> Route (0 tokens)
    | no match
    v
Tier 3: Keyword Lookup ──single match──> Route (minimal)
    | no match / ambiguous
    v
Tier 4: LLM Classification ──> Route (full cost)
```

**Rule**: Stop at the FIRST tier that produces a single confident match. Never run a lower tier if a higher one resolved.

---

## Tier 1: Pattern Match (Zero Tokens)

Exact regex patterns on user input. These are deterministic — no ambiguity.

### SDD Commands

| Pattern | Routes To | Skill |
|---------|-----------|-------|
| `^/sdd-init` | SDD init | `sdd-init` |
| `^/sdd-explore` | SDD explore | `sdd-explore` |
| `^/sdd-new` | SDD propose | `sdd-propose` |
| `^/sdd-continue` | SDD next phase | (resolve via Tier 2 state) |
| `^/sdd-ff` | SDD fast-forward | `sdd-propose` > `sdd-spec` > `sdd-design` > `sdd-tasks` |
| `^/sdd-apply` | SDD apply | `sdd-apply` |
| `^/sdd-verify` | SDD verify | `sdd-verify` |
| `^/sdd-archive` | SDD archive | `sdd-archive` |

### Workflow Commands

| Pattern | Routes To | Skill |
|---------|-----------|-------|
| `^/compound` | Compound loop | `compound-loop` |
| `^/playbook` | Playbook executor | `playbooks` |
| `^/debug` | Debug mode | `debug-mode` |
| `^/remember` | Session memory | `session-memory` |
| `^/blast-radius` | Blast radius | `blast-radius` |
| `^/worktree` | Worktree flow | `worktree-flow` |

### Skill Management Commands

| Pattern | Routes To | Skill |
|---------|-----------|-------|
| `^/skill-create` | Skill creator | `skill-creator` |
| `^/skillguard` | Skill scanner | `skillguard` |
| `^/skill-registry` | Registry update | `skill-registry` |

### Domain Orchestrators

| Pattern | Routes To | Orchestrator |
|---------|-----------|-------------|
| `^/dev\b` | Development | `development` |
| `^/infra\b` | Infrastructure | `infrastructure` |
| `^/data\b` | Data & AI | `data-ai` |
| `^/quality\b` | Quality | `quality` |
| `^/business\b` | Business | `business` |
| `^/workflow\b` | Workflow | `workflow` |

### Spanish Aliases

| Pattern | Resolves To |
|---------|------------|
| `^iniciar sdd` | `/sdd-init` |
| `^nuevo cambio` | `/sdd-new` |
| `^implementar` | `/sdd-apply` |
| `^verificar` | `/sdd-verify` |
| `^archivar` | `/sdd-archive` |

**Matching rule**: Case-insensitive. Strip leading whitespace before matching.

---

## Tier 2: Session State (Zero Tokens)

When user input implies "continue" or "next" without specifying which phase, resolve from current SDD artifact state.

### State Resolution Table

| Artifacts Present | Missing | Route To |
|-------------------|---------|----------|
| (none) | everything | `sdd-explore` or `sdd-propose` |
| proposal | spec, design | `sdd-spec` + `sdd-design` (parallel) |
| proposal, spec | design | `sdd-design` |
| proposal, design | spec | `sdd-spec` |
| proposal, spec, design | tasks | `sdd-tasks` |
| proposal, spec, design, tasks | apply | `sdd-apply` |
| all + applied | verify | `sdd-verify` |
| all + verified | archive | `sdd-archive` |

### Trigger Phrases for Tier 2

These phrases activate state-based routing:

- "continue", "next", "dale", "seguir", "siguiente"
- "sdd continue", "what's next", "que sigue"
- `/sdd-continue`

### How to Read State

1. **Engram mode**: `mem_search(query: "sdd/{change-name}/", project: "{project}")` — check which artifact types exist
2. **Openspec mode**: Check `openspec/changes/{change-name}/` for existing files
3. **None mode**: Track in conversation context

---

## Tier 3: Keyword Lookup (Minimal Computation)

Match keywords in user message against skill trigger definitions. No LLM — just string matching.

### Keyword Map

| Keywords | Skill | Confidence |
|----------|-------|------------|
| `review`, `PR`, `pull request`, `revisar pr` | `pr-review` | High |
| `debug`, `failing`, `broken`, `why is this` | `debug-mode` | High |
| `test agent`, `prompt test`, `eval` | `agent-testing` | High |
| `braindump`, `quick note`, `capture thought` | `obsidian-braindump` | High |
| `consolidate`, `weekly synthesis`, `knowledge review` | `obsidian-consolidation` | High |
| `capture resource`, `save link`, `bookmark` | `obsidian-resource-capture` | High |
| `compress`, `token budget`, `context too large` | `token-compression` | High |
| `codebase map`, `onboarding`, `project overview` | `codebase-cartography` | High |
| `reverse engineer`, `understand this code`, `generate docs` | `reverse-engineer` | High |
| `create skill`, `new skill`, `agent instructions` | `skill-creator` | High |
| `cost`, `token usage`, `budget`, `spending` | `cost-tracking` | Medium |
| `complexity`, `how complex`, `classify task` | `complexity-router` | High |
| `embed`, `chunking`, `voyage` | `embedding-strategies` | Medium |
| `vector index`, `HNSW`, `quantization` | `vector-index-tuning` | Medium |
| `RAG`, `retrieval`, `reranking`, `hybrid search` | `rag-advanced` | High |
| `prompt engineering`, `few-shot`, `chain of thought` | `prompt-engineering` | High |
| `LLM eval`, `model comparison`, `judge` | `llm-evaluation` | High |
| `governance`, `permissions`, `capability`, `kill switch` | `agent-governance` | High |
| `playbook`, `batch`, `repeatable workflow` | `playbooks` | High |
| `worktree`, `parallel branch`, `isolated execution` | `worktree-flow` | High |
| `multi-round`, `delegation rounds`, `group chat` | `multi-round-synthesis` | High |
| `plan-pact`, `negotiate`, `decision register` | `plan-pact` | High |
| `memory`, `session`, `/remember` | `session-memory` | Medium |
| `POML`, `prompt template`, `structured prompt` | `poml-templates` | High |
| `project memory`, `CLAUDE.md`, `retrospective`, `one-way door` | `project-memory` | Medium |
| `auto-continue`, `keep going`, `don't stop` | `auto-continuation` | High |
| `scan skill`, `skill security`, `injection` | `skillguard` | High |
| `circuit breaker`, `runaway agent`, `agent limits`, `kill agent` | `circuit-breaker` | High |

### Matching Rules

1. **Case-insensitive** matching
2. **Minimum 2 keyword hits** for Medium confidence skills
3. **1 keyword hit** sufficient for High confidence skills
4. **Multiple skill matches** (2+) → escalate to Tier 4
5. **Zero matches** → escalate to Tier 4

---

## Tier 4: LLM Classification (Fallback)

Only reached when tiers 1-3 fail. This is the current default behavior — it becomes the exception.

### When Tier 4 Activates

- No pattern match (Tier 1)
- No active SDD state or non-SDD request (Tier 2)
- No keyword match, or ambiguous multi-match (Tier 3)

### LLM Prompt for Classification

When invoking Tier 4, provide this context to reduce classification cost:

```
Classify user intent. Choose ONE:
1. SDD phase: {explore|propose|spec|design|tasks|apply|verify|archive}
2. Skill: {skill-name from registry}
3. Domain: {development|infrastructure|data-ai|quality|business|workflow}
4. Direct answer (no routing needed)

User message: "{message}"
Active change: "{change-name or none}"
```

---

## Unified Routing Table

Quick reference — every routable target and its primary tier.

| Target | Tier 1 Pattern | Tier 2 State | Tier 3 Keywords |
|--------|---------------|-------------|----------------|
| `sdd-init` | `/sdd-init` | — | — |
| `sdd-explore` | `/sdd-explore` | no artifacts | — |
| `sdd-propose` | `/sdd-new` | no proposal | — |
| `sdd-spec` | — | proposal, no spec | — |
| `sdd-design` | — | proposal, no design | — |
| `sdd-tasks` | — | spec+design, no tasks | — |
| `sdd-apply` | `/sdd-apply` | tasks exist | — |
| `sdd-verify` | `/sdd-verify` | applied | — |
| `sdd-archive` | `/sdd-archive` | verified | — |
| `sdd-enhanced` | — | — | `sdd`, `index` |
| `pr-review` | — | — | `review`, `PR` |
| `debug-mode` | `/debug` | — | `debug`, `failing` |
| `compound-loop` | `/compound` | — | `compound`, `learnings` |
| `complexity-router` | — | — | `complexity`, `classify` |
| `blast-radius` | `/blast-radius` | — | `blast radius`, `impact` |
| `adversarial-review` | — | — | `adversarial`, `multi-perspective review` |
| `agent-testing` | — | — | `test agent`, `prompt test` |
| `agent-governance` | — | — | `governance`, `permissions` |
| `circuit-breaker` | — | — | `circuit breaker`, `runaway agent` |
| `auto-continuation` | — | — | `keep going`, `auto-continue` |
| `codebase-cartography` | — | — | `codebase map`, `onboarding` |
| `cost-tracking` | — | — | `cost`, `token usage` |
| `embedding-strategies` | — | — | `embed`, `chunking` |
| `llm-evaluation` | — | — | `LLM eval`, `judge` |
| `multi-round-synthesis` | — | — | `multi-round`, `delegation` |
| `obsidian-braindump` | — | — | `braindump`, `quick note` |
| `obsidian-consolidation` | — | — | `consolidate`, `synthesis` |
| `obsidian-resource-capture` | — | — | `capture resource`, `bookmark` |
| `plan-pact` | — | — | `plan-pact`, `negotiate` |
| `playbooks` | `/playbook` | — | `playbook`, `batch` |
| `poml-templates` | — | — | `POML`, `prompt template` |
| `project-memory` | — | — | `project memory`, `retrospective` |
| `prompt-engineering` | — | — | `prompt engineering`, `few-shot` |
| `rag-advanced` | — | — | `RAG`, `retrieval` |
| `reverse-engineer` | — | — | `reverse engineer`, `generate docs` |
| `session-memory` | `/remember` | — | `memory`, `session` |
| `skill-creator` | `/skill-create` | — | `create skill`, `new skill` |
| `skillguard` | `/skillguard` | — | `scan skill`, `injection` |
| `token-compression` | — | — | `compress`, `token budget` |
| `vector-index-tuning` | — | — | `vector index`, `HNSW` |
| `worktree-flow` | `/worktree` | — | `worktree`, `parallel branch` |

---

## Adding New Skills

When a new skill is added to the system:

1. **Check if it has a command** (e.g., `/skill-name`) → add to Tier 1 pattern table
2. **Check if it's SDD-related** → add state transitions to Tier 2
3. **Extract trigger keywords** from the skill's frontmatter `description` → add to Tier 3
4. **Add to Unified Routing Table** at the bottom

---

## Rules

1. **Always start at Tier 1** — never skip tiers, even if you "think" it needs LLM
2. **Stop at first match** — if Tier 1 resolves, do NOT run Tier 2/3/4
3. **Tier 3 ambiguity escalates** — 2+ skill matches means Tier 4 decides
4. **State is authoritative** — Tier 2 always beats Tier 3 for SDD-related requests
5. **Keep the routing table updated** — every new skill MUST be added here
6. **Zero-token tiers first** — the whole point is cost optimization
7. **Spanish aliases are first-class** — treat them identically to English commands
