# Agent Architecture Reference

Mapping of javi-ai's SDD orchestrator architecture to the 19-chapter agent architecture framework. This document serves as a cross-reference between the theoretical framework (shareAI-lab/learn-claude-code) and the concrete implementation in this repo.

---

## Chapter Mapping

### 1. The Agentic Loop

**Framework**: Agents run in a continuous loop of perceive-think-act until a stop condition.

**javi-ai implementation**: The SDD orchestrator in `CLAUDE.md` runs a phase-based loop:
- User triggers a command (`/sdd-new`, `/sdd-ff`, `/sdd-apply`)
- Orchestrator dispatches sub-agent via Task tool
- Sub-agent executes, returns structured envelope
- Orchestrator shows result, asks user to proceed
- Loop continues until all phases complete or user stops

**Key files**: `CLAUDE.md` (orchestrator rules), `delta/overrides/sdd-*/SKILL.md` (phase skills)

---

### 2. Tools & Function Calling

**Framework**: Agents extend their capabilities through tool use with structured schemas.

**javi-ai implementation**:
- MCP tools: `engram` (persistent memory), Gmail, Google Calendar
- Built-in tools: Read, Write, Edit, Bash, Glob, Grep, Task
- Deferred tools: EnterWorktree, ExitWorktree, WebFetch, WebSearch
- External CLIs: `repoforge` (codebase analysis), `gh` (GitHub), `git`
- Per-skill tool whitelists via `allowed-tools` in YAML frontmatter

---

### 3. Structured Output & Parsing

**Framework**: Agents produce structured responses for downstream consumption.

**javi-ai implementation**: Every SDD sub-agent returns a structured envelope:
```
{
  status: "complete" | "partial" | "blocked",
  executive_summary: string,
  detailed_report?: string,
  artifacts: { id, type, path }[],
  next_recommended: string,
  risks: string[]
}
```
The orchestrator parses this to track DAG state and present summaries.

---

### 4. Planning & Reasoning

**Framework**: Agents decompose complex tasks into plans before executing.

**javi-ai implementation**:
- `/sdd-explore` — investigation and option analysis before commitment
- `/sdd-propose` — structured proposal with intent, scope, approach
- `/sdd-spec` — formal specifications with requirements and scenarios
- `/sdd-design` — technical design with architecture decisions
- `/sdd-tasks` — implementation task breakdown with dependencies
- Multi-perspective explore fans out N parallel analysts with different lenses (architecture, testing, risk, DX)

---

### 5. Delegation & Sub-Agents

**Framework**: Orchestrator delegates work to specialized sub-agents.

**javi-ai implementation**:
- **Orchestrator rules**: NEVER read/write code inline, ALWAYS delegate via Task tool
- **Sub-agent launching pattern**: Each gets a prompt with skill path, context, artifact store mode
- **Domain orchestrators**: 6 domains (Development, Infrastructure, Data & AI, Quality, Business, Workflow)
- **Direct agent access**: Users can bypass domain routing and call specific agents
- **Sub-agents have FULL access** — they read code, write code, run commands

---

### 6. Context Window Management

**Framework**: Agents must manage their limited context window strategically.

**javi-ai implementation**:
- **Orchestrator stays lightweight**: Only tracks state, summaries, and user decisions
- **Sub-agents get fresh context**: Each Task call starts with clean context
- **Token compression skill**: `own/skills/token-compression/` — 5-layer compression engine (70-97% reduction)
- **Repoforge context-prune**: Graph-aware symbol extraction, 42-95% token reduction for explore phase
- **SDD compact**: `/sdd-compact` summarizes completed tasks to reclaim context
- **Engram persistence**: Artifacts survive across sessions, not just in-context

---

### 7. Guardrails & Permissions

**Framework**: Agents operate within defined capability boundaries.

**javi-ai implementation**:
- **Agent governance skill**: `own/skills/agent-governance/` — privilege rings, kill switches, behavioral anomaly detection
- **Skillguard**: `own/skills/skillguard/` — security scanner for skill files (credential theft, code injection, data exfiltration)
- **Per-skill tool whitelists**: `allowed-tools` in YAML frontmatter restricts tool access
- **Orchestrator anti-patterns**: Explicit list of what the orchestrator must NOT do
- **Git safety protocol**: NEVER force push, NEVER skip hooks (unless user says so), NEVER amend

---

### 8. Hooks & Lifecycle Events

