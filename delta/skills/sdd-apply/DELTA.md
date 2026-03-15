# DELTA: sdd-apply v2.1

## Changes from upstream v2.0

**Source**: `upstream/skills/` (agent-teams-lite)
**Modified version**: `delta/skills/sdd-apply/` (Javi.Dots / GentlemanClaude)

### What changed

- **Task state tracking**: v2.1 integrates with VibeKanban to update task status (In Progress → Done) as each task completes, rather than only at the end.
- **Per-task commits**: Added enforcement of atomic git commits after each task with conventional commit message format.
- **Memory saves**: After each completed task, `mem_save` is called with type `pattern` or `bugfix` to capture implementation learnings.
- **Spec adherence check**: Added a pre-apply step that re-reads `design.md` and `spec.md` to ground the implementation before starting.
- **Rollback guidance**: Added explicit instructions for what to do if a task fails mid-apply (revert, document in DELTA, create follow-up task).

### Why

The upstream v2.0 apply phase treated the entire plan as a monolithic execution. In practice this led to:
- Lost context when sessions were interrupted mid-apply
- Inconsistent commit history (sometimes one big commit for 5 tasks)
- No memory of implementation decisions for future sessions

### Upstream ref

See `upstream/skills/sdd-tasks/SKILL.md` for the task format this phase consumes.
See `upstream/skills/sdd-verify/SKILL.md` for the verification phase that follows.
