---
name: channels-notify
description: >
  Async notification patterns for SDD workflows via Claude Code Channels (webhooks, Telegram, Discord). Push events when sub-agents finish, verify finds issues, or builds fail.
  Trigger: When configuring notifications for SDD, user says "notify me", "channels", "webhook", "alert when done", or invokes /channels-setup.
license: MIT
metadata:
  author: javi-ai
  version: "1.0"
  tags: [channels, notifications, webhooks, SDD, async, telegram, discord]
  category: workflow
  inspired-by: https://github.com/shanraisshan/claude-code-best-practice
dependencies:
  - sdd-apply
allowed-tools: Read, Bash
---

# Channels — Async Notifications for SDD

Push notification patterns for SDD workflow events via Claude Code Channels. Get notified when sub-agents complete, when sdd-verify finds issues, when builds fail, or when long-running tasks need your attention — without watching the terminal.

---

## 1. Core Principle

SDD workflows can run for minutes (fast-forward, parallel apply). Staring at a terminal waiting for sub-agents is waste. Channels push events TO you so you can context-switch safely and return when needed.

```
Sub-agent finishes → webhook fires → notification on your phone/desktop
Build fails        → webhook fires → you fix immediately, not 20 minutes later
Verify finds issue → webhook fires → you decide: fix now or defer
```

**Focus on webhooks** as the universal channel. Telegram and Discord are thin wrappers around webhooks.

---

## 2. Channel Types

### Webhooks (Universal)

Any HTTP endpoint that accepts POST requests. Works with Slack, Teams, Discord, n8n, Make, Zapier, custom backends.

```bash
# Generic webhook notification
curl -s -X POST "${WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "sdd:apply:complete",
    "change": "add-auth",
    "task": "2.3",
    "status": "success",
    "summary": "Auth middleware implemented with JWT RS256",
    "timestamp": "2025-12-15T14:30:00Z",
    "project": "my-project"
  }'
```

### Telegram

Uses Telegram Bot API. Requires a bot token and chat ID.

```bash
# Telegram notification
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -d "chat_id=${TELEGRAM_CHAT_ID}" \
  -d "parse_mode=Markdown" \
  -d "text=*SDD Event* \`${EVENT}\`
Project: ${PROJECT}
Change: ${CHANGE}
Status: ${STATUS}
${SUMMARY}"
```

### Discord

Uses Discord webhook URL (no bot token needed).

```bash
# Discord notification
curl -s -X POST "${DISCORD_WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -d '{
    "embeds": [{
      "title": "SDD: '"${EVENT}"'",
      "description": "'"${SUMMARY}"'",
      "color": '"${COLOR}"',
      "fields": [
        {"name": "Project", "value": "'"${PROJECT}"'", "inline": true},
        {"name": "Change", "value": "'"${CHANGE}"'", "inline": true},
        {"name": "Status", "value": "'"${STATUS}"'", "inline": true}
      ],
      "timestamp": "'"${TIMESTAMP}"'"
    }]
  }'
```

---

## 3. SDD Event Catalog

Events that should trigger notifications:

| Event | Severity | When |
|-------|----------|------|
| `sdd:apply:task-complete` | Info | A single task finishes successfully |
| `sdd:apply:batch-complete` | Info | A batch of tasks completes |
| `sdd:apply:task-failed` | Error | A task fails (test failure, build error) |
| `sdd:verify:passed` | Success | All verification checks pass |
| `sdd:verify:issues` | Warning | Verify finds spec deviations or gaps |
| `sdd:ff:complete` | Info | Fast-forward finishes all planning artifacts |
| `sdd:build:failed` | Error | Build or test suite fails |
| `sdd:merge:conflict` | Error | Parallel apply hits a merge conflict |
| `sdd:archive:complete` | Success | Change fully archived |
| `sdd:circuit-breaker:tripped` | Critical | A sub-agent hit resource limits |
| `sdd:session:cost-alert` | Warning | Session cost exceeds budget threshold |

### Event Payload Schema

```typescript
interface SDDNotificationPayload {
  event: string;              // Event name from catalog
  severity: "info" | "success" | "warning" | "error" | "critical";
  project: string;
  change: string;             // SDD change name
  task_id?: string;           // e.g. "2.3" (if task-level event)
  status: string;             // "success" | "failed" | "warning"
  summary: string;            // One-line human-readable summary
  details?: string;           // Optional extended info (error message, affected files)
  timestamp: string;          // ISO 8601
}
```

