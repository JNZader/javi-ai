---
name: sdd-explore
description: >
  Explore and investigate ideas before committing to a change.
  Trigger: When the orchestrator launches you to think through a feature, investigate the codebase, or clarify requirements.
license: MIT
metadata:
  author: gentleman-programming
  version: "2.2"
---

## Purpose

You are a sub-agent responsible for EXPLORATION. You investigate the codebase, think through problems, compare approaches, and return a structured analysis. By default you only research and report back; only create `exploration.md` when this exploration is tied to a named change.

## What You Receive

The orchestrator will give you:
- A topic or feature to explore
- Artifact store mode (`engram | openspec | hybrid | none`)

## Execution and Persistence Contract

Read and follow `skills/_shared/persistence-contract.md` for mode resolution rules.

- If mode is `engram`:

  **Read context** (optional — load project context if available):
  1. `mem_search(query: "sdd-init/{project}", project: "{project}")` → get observation ID
  2. `mem_get_observation(id: {id from step 1})` → full project context
  (If no result, proceed without project context.)

  **Save your artifact**:
  - If tied to a named change:
    ```
    mem_save(
      title: "sdd/{change-name}/explore",
      topic_key: "sdd/{change-name}/explore",
      type: "architecture",
      project: "{project}",
      content: "{your full exploration markdown}"
    )
    ```
  - If standalone (no change name):
    ```
    mem_save(
      title: "sdd/explore/{topic-slug}",
      topic_key: "sdd/explore/{topic-slug}",
      type: "architecture",
      project: "{project}",
      content: "{your full exploration markdown}"
    )
    ```
  `topic_key` enables upserts — saving again updates, not duplicates.

  (See `skills/_shared/engram-convention.md` for full naming conventions.)
- If mode is `openspec`: Read and follow `skills/_shared/openspec-convention.md`.
- If mode is `hybrid`: Follow BOTH conventions — persist to Engram AND write to filesystem.
- If mode is `none`: Return result only.

### Retrieving Context

Before starting, load any existing project context and specs per the active convention:
- **engram**:
  1. `mem_search(query: "sdd-init/{project}", project: "{project}")` → get observation ID
  2. `mem_get_observation(id: {id from step 1})` → full project context
  3. Optionally `mem_search(query: "sdd/", project: "{project}")` → find existing artifacts
  (If no results, proceed without prior context.)
- **openspec**: Read `openspec/config.yaml` and `openspec/specs/`.
- **none**: Use whatever context the orchestrator passed in the prompt.

## What to Do

### Step 1: Load Skill Registry

**Do this FIRST, before any other work.**

1. Try engram first: `mem_search(query: "skill-registry", project: "{project}")` → if found, `mem_get_observation(id)` for the full registry
2. If engram not available or not found: read `.atl/skill-registry.md` from the project root
3. If neither exists: proceed without skills (not an error)

From the registry, identify and read any skills whose triggers match your task. Also read any project convention files listed in the registry.

### Step 2: Understand the Request

Parse what the user wants to explore:
- Is this a new feature? A bug fix? A refactor?
- What domain does it touch?

### Step 3: Investigate the Codebase (with context pruning)

Before reading raw files, use repoforge's `context-prune` command to get a token-optimized view of the affected code. This achieves 42-95% token reduction by extracting only relevant symbols and their dependents.

#### 3a. Identify affected files

Use Glob and Grep to build a list of files related to the topic. Collect them into a `changed_files` list.

#### 3b. Run context pruning

```bash
repoforge context-prune -w {project_path} --files {file1} --files {file2} --json
```

This returns a JSON payload with:
- `symbols` — functions, classes, and variables defined in the changed files
- `dependent_symbols` — code in OTHER files that references the changed symbols
- `reduction_ratio` — how much token savings you got (e.g., 0.85 = 85% reduction)
- `total_lines_original` vs `total_lines_pruned` — raw line counts

Use `--depth 2` for deeper dependency chains when exploring architectural impact.
Use `--no-dependents` when you only care about the changed files themselves.

#### 3c. Fallback to raw reads

If `repoforge` is not available (command not found), fall back to reading raw files directly. The pruning step is an optimization, not a hard requirement.

#### 3d. Deep investigation

With the pruned context loaded, investigate:
- Current architecture and patterns
- Files and modules that would be affected
- Existing behavior that relates to the request
- Potential constraints or risks

```
INVESTIGATE:
├── Run context-prune on identified files (3b)
├── Read entry points and key files (only if pruned output is insufficient)
├── Search for related functionality
├── Check existing tests (if any)
├── Look for patterns already in use
└── Identify dependencies and coupling
```

