# Cursor Agent PreToolUse gate

Fail-closed Cursor Agent `preToolUse` adapter. It wraps the same
`evaluatePreToolUse` contract as the other javi-ai gates: a missing or
unreadable policy denies the tool call.

## Add alongside skillguard

Merge the `hooks.json` snippet into your existing Cursor hooks file. Keep
javi-forge skillguard (and any other javi-forge-managed hooks) in place.

**Never overwrite** a javi-forge-managed `~/.cursor/hooks.json`. Do not replace
skillguard with this gate. Add this `preToolUse` entry next to the existing
hooks.

This package does **not** write `~/.cursor/hooks.json` for you.

## Snippet

`hooks.json` uses camelCase `preToolUse` and `"failClosed": true`. Cursor then
denies the tool if this hook crashes, times out, or exits non-zero.

Point `command` at this directory's `pretooluse-hook.mjs` (absolute path, or
`node ./pretooluse-hook.mjs` if Cursor's cwd is this folder).

Override the policy path with `JAVI_AI_PRETOOLUSE_POLICY` when needed. Default
is `pretooluse.policy` next to the hook script.