---

## 4. Configuration

### Channel Config File

Store in `.ai-config/channels.yaml` (project-level) or `~/.ai-config/channels.yaml` (user-level):

```yaml
channels:
  # Webhook (universal)
  webhook:
    enabled: true
    url: "${WEBHOOK_URL}"       # Env var or literal URL
    events: ["*"]               # All events, or specific list
    min_severity: "info"        # info|success|warning|error|critical

  # Telegram
  telegram:
    enabled: false
    bot_token: "${TELEGRAM_BOT_TOKEN}"
    chat_id: "${TELEGRAM_CHAT_ID}"
    events: ["sdd:verify:issues", "sdd:apply:task-failed", "sdd:build:failed"]
    min_severity: "warning"

  # Discord
  discord:
    enabled: false
    webhook_url: "${DISCORD_WEBHOOK_URL}"
    events: ["*"]
    min_severity: "info"

  # Global settings
  defaults:
    throttle_seconds: 30        # Min gap between notifications (avoid spam)
    batch_events: true          # Group rapid-fire events into one notification
    batch_window_seconds: 10    # Window for batching
    quiet_hours:                # Optional: suppress during quiet hours
      start: "22:00"
      end: "08:00"
      timezone: "America/Argentina/Buenos_Aires"
```

### Environment Variables

Channel URLs and tokens MUST come from environment variables or a `.env` file. NEVER hardcode credentials in config files that get committed to git.

```bash
# .env (gitignored)
WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxx
TELEGRAM_BOT_TOKEN=123456:ABC-DEF
TELEGRAM_CHAT_ID=-1001234567890
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/123/abc
```

---

## 5. Implementation Pattern

### Notification Dispatcher

The dispatcher is a shell function called by hooks or the SDD orchestrator:

```bash
#!/usr/bin/env bash
# notify-sdd.sh — SDD event notification dispatcher

set -euo pipefail

EVENT="${1:?Event name required}"
SEVERITY="${2:-info}"
CHANGE="${3:-unknown}"
SUMMARY="${4:-No summary provided}"
PROJECT="${5:-$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")}"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

PAYLOAD=$(jq -n \
  --arg event "$EVENT" \
  --arg severity "$SEVERITY" \
  --arg change "$CHANGE" \
  --arg summary "$SUMMARY" \
  --arg project "$PROJECT" \
  --arg timestamp "$TIMESTAMP" \
  '{event: $event, severity: $severity, project: $project, change: $change, summary: $summary, timestamp: $timestamp}')

# Load config
CONFIG="${PWD}/.ai-config/channels.yaml"
[[ ! -f "$CONFIG" ]] && CONFIG="${HOME}/.ai-config/channels.yaml"
[[ ! -f "$CONFIG" ]] && { echo "No channels config found, skipping notification"; exit 0; }

# Webhook
if [[ -n "${WEBHOOK_URL:-}" ]]; then
  curl -s -X POST "${WEBHOOK_URL}" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" >/dev/null 2>&1 &
fi

# Telegram
if [[ -n "${TELEGRAM_BOT_TOKEN:-}" ]] && [[ -n "${TELEGRAM_CHAT_ID:-}" ]]; then
  TEXT="*${EVENT}* (${SEVERITY})
Project: ${PROJECT}
Change: ${CHANGE}
${SUMMARY}"
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    -d "parse_mode=Markdown" \
    -d "text=${TEXT}" >/dev/null 2>&1 &
fi

# Discord
if [[ -n "${DISCORD_WEBHOOK_URL:-}" ]]; then
  COLOR=3447003  # Blue (info)
  [[ "$SEVERITY" == "success" ]] && COLOR=3066993
  [[ "$SEVERITY" == "warning" ]] && COLOR=15105570
  [[ "$SEVERITY" == "error" ]] && COLOR=15158332
  [[ "$SEVERITY" == "critical" ]] && COLOR=10038562

  DISCORD_PAYLOAD=$(jq -n \
    --arg title "$EVENT" \
    --arg desc "$SUMMARY" \
    --argjson color "$COLOR" \
    --arg project "$PROJECT" \
    --arg change "$CHANGE" \
    --arg status "$SEVERITY" \
    --arg ts "$TIMESTAMP" \
    '{embeds: [{title: $title, description: $desc, color: $color,
      fields: [{name:"Project",value:$project,inline:true},{name:"Change",value:$change,inline:true},{name:"Status",value:$status,inline:true}],
      timestamp: $ts}]}')

  curl -s -X POST "${DISCORD_WEBHOOK_URL}" \
    -H "Content-Type: application/json" \
    -d "$DISCORD_PAYLOAD" >/dev/null 2>&1 &
fi

wait
```