**Framework**: Agents respond to lifecycle events (pre-commit, post-task, etc.).

**javi-ai implementation**:
- **Git hooks**: Pre-commit validation (the system acknowledges hooks may fail and handles it)
- **Settings.json hooks**: Automated behaviors configured via `update-config` skill
- **Post-apply workflow**: `workflows:compound` — summarize learnings after significant tasks
- **Post-archive suggestion**: Orchestrator suggests `/sdd-compact` after archive completes
- **Skill auto-detection**: Framework/library context triggers automatic skill loading

---

### 9. Memory & Persistence

**Framework**: Agents maintain memory across sessions.

**javi-ai implementation**:
- **Engram MCP server**: Primary persistence backend — `mem_save`, `mem_search`, `mem_get_observation`
- **Deterministic topic keys**: `sdd/{change-name}/{artifact-type}` for upsert-safe storage
- **Session lifecycle**: `mem_session_start`, `mem_session_end`, `mem_session_summary`
- **Project memory skill**: `own/skills/project-memory/` — auto-generates CLAUDE.md + LESSONS.md
- **Session memory skill**: `own/skills/session-memory/` — `/remember` commands, mode-based tool access
- **MEMORY.md**: Auto-memory file at `~/.claude/projects/*/memory/MEMORY.md`

---

### 10. Prompt Assembly & System Messages

**Framework**: Agent prompts are assembled from multiple sources at runtime.

**javi-ai implementation**:
- **Global instructions**: `~/.claude/CLAUDE.md` — personality, rules, skill triggers
- **Project instructions**: Per-project CLAUDE.md or `openspec/config.yaml`
- **Skill registry**: `.atl/skill-registry.md` or engram-stored registry
- **Skill loading chain**: Detect context → read SKILL.md → apply patterns
- **Path-scoped rules**: File path patterns trigger convention files (Go, Lua, Obsidian, etc.)
- **Delta overrides**: `delta/overrides/{skill}/SKILL.md` patches upstream skills

---

### 11. Task Decomposition & DAG

**Framework**: Complex work is broken into a dependency graph of tasks.

**javi-ai implementation**:
- **SDD dependency graph**: `proposal → specs ──→ tasks → apply → verify → archive` with `design` in parallel with `specs`
- **Task batching**: For large task lists, batch to sub-agents (e.g., "Phase 1, tasks 1.1-1.3")
- **DAG state tracking**: Orchestrator tracks which artifacts exist per change
- **Fast-forward**: `/sdd-ff` runs the full pipeline: propose → spec → design → tasks

---

### 12. Multi-Agent Teams

**Framework**: Multiple agents collaborate on shared goals.

**javi-ai implementation**:
- **Multi-perspective explore**: Fans out N parallel agents (architecture, testing, risk, DX)
- **Synthesis agent**: Combines perspective reports into one analysis with Agreement Matrix
- **Multi-round iteration**: Unresolved findings trigger re-launch of specific perspectives (max 3 rounds)
- **Adversarial review**: `own/skills/adversarial-review/` — security, quality, and test perspectives in parallel
- **Plan-pact**: `own/skills/plan-pact/` — cross-agent negotiation protocol with Decision Register

---

### 13. Worktree Isolation

**Framework**: Parallel tasks run in isolated filesystem environments.

**javi-ai implementation**:
- **Worktree flow skill**: `own/skills/worktree-flow/SKILL.md` — automated git worktree workflows
- **SDD parallel apply**: `apply.parallel: true` in config enables worktree-per-task
- **Wave execution**: Tasks batched in waves of `max_worktrees` (default 4)
- **Refinery pattern**: Bisection algorithm to isolate merge conflicts in parallel batches
- **Branch naming**: `{prefix}/{task-id}` (e.g., `sdd/{change}/task-{id}`)
- **Cleanup protocol**: Remove worktree → delete branch → prune stale entries

---

### 14. MCP (Model Context Protocol)

**Framework**: Standardized protocol for tool servers.

**javi-ai implementation**:
- **Engram MCP**: Persistent memory server with search, save, timeline, stats
- **Plugin engram**: Duplicate namespace (both `mcp__engram__*` and `mcp__plugin_engram_engram__*`)
- **Deferred tool loading**: Tools listed by name only, schemas loaded on demand via ToolSearch
- **Server instructions**: MCP servers provide usage instructions in system-reminder blocks

---

### 15. Error Recovery & Resilience

**Framework**: Agents handle failures gracefully.

