# Discovery Relay — Prompt Templates

Copy-paste templates for integrating discovery relay into SDD parallel apply.

---

## 1. Sub-Agent Discovery Save (Add to sdd-apply prompts)

Append this instruction block to every sub-agent prompt in parallel apply mode:

```markdown
DISCOVERY RELAY:
After completing your assigned task(s), check if you encountered any non-obvious runtime insights
(API constraints, initialization order, type quirks, pattern deviations, performance gotchas).

If YES — save each discovery:
```
mem_save(
  title: "sdd/{change-name}/discoveries/wave-{wave-number}/task-{task-id}",
  topic_key: "sdd/{change-name}/discoveries/wave-{wave-number}/task-{task-id}",
  type: "discovery",
  project: "{project}",
  content: "**What**: {one-line insight}
**Why**: {what you were doing when you found it}
**Where**: {file paths affected}
**Impact**: {which future tasks or areas need this}"
)
```

If NO discoveries — skip this step. Do NOT save empty discoveries.
Keep each discovery under 100 words.
```

---

## 2. Orchestrator Collect Logic (Between waves)

Insert this logic between wave completion and next wave dispatch:

```markdown
### Collect Discoveries from Wave {N}

1. Search for wave {N} discoveries:
   ```
   mem_search(query: "sdd/{change-name}/discoveries/wave-{N}", project: "{project}", limit: 10)
   ```

2. For each result found, retrieve full content:
   ```
   mem_get_observation(id: {observation-id})
   ```

3. Aggregate discoveries into a context block:
   ```
   DISCOVERIES FROM PREVIOUS WAVES:
   (Runtime insights from completed tasks. Use these to avoid known pitfalls.)

   - [Task {id}] {What field from discovery}
   - [Task {id}] {What field from discovery}
   ```

4. If zero discoveries found: proceed without the DISCOVERIES block.
5. If more than 10 discoveries: take the 10 most recent, log warning.
```

---

## 3. Orchestrator Inject Template (Wave N+1 dispatch)

Add the collected discoveries block to each wave N+1 sub-agent prompt, placed AFTER the task assignment and BEFORE the return format:

```markdown
Task(
  description: 'apply task {id} for {change-name} (wave {N+1})',
  prompt: 'You are an SDD sub-agent. Read the skill file at ~/.claude/skills/sdd-apply/SKILL.md FIRST.

  CONTEXT:
  - Project: {project path}
  - Change: {change-name}
  - Artifact store mode: {mode}
  - Wave: {N+1}

  TASK:
  Implement tasks {task-ids} from the task breakdown.

  DISCOVERIES FROM PREVIOUS WAVES:
  (Runtime insights from completed tasks. Use these to avoid known pitfalls.)

  - [Task 1.1] {discovery what}
  - [Task 1.3] {discovery what}

  DISCOVERY RELAY:
  After completing your task(s), save any new non-obvious discoveries:
  mem_save(
    title: "sdd/{change-name}/discoveries/wave-{N+1}/task-{task-id}",
    topic_key: "sdd/{change-name}/discoveries/wave-{N+1}/task-{task-id}",
    type: "discovery",
    project: "{project}",
    content: "**What**: ...\n**Why**: ...\n**Where**: ...\n**Impact**: ..."
  )

  Return structured output with: status, executive_summary, artifacts, next_recommended, risks.'
)
```

---

## 4. Wave 1 Prompt (No Prior Discoveries)

Wave 1 has no discoveries to inject — only include the save instruction:

```markdown
Task(
  description: 'apply task {id} for {change-name} (wave 1)',
  prompt: '...

  DISCOVERY RELAY:
  After completing your task(s), save any non-obvious runtime insights:
  mem_save(
    title: "sdd/{change-name}/discoveries/wave-1/task-{task-id}",
    topic_key: "sdd/{change-name}/discoveries/wave-1/task-{task-id}",
    type: "discovery",
    project: "{project}",
    content: "**What**: ...\n**Why**: ...\n**Where**: ...\n**Impact**: ..."
  )
  Skip if no discoveries.

  ...'
)
```

---

## 5. Full Orchestrator Wave Lifecycle (Updated)

```
for wave in 1..total_waves:

  # Collect discoveries from previous wave (skip for wave 1)
  if wave > 1:
    discoveries = mem_search("sdd/{change}/discoveries/wave-{wave-1}", limit=10)
    discovery_block = format_discoveries(discoveries)

  # Dispatch sub-agents for this wave
  for task in wave_tasks:
    prompt = build_apply_prompt(task, change, mode)
    if wave > 1 and discoveries:
      prompt += discovery_block
    prompt += discovery_save_instruction(change, wave, task.id)
    dispatch(prompt)

  # Wait for all sub-agents to complete
  # Merge branches sequentially
  # Update tasks.md
```