### Claude Code Hook Integration

Wire the dispatcher into Claude Code hooks:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "command": "~/.claude/hooks/sdd-notify-check.sh"
      }
    ]
  }
}
```

The `sdd-notify-check.sh` hook inspects tool output for SDD events and dispatches notifications. This is a lightweight pattern — the hook parses stdout for known markers.

---

## 6. Orchestrator Integration

### SDD Orchestrator Notification Points

The orchestrator inserts notification calls at key lifecycle points. These are instructions for the orchestrator, NOT automatic hooks.

```
# After sub-agent returns
Sub-agent completes task 2.3
  → Parse status from sub-agent output
  → If success: notify-sdd "sdd:apply:task-complete" "info" "add-auth" "Task 2.3 complete: Auth middleware"
  → If failed: notify-sdd "sdd:apply:task-failed" "error" "add-auth" "Task 2.3 failed: Test assertion error in auth.test.ts"

# After sdd-verify
Verify returns issues
  → notify-sdd "sdd:verify:issues" "warning" "add-auth" "3 spec deviations found"

# After sdd-ff completes
All planning artifacts created
  → notify-sdd "sdd:ff:complete" "info" "add-auth" "Proposal, spec, design, tasks ready for review"

# After parallel apply merge conflict
Merge fails on task branch
  → notify-sdd "sdd:merge:conflict" "error" "add-auth" "Conflict in src/auth/middleware.ts merging task-2.3"

# After circuit-breaker trips
Sub-agent killed
  → notify-sdd "sdd:circuit-breaker:tripped" "critical" "add-auth" "Agent killed: exceeded 100K token limit on task 2.3"
```

### Throttling

To prevent notification spam during batch operations:

1. Track last notification timestamp per event type
2. Skip if within `throttle_seconds` (default: 30s)
3. For batched events, aggregate within `batch_window_seconds` and send one summary:

```
SDD Batch Update (3 events):
  - Task 2.1: complete (success)
  - Task 2.2: complete (success)
  - Task 2.3: failed (test error)
```

---

## 7. Anti-Patterns

1. **Notifying on every tool call** — Only notify on SDD lifecycle events, not individual file reads/writes
2. **Hardcoding webhook URLs** — Always use environment variables. URLs in committed files are a security leak.
3. **Blocking on notification failure** — Fire-and-forget. If the webhook is down, log and continue. NEVER let a notification failure block SDD workflow.
4. **No throttling** — Parallel apply with 20 tasks sends 20 notifications in 10 seconds. Batch them.
5. **Sensitive data in payloads** — No file contents, no code snippets, no secrets. Event name + summary + status only.
6. **Notifications without context** — "Task complete" is useless. "Task 2.3 complete: Auth middleware with JWT RS256" is actionable.
7. **Ignoring quiet hours** — Sending alerts at 3am for non-critical events burns goodwill. Configure quiet hours for info/success severity.

> @reference references/webhook-patterns.md — Load when implementing webhook integrations, setting up Telegram/Discord bots, or configuring notification throttling

---

## Quick Reference

| Channel | Setup Required | Latency | Best For |
|---------|---------------|---------|----------|
| Webhook | URL only | <1s | Slack, Teams, custom |
| Telegram | Bot token + chat ID | <2s | Mobile push |
| Discord | Webhook URL | <1s | Team channels |

```
Config:     .ai-config/channels.yaml
Dispatcher: ~/.claude/hooks/notify-sdd.sh
Secrets:    .env (gitignored)
Events:     sdd:{phase}:{outcome}
Throttle:   30s default, batch within 10s window
```
