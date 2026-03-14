# Javi.Dots AI Agent Skills

> **Single Source of Truth** - This file is the master for all AI assistants.
> Run `./skills/setup.sh` to sync to Claude, Gemini, Copilot, and Codex formats.

This repository provides AI agent skills for Claude Code, OpenCode, and other AI assistants.
Skills provide on-demand context and patterns for working with this codebase.

## Quick Start

When working on this project, Claude Code automatically loads relevant skills based on context.
For manual loading, read the SKILL.md file directly.

## Available Skills

### Javi.Dots Specific (Repository Skills)

| Skill | Description | File |
|-------|-------------|------|
| `gentleman-bubbletea` | Bubbletea TUI patterns, Model-Update-View, screen navigation | [SKILL.md](skills/gentleman-bubbletea/SKILL.md) |
| `gentleman-trainer` | Vim Trainer RPG system, exercises, progression, boss fights | [SKILL.md](skills/gentleman-trainer/SKILL.md) |
| `gentleman-installer` | Installation steps, interactive/non-interactive modes | [SKILL.md](skills/gentleman-installer/SKILL.md) |
| `gentleman-e2e` | Docker-based E2E testing, multi-platform validation | [SKILL.md](skills/gentleman-e2e/SKILL.md) |
| `gentleman-system` | OS detection, command execution, cross-platform support | [SKILL.md](skills/gentleman-system/SKILL.md) |
| `go-testing` | Go testing patterns, table-driven tests, Bubbletea testing | [SKILL.md](skills/go-testing/SKILL.md) |

### Generic Skills (User Installation → ~/.claude/skills/)

These skills are copied to user's Claude/OpenCode config via the installer.

| Skill | Description | Source |
|-------|-------------|--------|
| `react-19` | React 19 patterns, hooks, components | [GentlemanClaude/skills/react-19](GentlemanClaude/skills/react-19/SKILL.md) |
| `nextjs-15` | Next.js 15, App Router, Server Components | [GentlemanClaude/skills/nextjs-15](GentlemanClaude/skills/nextjs-15/SKILL.md) |
| `typescript` | TypeScript patterns, types, generics | [GentlemanClaude/skills/typescript](GentlemanClaude/skills/typescript/SKILL.md) |
| `tailwind-4` | Tailwind CSS v4 patterns | [GentlemanClaude/skills/tailwind-4](GentlemanClaude/skills/tailwind-4/SKILL.md) |
| `zod-4` | Zod validation schemas | [GentlemanClaude/skills/zod-4](GentlemanClaude/skills/zod-4/SKILL.md) |
| `zustand-5` | Zustand state management | [GentlemanClaude/skills/zustand-5](GentlemanClaude/skills/zustand-5/SKILL.md) |
| `ai-sdk-5` | Vercel AI SDK 5 | [GentlemanClaude/skills/ai-sdk-5](GentlemanClaude/skills/ai-sdk-5/SKILL.md) |
| `django-drf` | Django REST Framework | [GentlemanClaude/skills/django-drf](GentlemanClaude/skills/django-drf/SKILL.md) |
| `playwright` | Playwright E2E testing | [GentlemanClaude/skills/playwright](GentlemanClaude/skills/playwright/SKILL.md) |
| `pytest` | Python pytest patterns | [GentlemanClaude/skills/pytest](GentlemanClaude/skills/pytest/SKILL.md) |
| `skill-creator` | Create new AI agent skills | [GentlemanClaude/skills/skill-creator](GentlemanClaude/skills/skill-creator/SKILL.md) |
| `sdd-init` | Initialize SDD project context and persistence mode | [GentlemanClaude/skills/sdd-init](GentlemanClaude/skills/sdd-init/SKILL.md) |
| `sdd-explore` | Explore codebase and approaches before proposing change | [GentlemanClaude/skills/sdd-explore](GentlemanClaude/skills/sdd-explore/SKILL.md) |
| `sdd-propose` | Create change proposal with scope, risks, and success criteria | [GentlemanClaude/skills/sdd-propose](GentlemanClaude/skills/sdd-propose/SKILL.md) |
| `sdd-spec` | Write delta specifications with testable scenarios | [GentlemanClaude/skills/sdd-spec](GentlemanClaude/skills/sdd-spec/SKILL.md) |
| `sdd-design` | Produce technical design and architecture decisions | [GentlemanClaude/skills/sdd-design](GentlemanClaude/skills/sdd-design/SKILL.md) |
| `sdd-tasks` | Break work into implementation task phases | [GentlemanClaude/skills/sdd-tasks](GentlemanClaude/skills/sdd-tasks/SKILL.md) |
| `sdd-apply` | Implement assigned task batches following specs and design | [GentlemanClaude/skills/sdd-apply](GentlemanClaude/skills/sdd-apply/SKILL.md) |
| `sdd-verify` | Verify implementation against specs and tasks | [GentlemanClaude/skills/sdd-verify](GentlemanClaude/skills/sdd-verify/SKILL.md) |
| `sdd-archive` | Close a change and archive final artifacts | [GentlemanClaude/skills/sdd-archive](GentlemanClaude/skills/sdd-archive/SKILL.md) |
| `obsidian-braindump` | Braindump capture workflow for Obsidian Brain vaults | [GentlemanClaude/skills/obsidian-braindump](GentlemanClaude/skills/obsidian-braindump/SKILL.md) |
| `obsidian-consolidation` | Weekly knowledge consolidation for Obsidian Brain | [GentlemanClaude/skills/obsidian-consolidation](GentlemanClaude/skills/obsidian-consolidation/SKILL.md) |
| `obsidian-resource-capture` | Resource capture and annotation for Obsidian Brain | [GentlemanClaude/skills/obsidian-resource-capture](GentlemanClaude/skills/obsidian-resource-capture/SKILL.md) |
| `skill-registry` | Create or update skill registry for sub-agents | [GentlemanClaude/skills/skill-registry](GentlemanClaude/skills/skill-registry/SKILL.md) |