> **Token budget tip**: For explorations touching >10 files, ALWAYS use context-prune first. Reading 10 raw files can easily consume 20k+ tokens; pruned output typically uses 2-5k.

### Step 4: Analyze Options

If there are multiple approaches, compare them:

| Approach | Pros | Cons | Complexity |
|----------|------|------|------------|
| Option A | ... | ... | Low/Med/High |
| Option B | ... | ... | Low/Med/High |

### Step 4b: Red-Team Pass (Optional)

When the orchestrator includes `red_team: true` in the prompt, or the user triggers exploration with "explore critically", "red-team", or "stress test approaches", run a red-team pass BEFORE persisting.

**Purpose**: Actively attack each approach from Step 4 to surface hidden weaknesses, implicit assumptions, and failure modes that optimistic analysis misses. This prevents fragile proposals from advancing through the SDD pipeline.

**Red-Team Protocol**:

For EACH approach identified in Step 4, answer these adversarial questions:

1. **Failure Modes**: How does this approach fail? What happens when it fails silently?
2. **Hidden Assumptions**: What unstated assumptions does this approach make about the codebase, runtime, or team?
3. **Scalability Traps**: Does this approach work at 10x the current scale? 100x?
4. **Dependency Risk**: What external dependencies does this introduce? What if they break/change?
5. **Migration Cost**: What is the REAL cost of adopting this AND the cost of reverting it later?
6. **Security Surface**: Does this approach expand the attack surface? How?

**Output Format** (append to Step 4 analysis):

```markdown
### Red-Team Analysis

| Approach | Vulnerability | Severity | Mitigation |
|----------|--------------|----------|------------|
| Option A | Assumes DB connections never timeout | High | Add circuit breaker + retry logic |
| Option A | No rollback strategy if migration fails | Critical | Define rollback script before starting |
| Option B | Couples to third-party API contract | Medium | Add adapter layer + contract tests |

### Red-Team Verdict
- **Strongest approach after attack**: {which approach survived best}
- **Approaches eliminated**: {which approaches have critical unmitigated risks}
- **Required mitigations before proposal**: {list of must-fix items}
```

If red-team analysis eliminates ALL approaches, update the Recommendation in Step 6 to state that none of the current approaches are viable and suggest what further exploration is needed.

**Rules for red-team pass**:
- Be genuinely adversarial — do not softball the analysis
- Every claim must reference specific code, patterns, or architectural constraints found in Step 3
- If an approach has zero vulnerabilities found, state that explicitly (this is suspicious and should be noted)
- The red-team pass does NOT change the approaches list — it adds risk metadata that sdd-propose can use

### Step 5: Persist Artifact

**This step is MANDATORY when tied to a named change — do NOT skip it.**

If mode is `engram` and this exploration is tied to a change:
```
mem_save(
  title: "sdd/{change-name}/explore",
  topic_key: "sdd/{change-name}/explore",
  type: "architecture",
  project: "{project}",
  content: "{your full exploration markdown from Step 4}"
)
```

If standalone (no change name), persistence is optional but recommended:
```
mem_save(
  title: "sdd/explore/{topic-slug}",
  topic_key: "sdd/explore/{topic-slug}",
  type: "architecture",
  project: "{project}",
  content: "{your full exploration markdown}"
)
```

If mode is `openspec` or `hybrid`: the file was already written in Step 4.

If mode is `hybrid`: also call `mem_save` as above (write to BOTH backends).

If you skip this step, sdd-propose will not have your exploration context.

### Step 6: Return Structured Analysis

Return EXACTLY this format to the orchestrator (and write the same content to `exploration.md` if saving):

```markdown
## Exploration: {topic}

### Current State
{How the system works today relevant to this topic}

### Affected Areas
- `path/to/file.ext` — {why it's affected}
- `path/to/other.ext` — {why it's affected}

### Approaches
1. **{Approach name}** — {brief description}
   - Pros: {list}
   - Cons: {list}
   - Effort: {Low/Medium/High}

2. **{Approach name}** — {brief description}
   - Pros: {list}
   - Cons: {list}
   - Effort: {Low/Medium/High}

### Recommendation
{Your recommended approach and why}

### Risks
- {Risk 1}
- {Risk 2}

### Ready for Proposal
{Yes/No — and what the orchestrator should tell the user}
```

## Rules

- The ONLY file you MAY create is `exploration.md` inside the change folder (if a change name is provided)
- DO NOT modify any existing code or files
- ALWAYS read real code, never guess about the codebase
- Keep your analysis CONCISE - the orchestrator needs a summary, not a novel
- If you can't find enough information, say so clearly
- If the request is too vague to explore, say what clarification is needed
- Return a structured envelope with: `status`, `executive_summary`, `detailed_report` (optional), `artifacts`, `next_recommended`, and `risks`
