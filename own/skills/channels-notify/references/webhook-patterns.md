# Channels — Webhook Patterns Reference

> Load when implementing webhook integrations, setting up Telegram/Discord bots, or configuring notification throttling.

## Webhook Setup by Platform

### Slack Incoming Webhook

1. Go to https://api.slack.com/apps → Create New App → From scratch
2. Features → Incoming Webhooks → Activate
3. Add New Webhook to Workspace → Select channel
4. Copy webhook URL → set as `WEBHOOK_URL`

Slack-specific payload format:
```json
{
  "text": "SDD Event: sdd:apply:complete",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*sdd:apply:task-complete* :white_check_mark:\n*Project:* my-project | *Change:* add-auth\nTask 2.3 complete: Auth middleware with JWT RS256"
      }
    }
  ]
}
```

### Microsoft Teams

1. Channel → Connectors → Incoming Webhook → Configure
2. Copy webhook URL → set as `WEBHOOK_URL`

Teams uses Adaptive Cards:
```json
{
  "type": "message",
  "attachments": [{
    "contentType": "application/vnd.microsoft.card.adaptive",
    "content": {
      "type": "AdaptiveCard",
      "body": [{
        "type": "TextBlock",
        "text": "SDD: sdd:apply:task-complete",
        "weight": "bolder"
      }, {
        "type": "FactSet",
        "facts": [
          {"title": "Project", "value": "my-project"},
          {"title": "Change", "value": "add-auth"},
          {"title": "Status", "value": "success"}
        ]
      }]
    }
  }]
}
```

### Telegram Bot Setup

1. Message @BotFather on Telegram → `/newbot`
2. Choose name and username → receive bot token
3. Add bot to your group/channel
4. Get chat ID: `curl "https://api.telegram.org/bot${TOKEN}/getUpdates"` → find `chat.id`
5. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`

### Discord Webhook Setup

1. Server Settings → Integrations → Webhooks → New Webhook
2. Choose channel → Copy Webhook URL
3. Set as `DISCORD_WEBHOOK_URL`

Discord embed color codes:
| Severity | Color (decimal) | Hex |
|----------|----------------|-----|
| Info | 3447003 | #3498DB |
| Success | 3066993 | #2ECC71 |
| Warning | 15105570 | #E67E22 |
| Error | 15158332 | #E74C3C |
| Critical | 10038562 | #992D22 |

## Throttling Implementation

### Simple File-Based Throttle

```bash
#!/usr/bin/env bash
# throttle.sh — Prevents duplicate notifications within window

THROTTLE_DIR="/tmp/.sdd-notify-throttle"
mkdir -p "$THROTTLE_DIR"

EVENT="$1"
THROTTLE_SECONDS="${2:-30}"

EVENT_HASH=$(echo -n "$EVENT" | md5sum | cut -d' ' -f1)
THROTTLE_FILE="${THROTTLE_DIR}/${EVENT_HASH}"

if [[ -f "$THROTTLE_FILE" ]]; then
  LAST=$(cat "$THROTTLE_FILE")
  NOW=$(date +%s)
  DIFF=$((NOW - LAST))
  if [[ $DIFF -lt $THROTTLE_SECONDS ]]; then
    echo "Throttled: ${EVENT} (${DIFF}s < ${THROTTLE_SECONDS}s)"
    exit 0
  fi
fi

date +%s > "$THROTTLE_FILE"
# Proceed with notification
```

### Batch Aggregator

```bash
#!/usr/bin/env bash
# batch-notify.sh — Collects events within window, sends one notification

BATCH_DIR="/tmp/.sdd-notify-batch"
BATCH_WINDOW="${BATCH_WINDOW_SECONDS:-10}"
mkdir -p "$BATCH_DIR"

EVENT="$1"
SUMMARY="$2"
TIMESTAMP=$(date +%s)

# Append to batch file
echo "${TIMESTAMP}|${EVENT}|${SUMMARY}" >> "${BATCH_DIR}/pending"

# Check if batch sender is already scheduled
if [[ ! -f "${BATCH_DIR}/scheduled" ]]; then
  echo "$TIMESTAMP" > "${BATCH_DIR}/scheduled"
  # Wait for batch window, then flush
  (
    sleep "$BATCH_WINDOW"
    EVENTS=$(cat "${BATCH_DIR}/pending" 2>/dev/null)
    COUNT=$(echo "$EVENTS" | wc -l)

    if [[ $COUNT -gt 1 ]]; then
      # Send batched notification
      BATCH_SUMMARY="SDD Batch Update (${COUNT} events):"
      while IFS='|' read -r ts evt sum; do
        BATCH_SUMMARY="${BATCH_SUMMARY}\n  - ${evt}: ${sum}"
      done <<< "$EVENTS"
      # Call dispatcher with batched summary
      notify-sdd "sdd:batch" "info" "batch" "$BATCH_SUMMARY"
    else
      # Single event, send directly
      IFS='|' read -r ts evt sum <<< "$EVENTS"
      notify-sdd "$evt" "info" "single" "$sum"
    fi

    rm -f "${BATCH_DIR}/pending" "${BATCH_DIR}/scheduled"
  ) &
fi
```

## Testing Webhooks Locally

### Using webhook.site

1. Go to https://webhook.site → get unique URL
2. Set as `WEBHOOK_URL`
3. Trigger events → see payloads in browser

### Using ngrok for local server

```bash
# Terminal 1: Simple HTTP listener
python3 -c "
from http.server import HTTPServer, BaseHTTPRequestHandler
import json

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get('content-length', 0))
        body = json.loads(self.rfile.read(length))
        print(json.dumps(body, indent=2))
        self.send_response(200)
        self.end_headers()

HTTPServer(('', 8888), Handler).serve_forever()
"

# Terminal 2: Expose locally
ngrok http 8888
# Use the ngrok URL as WEBHOOK_URL
```

## Security Considerations

1. **Webhook URL rotation** — Rotate URLs periodically. If leaked, anyone can send fake events.
2. **HMAC signing** — For custom webhooks, sign payloads with a shared secret:
   ```bash
   SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | cut -d' ' -f2)
   curl -H "X-Signature: sha256=$SIGNATURE" ...
   ```
3. **Rate limiting** — Respect platform rate limits (Slack: 1/sec, Discord: 30/min, Telegram: 30/sec).
4. **No sensitive data** — Payloads travel over HTTPS but may be stored in platform logs. Keep them metadata-only.