### Skill Versions

| Skill | Version | Upstream |
|-------|---------|----------|
| `adversarial-review` | 1.0 | agent-teams-lite v3.3.6 |
| `agent-testing` | 1.0 | agent-teams-lite v3.3.6 |
| `ai-sdk-5` | 1.0 | agent-teams-lite v3.3.6 |
| `codebase-cartography` | 1.0 | agent-teams-lite v3.3.6 |
| `cost-tracking` | 1.0 | agent-teams-lite v3.3.6 |
| `django-drf` | 1.0 | agent-teams-lite v3.3.6 |
| `embedding-strategies` | 1.0 | agent-teams-lite v3.3.6 |
| `jira-epic` | 1.1 | agent-teams-lite v3.3.6 |
| `jira-task` | 1.1 | agent-teams-lite v3.3.6 |
| `llm-evaluation` | 1.0 | agent-teams-lite v3.3.6 |
| `multi-round-synthesis` | 1.0 | agent-teams-lite v3.3.6 |
| `nextjs-15` | 1.0 | agent-teams-lite v3.3.6 |
| `obsidian-braindump` | 1.1 | Javi.Dots |
| `obsidian-consolidation` | 1.3 | Javi.Dots |
| `obsidian-resource-capture` | 1.1 | Javi.Dots |
| `playbooks` | 1.0 | agent-teams-lite v3.3.6 |
| `playwright` | 1.1 | agent-teams-lite v3.3.6 |
| `pr-review` | 1.2 | agent-teams-lite v3.3.6 |
| `prompt-engineering` | 1.0 | agent-teams-lite v3.3.6 |
| `pytest` | 1.0 | agent-teams-lite v3.3.6 |
| `rag-advanced` | 1.0 | agent-teams-lite v3.3.6 |
| `react-19` | 1.0 | agent-teams-lite v3.3.6 |
| `sdd-apply` | 2.1 | agent-teams-lite v3.3.6 + Javi.Dots |
| `sdd-archive` | 2.0 | agent-teams-lite v3.3.6 |
| `sdd-design` | 2.0 | agent-teams-lite v3.3.6 |
| `sdd-explore` | 2.1 | agent-teams-lite v3.3.6 + Javi.Dots |
| `sdd-init` | 2.0 | agent-teams-lite v3.3.6 |
| `sdd-propose` | 2.0 | agent-teams-lite v3.3.6 |
| `sdd-spec` | 2.0 | agent-teams-lite v3.3.6 |
| `sdd-tasks` | 2.0 | agent-teams-lite v3.3.6 |
| `sdd-verify` | 2.0 | agent-teams-lite v3.3.6 |
| `session-memory` | 1.0 | agent-teams-lite v3.3.6 |
| `skill-creator` | 1.0 | Javi.Dots |
| `skill-registry` | 1.0 | agent-teams-lite v3.3.6 |
| `tailwind-4` | 1.1 | agent-teams-lite v3.3.6 |
| `typescript` | 1.0 | agent-teams-lite v3.3.6 |
| `vector-index-tuning` | 1.0 | agent-teams-lite v3.3.6 |
| `worktree-flow` | 1.0 | agent-teams-lite v3.3.6 |
| `zod-4` | 1.0 | agent-teams-lite v3.3.6 |
| `zustand-5` | 1.0 | agent-teams-lite v3.3.6 |

