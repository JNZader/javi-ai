# DELTA: sdd-explore v2.1

## Changes from upstream v2.0

**Source**: `upstream/skills/` (agent-teams-lite)
**Modified version**: `delta/skills/sdd-explore/` (Javi.Dots / GentlemanClaude)

### What changed

- **Enhanced exploration depth**: v2.1 adds a more structured investigation phase with explicit hypothesis generation before writing any artifacts.
- **Memory integration**: Added Engram `mem_context` call at start of explore phase to surface relevant prior sessions.
- **Output format**: Exploration findings now use a standardized `## Discoveries` section compatible with `mem_session_summary` format.
- **No-file guarantee**: Strengthened the "no files written" constraint with an explicit check at the end of the phase.

### Why

The upstream v2.0 explore phase was lightweight and didn't integrate with the Engram memory system. In practice, exploration without memory context led to rediscovering the same gotchas across sessions.

### Upstream ref

See `upstream/skills/sdd-init/SKILL.md` for the base SDD pipeline this extends.
