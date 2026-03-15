# sdd-apply Extensions

These extensions are appended to the upstream SKILL.md during installation.
Each extension is tracked with a STATUS comment for easy upstream sync monitoring.

---

## Extension: Granular Task Hygiene (v2.1)

<!-- STATUS: Not yet submitted to agent-teams-lite upstream -->
<!-- ACTION: If Gentleman incorporates per-task commits and mem_save in upstream, remove those subsections -->
<!-- PR: pending -->

**What this adds**: Three behaviors applied after EACH individual task completes, rather than only at the end of the apply phase. Applies to both TDD and Standard workflows.

---

### Per-Task: Atomic Git Commit

After marking each task complete, commit immediately:

```
git add -A
git commit -m "{type}({scope}): {task description}"
```

- `type`: `feat` / `fix` / `refactor` / `test`
- `scope`: primary module or directory affected
- `task description`: task title from tasks.md, lowercased

**Rule**: One commit per task. Never batch multiple tasks into one commit.

---

### Per-Task: Capture Implementation Learnings

After each task commit, save a memory observation for non-obvious decisions:

```
mem_save(
  title: "{type}: {brief description}",
  topic_key: "sdd/{change-name}/apply/{task-id}",
  type: "pattern" | "bugfix",
  project: "{project}",
  content: "What: ...\nWhy: ...\nWhere: ...\nLearned: ..."
)
```

Skip if the task was purely mechanical (renaming, moving files) with no decisions worth preserving.

---

### Rollback Guidance for Mid-Apply Failures

<!-- STATUS: Not yet submitted to agent-teams-lite upstream -->
<!-- ACTION: If Gentleman adds rollback guidance, compare and remove if equivalent -->

If a task fails mid-apply:

1. **Stop immediately** — do not attempt the next task.
2. **Revert partial work**: `git stash` or `git checkout -- .`
3. **Document the failure** in your return summary under `### Issues Found`:
   - What was attempted
   - What broke and why
   - Whether design.md needs correction
4. **Create a follow-up task** in tasks.md: `[ ] {task-id}-retry: {what needs to change first}`
5. **Return to orchestrator** — never silently skip a broken task and continue.