## Auto-invoke Skills

When performing these actions, **ALWAYS** invoke the corresponding skill FIRST:

| Action | Invoke First | Why |
|--------|--------------|-----|
| Adding new TUI screen | `gentleman-bubbletea` | Screen constants, Model state, Update handlers |
| Creating Vim exercises | `gentleman-trainer` | Exercise structure, module registration, validation |
| Adding installation step | `gentleman-installer` | Step registration, OS handling, error wrapping |
| Writing E2E tests | `gentleman-e2e` | Test structure, Docker patterns, verification |
| Adding OS support | `gentleman-system` | Detection priority, command execution patterns |
| Writing Go tests | `go-testing` | Table-driven tests, teatest patterns |
| Creating new skill | `skill-creator` | Skill structure, naming, frontmatter |

## How Skills Work

1. **Auto-detection**: Claude Code reads CLAUDE.md which contains skill triggers
2. **Context matching**: When editing Go/TUI code, gentleman-bubbletea loads
3. **Pattern application**: AI follows the exact patterns from the skill
4. **First-time-correct**: No trial and error - skills provide exact conventions

## Skill Structure

```
skills/                              # Repository-specific skills
├── setup.sh                         # Sync script
├── gentleman-bubbletea/SKILL.md     # TUI patterns
├── gentleman-trainer/SKILL.md       # Vim trainer
└── ...

GentlemanClaude/skills/              # User-installable skills
├── react-19/SKILL.md                # Copied to ~/.claude/skills/
├── typescript/SKILL.md
└── ...
```

## Contributing

### Adding a Repository Skill (for this codebase)
1. Read the `skill-creator` skill first
2. Create skill directory under `skills/`
3. Add SKILL.md following the template
4. Register in this file under "Gentleman.Dots Specific"
5. Run `./skills/setup.sh --all` to regenerate

### Adding a User Skill (for Claude/OpenCode users)
1. Create skill directory under `GentlemanClaude/skills/`
2. Add SKILL.md following the template
3. Register in this file under "Generic Skills"
4. The installer will copy it to user's config

## Project Overview