**javi-ai implementation**:
- **Engram recovery**: Two-step protocol (search → get_observation) for truncated results
- **Partial failure in parallel apply**: Merge successful branches, report failures, leave worktrees intact
- **Refinery pattern**: Bisect on merge conflict to isolate culprit task
- **Fallback chains**: Engram → file-based → inline-only for persistence
- **Pre-flight checks**: Clean git state verification before worktree operations
- **Circuit breaker skill**: `own/skills/circuit-breaker/` for external service resilience

---

### 16. Evaluation & Verification

**Framework**: Agents verify their work against acceptance criteria.

**javi-ai implementation**:
- **SDD verify**: `/sdd-verify` validates implementation against specs, design, and tasks
- **LLM evaluation skill**: `own/skills/llm-evaluation/` — automated metrics, LLM-as-Judge
- **Agent testing skill**: `own/skills/agent-testing/` — unit tests for prompts, scenario tests for workflows
- **Score command**: `repoforge score` rates generated skill quality
- **Scan command**: `repoforge scan` checks security of generated output

---

### 17. Cost & Token Tracking

**Framework**: Agents monitor and optimize resource usage.

**javi-ai implementation**:
- **Cost tracking skill**: `own/skills/cost-tracking/` — per-session monitoring, budget alerts, model comparison
- **Token compression**: 5-layer engine with 70-97% reduction
- **Context-prune**: Repoforge command for 42-95% token reduction
- **Nano mode skill**: `own/skills/nano-mode/` — minimal token usage mode
- **Tiered routing**: `own/skills/tiered-routing/` — route to cheaper models for simple tasks

---

### 18. Observability & Debugging

**Framework**: Agents expose internal state for debugging.

**javi-ai implementation**:
- **Debug mode skill**: `own/skills/debug-mode/` — hypothesis-driven debugging with tagged instrumentation
- **Subagent observability**: `own/skills/subagent-observability/` — monitoring sub-agent execution
- **Session audit trail**: `own/skills/session-audit-trail/` — tracking all actions
- **Session analyzer**: `own/skills/session-analyzer/` — post-session analysis
- **Engram timeline**: `mem_timeline` for chronological activity view

---

### 19. Configuration & Extensibility

**Framework**: Agents are configurable and extensible without code changes.

**javi-ai implementation**:
- **Skill system**: `own/skills/` — each skill is a standalone SKILL.md with YAML frontmatter
- **Delta overrides**: `delta/overrides/` — patch upstream skills without forking
- **Config-driven behavior**: `openspec/config.yaml` for SDD, worktree, explore settings
- **Skill creator**: `own/skills/skill-creator/` — meta-skill to create new skills
- **Self-evolving skills**: `own/skills/self-evolving-skills/` — skills that improve over time
- **Plugin system**: `~/.claude/plugins/` — optional extensions (merge-checks, trim-md, mermaid)
- **Path-scoped rules**: File patterns auto-apply conventions

---

## Cross-Reference Index

| Chapter | Primary Skills | Config |
|---------|---------------|--------|
| 1. Agentic Loop | SDD orchestrator (CLAUDE.md) | — |
| 2. Tools | All skills via `allowed-tools` | — |
| 3. Structured Output | SDD sub-agent envelope format | — |
| 4. Planning | sdd-explore, sdd-propose, sdd-spec | openspec/config.yaml |
| 5. Delegation | SDD orchestrator, domain routing | — |
| 6. Context | token-compression, sdd-compact | — |
| 7. Guardrails | agent-governance, skillguard | — |
| 8. Hooks | settings.json, git hooks | settings.json |
| 9. Memory | engram, session-memory, project-memory | — |
| 10. Prompt Assembly | CLAUDE.md, skill registry, delta | — |
| 11. Task DAG | sdd-tasks, sdd-ff | — |
| 12. Multi-Agent | multi-perspective explore, adversarial-review | explore.mode in config |
| 13. Worktrees | worktree-flow, parallel apply | apply.parallel in config |
| 14. MCP | engram MCP server | — |
| 15. Error Recovery | refinery pattern, circuit-breaker | — |
| 16. Evaluation | sdd-verify, llm-evaluation, agent-testing | — |
| 17. Cost | cost-tracking, token-compression, nano-mode | — |
| 18. Observability | debug-mode, subagent-observability | — |
| 19. Extensibility | skill-creator, self-evolving-skills, plugins | — |
