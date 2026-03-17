---
name: debug-mode
description: >
  Hypothesis-driven debugging with tagged instrumentation, isolated logs, and automated cleanup.
  Trigger: When debugging, investigating bugs, user says "debug", "why is this failing", or encounters unexpected behavior.
metadata:
  author: javi-ai
  version: "1.0"
  tags: [debugging, hypothesis, instrumentation, troubleshooting]
  category: debugging
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

## Purpose

Systematic debugging through hypothesis generation, targeted instrumentation, and iterative elimination. All debug code is cleanly marked for automated removal.

---

## When to Activate

- User reports a bug or unexpected behavior
- Tests are failing with unclear cause
- User says "debug", "investigate", "why is this failing"
- Runtime errors with insufficient context
- Performance issues needing profiling points

---

## Debugging Protocol

### Phase 1: Observe

1. **Reproduce** — Get the exact error message, stack trace, or unexpected output
2. **Gather context** — Read relevant files, recent changes, test output
3. **Identify the gap** — What information is missing to understand the bug?

### Phase 2: Hypothesize

Generate 2-4 hypotheses, ranked by likelihood:

```
## Debug Hypotheses for: "Login returns 401 after token refresh"

H1 (70%): Refresh token endpoint returns new access token but 
          the client isn't updating the stored token
H2 (20%): Token expiry check uses server time but token was 
          issued with client time (clock skew)
H3 (10%): Race condition — refresh request fires while original 
          request is still pending
```

### Phase 3: Instrument

Add **tagged debug logs** to verify/falsify each hypothesis:

```typescript
// #region DEBUG
console.log('[DEBUG H1] Token before refresh:', localStorage.getItem('token')?.slice(-10));
console.log('[DEBUG H1] Refresh response token:', response.data.token?.slice(-10));
console.log('[DEBUG H1] Token after store:', localStorage.getItem('token')?.slice(-10));
// #endregion DEBUG
```

#### Instrumentation Rules

| Rule | Why |
|------|-----|
| Always use `#region DEBUG` / `#endregion DEBUG` markers | Enables automated cleanup |
| Tag each log with hypothesis: `[DEBUG H1]`, `[DEBUG H2]` | Maps data to hypothesis |
| Log to file, not stdout: `.claude/debug.log` | Keeps terminal clean |
| Include timestamp in logs | Helps with race conditions |
| Truncate sensitive data | Don't log full tokens/passwords |

#### Language-Specific Markers

```python
# #region DEBUG
import logging
debug_log = logging.getLogger('debug')
debug_log.info('[DEBUG H1] User payload: %s', payload.get('sub'))
# #endregion DEBUG
```

```go
// #region DEBUG
log.Printf("[DEBUG H1] Request headers: %v", r.Header.Get("Authorization")[:20])
// #endregion DEBUG
```

```rust
// #region DEBUG
eprintln!("[DEBUG H1] Connection state: {:?}", conn.state());
// #endregion DEBUG
```

### Phase 4: Test & Narrow

1. Run the reproduction steps
2. Analyze debug output
3. For each hypothesis:
   - **Confirmed** — Evidence supports it. Proceed to fix.
   - **Falsified** — Evidence contradicts it. Remove its instrumentation.
   - **Inconclusive** — Need more data. Add finer-grained logs.

4. If all hypotheses falsified, generate new ones based on debug data.

### Phase 5: Fix & Verify

1. Implement the fix based on confirmed hypothesis
2. Run the original reproduction steps — should pass now
3. Run the full test suite — no regressions
4. **NEVER declare victory until user confirms the fix works**

### Phase 6: Cleanup

Remove ALL debug instrumentation:

```bash
# Automated cleanup — removes all #region DEBUG blocks
rg -l '#region DEBUG' | while read f; do
  sed -i '/#region DEBUG/,/#endregion DEBUG/d' "$f"
done
```

Or manually: search for `#region DEBUG` and delete each block.

---

## Debug Log Isolation

All debug output goes to `.claude/debug.log`, never to stdout:

```typescript
// #region DEBUG
import { appendFileSync } from 'fs';
function debugLog(hypothesis: string, msg: string) {
  const ts = new Date().toISOString();
  appendFileSync('.claude/debug.log', `${ts} [DEBUG ${hypothesis}] ${msg}\n`);
}
debugLog('H1', `Token before refresh: ${token?.slice(-10)}`);
// #endregion DEBUG
```

This keeps the context window clean and provides a persistent log for analysis.

---

## Human-in-the-Loop Checkpoints

**Mandatory checkpoints** (must get user confirmation before proceeding):

1. After generating hypotheses — "Do these hypotheses make sense? Any I'm missing?"
2. After first round of debug data — "Here's what I found. Should I continue with H1?"
3. After implementing fix — "The fix is in. Can you verify it works in your environment?"

**Never**:
- Declare the bug fixed without user confirmation
- Remove debug instrumentation before the fix is verified
- Skip straight to fixing without hypothesizing first

---

## Rules

1. **Always generate hypotheses first** — don't just add random logs
2. **Tag every debug line** — `[DEBUG H1]` makes cleanup and analysis trivial
3. **Use `#region DEBUG` markers** — non-negotiable, enables automated cleanup
4. **Log to file, not stdout** — `.claude/debug.log`
5. **Maximum 3 rounds of instrumentation** — if not solved in 3 rounds, step back and re-think
6. **Clean up is mandatory** — never leave debug code in production
7. **Save findings to Engram** — the bug fix knowledge is valuable for future sessions