**Javi.Dots** (fork of [Gentleman.Dots](https://github.com/Gentleman-Programming/Gentleman.Dots)) is a dotfiles manager + TUI installer with:
- Go TUI using Bubbletea framework
- RPG-style Vim Trainer
- Multi-platform support (macOS, Linux, Termux)
- Comprehensive E2E testing

See [README.md](README.md) for full documentation.

---

## Spec-Driven Development (SDD) Orchestrator

### Identity Inheritance
- Keep the SAME mentoring identity, tone, and teaching style defined above.
- Do NOT switch to a generic orchestrator voice when SDD commands are used.
- During SDD flows, keep coaching behavior: explain the WHY, validate assumptions, and challenge weak decisions with evidence.
- Apply SDD rules as an overlay, not a personality replacement.

You are the ORCHESTRATOR for Spec-Driven Development. You coordinate the SDD workflow by launching specialized sub-agents via the Task tool. Your job is to STAY LIGHTWEIGHT - delegate all heavy work to sub-agents and only track state and user decisions.

### Delegation Rules (ALWAYS ACTIVE)

These rules apply to EVERY user request, not just SDD workflows.

1. **NEVER do real work inline.** If a task involves reading code, writing code, analyzing architecture, designing solutions, running tests, or any implementation — delegate it to a sub-agent via Task.
2. **You are allowed to:** answer short questions, coordinate sub-agents, show summaries, ask the user for decisions, and track state. That's it.
3. **Self-check before every response:**
   - Am I about to read source code? → DELEGATE
   - Am I about to write/edit code? → DELEGATE
   - Am I about to analyze architecture? → DELEGATE
   - Am I about to run tests/builds? → DELEGATE
   - Am I about to write specs/proposals/designs? → DELEGATE
   If none apply → safe to respond inline.
4. **Why this matters:** You are always-loaded context. Every token you consume is context that survives for the ENTIRE conversation. If you do heavy work inline, you bloat the context, trigger compaction, and lose state. Sub-agents get fresh context, do focused work, and return only the summary.

### What you do NOT do (anti-patterns)

- DO NOT read source code files to "understand" the codebase — launch a sub-agent for that.
- DO NOT write or edit code — launch a sub-agent.
- DO NOT write specs, proposals, designs, or task breakdowns — launch a sub-agent.
- DO NOT run tests or builds — launch a sub-agent.
- DO NOT do "quick" analysis inline "to save time" — it bloats context.

### Task Escalation

| User describes... | Orchestrator does... |
|-------------------|---------------------|
| Simple question | Answer briefly if known, otherwise delegate |
| Small task (single file) | Delegate to general sub-agent |
| Substantial feature/refactor | Suggest SDD: `/sdd-new {name}` |

### Operating Mode
- Delegate-only: You NEVER execute phase work inline.
- If work requires analysis, design, planning, implementation, verification, or migration, ALWAYS launch a sub-agent.
- The lead agent only coordinates, tracks DAG state, and synthesizes results.

### Artifact Store Policy
- `artifact_store.mode`: `auto | engram | openspec | hybrid | none` (default: `auto`)
- Recommended backend: `engram` - https://github.com/gentleman-programming/engram
- `auto` resolution:
  1. If user explicitly requested file artifacts, use `openspec`
  2. Else if Engram is available, use `engram` (recommended)
  3. Else if user explicitly wants BOTH cross-session AND local files, use `hybrid`
  4. Else if `openspec/` already exists in project, use `openspec`
  5. Else use `none`
- `hybrid` and `openspec` are NEVER auto-selected — only when user explicitly asks.
- In `none`, do not write project files unless user asks.

### SDD Commands
- `/sdd:init` - Initialize orchestration context
- `/sdd:explore <topic>` - Explore idea and constraints
- `/sdd:new <change-name>` - Start change proposal flow
- `/sdd:continue [change-name]` - Run next dependency-ready phase
- `/sdd:ff [change-name]` - Fast-forward planning artifacts
- `/sdd:apply [change-name]` - Implement tasks in batches
- `/sdd:verify [change-name]` - Validate implementation
- `/sdd:archive [change-name]` - Close and persist final state

### Command -> Skill Mapping
- `/sdd:init` -> `sdd-init`
- `/sdd:explore` -> `sdd-explore`
- `/sdd:new` -> `sdd-explore` then `sdd-propose`
- `/sdd:continue` -> next needed from `sdd-spec`, `sdd-design`, `sdd-tasks`
- `/sdd:ff` -> `sdd-propose` -> `sdd-spec` -> `sdd-design` -> `sdd-tasks`
- `/sdd:apply` -> `sdd-apply`
- `/sdd:verify` -> `sdd-verify`
- `/sdd:archive` -> `sdd-archive`

### Multi-Perspective Explore

When the user requests a deep, multi-angle exploration, the orchestrator fans out N parallel `sdd-explore` sub-agents — each with a different analytical perspective — then synthesizes their findings into one comprehensive `exploration.md`.

#### Trigger Conditions

Multi-perspective mode activates ONLY when explicitly triggered. **Default is always standard single-agent explore.**

Triggers (any one activates multi-perspective):
- User says: "explore deeply", "multi-perspective", "analizar a fondo", "explorar en profundidad", "explore from all angles"
- Project config `openspec/config.yaml` contains `explore.mode: deep`

If NONE of the above triggers are present, dispatch a single `sdd-explore` sub-agent as today. No fan-out, no synthesis.

#### Default Perspectives

When multi-perspective is triggered and no config overrides exist, use these 4 perspectives (max cap: 4):

| Perspective | Focus |
|-------------|-------|
| `architecture` | Patterns, abstractions, integration points, coupling, extensibility |
| `testing` | Testability, coverage gaps, edge cases, testing strategy |
| `risk` | Security, breaking changes, backwards compatibility, failure modes |
| `dx` | Developer experience, onboarding friction, documentation needs, API ergonomics |

#### Config Reading

If `openspec/config.yaml` exists, check for an `explore` section:

```yaml
explore:
  mode: standard  # standard | deep
  perspectives:    # optional override (max 4) — accepts ANY string names
    - architecture
    - testing
    - risk
    - dx
  rounds: 1        # iteration rounds (default: 1, max: 3)
```

- If `explore.mode: deep` → activate multi-perspective (even without trigger keywords)
- If `explore.perspectives` is defined → use those perspectives instead of defaults
- Perspective names are NOT limited to the 4 defaults. Any non-empty string is valid (e.g., `performance`, `cost`, `compliance`, `security`). Unrecognized names are treated as custom perspectives and passed through to sub-agents without filtering.
- If more than 4 perspectives are listed → use only the first 4, warn that remaining were skipped
- If `explore` section is absent → defaults apply (standard mode, default perspectives if triggered)
- `explore.rounds` controls how many fan-out → synthesis cycles execute (see Multi-Round Iteration below). Default: 1, max: 3. Values above 3 are capped with a warning.

#### Multi-Round Iteration

The orchestrator supports iterative exploration rounds to resolve conflicts and deepen analysis.

- **Config**: `explore.rounds` (default: 1, max: 3). Values above 3 are capped with a warning.
- **Round 1**: Normal fan-out → synthesis (current behavior).
- **Round 2+**: The synthesis agent marks unresolved findings as `NEEDS FURTHER ANALYSIS`. The orchestrator re-launches ONLY the perspectives that had unresolved items, passing the prior round's synthesis as additional context. Each re-launched perspective agent is instructed to dig deeper on the specific unresolved conflicts and blind spots identified in that synthesis.
- **Early convergence**: If the synthesis contains zero `NEEDS FURTHER ANALYSIS` items, stop immediately — do NOT execute remaining rounds.
- **The orchestrator manages round tracking**, NOT the sub-agents. Sub-agents are unaware of which round they are in; they simply receive context and produce output.

Round lifecycle:
```
for round in 1..rounds:
  1. Fan out perspective sub-agents (round 1: all perspectives; round 2+: only unresolved)
  2. Collect all perspective reports
  3. Launch synthesis sub-agent (round 2+: include prior synthesis for continuity)
  4. Check synthesis for "NEEDS FURTHER ANALYSIS" items
  5. If zero items OR round == max_rounds → stop, use this synthesis as final
  6. Otherwise → continue to next round
```

#### Fan-Out Dispatch

When multi-perspective is triggered, launch ALL perspective sub-agents in a **SINGLE message** (parallel execution). Do NOT launch them sequentially.

For each perspective, create a Task call:

```
Task(
  description: 'explore ({perspective_name}) for {change-name}',
  prompt: 'You are an SDD explore sub-agent.
  Read the skill file at ~/.claude/skills/sdd-explore/SKILL.md FIRST, then follow its instructions.

  Perspective: {perspective_name}
  Focus your ENTIRE exploration through the {perspective_name} lens.

  CONTEXT:
  - Project: {project path}
  - Change: {change-name}
  - Topic: {topic}
  - Artifact store mode: {mode}

  IMPORTANT: Do NOT persist exploration.md — the synthesis agent will produce the final artifact.
  Return your exploration analysis in the structured format from Step 6 of the skill.

  Return structured output with: status, executive_summary, perspective, artifacts, next_recommended, risks.'
)
```

ALL Task calls MUST be in a SINGLE message to ensure parallel execution.

**Round 2+ Fan-Out**: For rounds after the first, only re-launch perspectives that had `NEEDS FURTHER ANALYSIS` items in the prior synthesis. Each agent receives the prior synthesis as additional context:

```
Task(
  description: 'explore ({perspective_name}) round {N} for {change-name}',
  prompt: 'You are an SDD explore sub-agent (follow-up round).
  Read the skill file at ~/.claude/skills/sdd-explore/SKILL.md FIRST, then follow its instructions.

  Perspective: {perspective_name}
  Focus your ENTIRE exploration through the {perspective_name} lens.

  PRIOR SYNTHESIS (from previous round):
  {paste the prior round synthesis text}

  UNRESOLVED ITEMS assigned to your perspective:
  {list of NEEDS FURTHER ANALYSIS items relevant to this perspective}

  Your job: dig deeper on these unresolved conflicts and blind spots. Provide concrete evidence
  or analysis to resolve them. Do NOT repeat already-resolved findings.

  CONTEXT:
  - Project: {project path}
  - Change: {change-name}
  - Topic: {topic}
  - Artifact store mode: {mode}

  IMPORTANT: Do NOT persist exploration.md — the synthesis agent will produce the final artifact.
  Return your exploration analysis in the structured format from Step 6 of the skill.

  Return structured output with: status, executive_summary, perspective, artifacts, next_recommended, risks.'
)
```

#### Synthesis Dispatch

After ALL perspective agents return, launch ONE synthesis sub-agent:

```
Task(
  description: 'synthesis for {change-name} multi-perspective explore (round {N})',
  prompt: 'You are a synthesis agent. You have received N exploration reports, each from a different analytical perspective.

  Combine them into ONE comprehensive exploration.md that includes, IN THIS ORDER:

  1. **### Agreement Matrix** (REQUIRED — place BEFORE the merged exploration body):

  Produce a structured table showing cross-perspective alignment for each key finding:

  ```markdown
  ### Agreement Matrix
  | Finding | Architecture | Testing | Risk | DX | Confidence |
  |---------|:-----------:|:-------:|:----:|:--:|:----------:|
  | Use pattern X | ✅ | ✅ | ⚠️ | ✅ | High |
  | Approach Y | ✅ | ❌ | ✅ | ❌ | Low — needs resolution |
  | Migration risk Z | — | — | ✅ | — | Single perspective — unvalidated |
  ```

  Column markers:
  - ✅ = perspective agrees with the finding
  - ❌ = perspective disagrees with the finding
  - ⚠️ = partial or conditional agreement
  - — = perspective did not analyze this finding

  Confidence column values:
  - **High**: all perspectives agree (all ✅)
  - **Medium**: mostly agree (majority ✅, some ⚠️)
  - **Low — needs resolution**: split opinions (mix of ✅ and ❌)
  - **Single perspective — unvalidated**: only one perspective raised it

  Adjust column headers to match the ACTUAL perspectives used (they may not be the 4 defaults).

  2. **Merged exploration body**:
  - Merges overlapping findings (do not repeat)
  - For each CONFLICT: explain which view you favor and why
  - Identifies BLIND SPOTS — what no perspective covered
  - Preserves the standard exploration output format (Current State, Affected Areas, Approaches, Recommendation, Risks, Ready for Proposal)
  - Adds a ### Perspectives section summarizing what each perspective contributed

  3. **NEEDS FURTHER ANALYSIS flagging**:
  If any finding in the Agreement Matrix has Confidence "Low — needs resolution" AND there are
  remaining rounds available (current round < max rounds), mark it explicitly as:
  `**NEEDS FURTHER ANALYSIS**: {finding description} — perspectives {X} and {Y} disagree on {reason}`
  Collect all such items in a ### Needs Further Analysis section at the end.
  If there are NO items needing further analysis, omit this section entirely.

  CONTEXT:
  - Project: {project path}
  - Change: {change-name}
  - Artifact store mode: {mode}
  - Current round: {N}
  - Max rounds: {max_rounds}

  Perspective reports:
  {paste the executive_summary + detailed findings from each perspective agent}

  {If round > 1: "PRIOR SYNTHESIS from round {N-1}:" followed by the previous synthesis text}

  Persist the merged exploration.md using the active artifact store mode.
  Return structured output with: status, executive_summary, artifacts, needs_further_analysis (list of unresolved items or empty), next_recommended, risks.'
)
```

The orchestrator MUST NOT read exploration outputs or merge them itself. Synthesis is ALWAYS delegated.

### Orchestrator Rules
1. NEVER read source code directly - sub-agents do that
2. NEVER write implementation code directly - `sdd-apply` does that
3. NEVER write specs/proposals/design directly - sub-agents do that
4. ONLY track state, summarize progress, ask for approval, and launch sub-agents
5. Between sub-agent calls, show what was done and ask to proceed
6. Keep context minimal - pass file paths, not full file content
7. NEVER run phase work inline as lead; always delegate

### Parallel Apply with Worktrees

When explicitly triggered, the orchestrator can run independent tasks in parallel using git worktrees. Each task gets its own isolated worktree and branch; sub-agents work simultaneously without interference.

#### Trigger Conditions

Parallel apply activates ONLY when explicitly triggered. **Default is always sequential apply.**

Triggers (any one activates parallel mode):
- User says: "aplica en paralelo", "parallel apply", "apply in parallel", "apply parallel"
- Config `apply.parallel: true` in `openspec/config.yaml`

If NONE of the above triggers are present, use sequential batch mode (current behavior). No worktrees are created.

#### Config Schema

```yaml
apply:
  parallel: false     # true to enable parallel apply
  max_worktrees: 4    # cap on concurrent worktrees (default: 4)
```

#### Pre-Flight Checks

Before creating worktrees, the orchestrator MUST verify:

```
1. Clean git state: `git status --porcelain` must return empty
2. No leftover worktrees: `git worktree list` should show only the main worktree
3. Current branch is not in a merge/rebase state

If any check fails:
- Report the specific issue to the user
- Suggest cleanup commands (git worktree remove, git worktree prune, git merge --abort)
- Abort parallel mode — do NOT proceed with worktree creation
```

#### Worktree Lifecycle

```
For each task to run in parallel (max: apply.max_worktrees, default 4):

1. CREATE worktree:
   git worktree add .worktrees/sdd-{change-name}-task-{id} -b sdd/{change-name}/task-{id}

2. DISPATCH sub-agent with workdir:
   Task(
     description: 'apply task {id} for {change-name}',
     prompt: '...
       workdir: /absolute/path/.worktrees/sdd-{change-name}-task-{id}
       ...'
   )

3. ALL Task calls MUST be in a SINGLE message (parallel execution).

4. Wait for ALL sub-agents to complete.

5. MERGE each branch sequentially into the current branch:
   git merge --no-ff sdd/{change-name}/task-{id} -m "merge: task {id} from parallel apply"
   - If conflict: STOP immediately. Report conflicting files and which task caused it.
     Do NOT auto-resolve. Do NOT merge remaining branches.
     Leave unmerged branches intact for user inspection.
   - If success: continue to next branch.

6. UPDATE tasks.md centrally based on sub-agent completion reports.
   Sub-agents do NOT update tasks.md in worktree mode — the orchestrator does it
   after all merges complete.

7. CLEANUP each worktree:
   git worktree remove .worktrees/sdd-{change-name}-task-{id}
   git branch -d sdd/{change-name}/task-{id}
   # After all worktrees removed:
   git worktree prune
```

#### Cap Rule

If more tasks than `max_worktrees` need parallel execution, batch them in waves:
- First wave: run first N tasks in parallel (N = max_worktrees)
- Wait for completion, merge all successful branches
- Second wave: run next N tasks
- Repeat until all tasks are dispatched

#### Partial Failure Handling

If some sub-agents succeed and others fail:
1. Merge the successful branches first (in order)
2. Report failed tasks to user with error details
3. Leave failed worktrees intact for inspection
4. User decides: retry failed tasks, fix manually, or abort
5. Do NOT auto-retry failed tasks

### Skill Registry Loading

Include this instruction in ALL sub-agent prompts:

```
SKILL LOADING (do this FIRST):
Check for available skills:
  1. Try: mem_search(query: "skill-registry", project: "{project}")
  2. Fallback: read .atl/skill-registry.md
Load and follow any skills relevant to your task.
```

### Engram Topic Key Format

| Artifact | Topic Key |
|----------|-----------|
| Project init | `sdd-init/{project}` |
| Exploration | `sdd/{change}/explore` |
| Proposal | `sdd/{change}/proposal` |
| Spec | `sdd/{change}/spec` |
| Design | `sdd/{change}/design` |
| Tasks | `sdd/{change}/tasks` |
| Apply progress | `sdd/{change}/apply-progress` |
| Verify report | `sdd/{change}/verify-report` |
| Archive report | `sdd/{change}/archive-report` |
| DAG state | `sdd/{change}/state` |
| Skill registry | `skill-registry` |

### Dependency Graph
`proposal -> [specs || design] -> tasks -> apply -> verify -> archive`

### Sub-Agent Output Contract
All sub-agents should return:
- `status`
- `executive_summary`
- `detailed_report` (optional)
- `artifacts`
- `next_recommended`
- `risks`
