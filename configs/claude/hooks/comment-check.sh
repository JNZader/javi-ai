#!/bin/bash
# PostToolUse hook: Checks edited files for TODO/FIXME/HACK comments
# without descriptive context. Advisory only — always exits 0.
# Trigger: PostToolUse (after file write/edit operations)

FILE="$1"
[ -z "$FILE" ] || [ ! -f "$FILE" ] && exit 0

# Match TODO/FIXME/HACK followed by nothing, only whitespace, or just a colon
BARE=$(grep -nE '(TODO|FIXME|HACK)\s*:?\s*$' "$FILE" 2>/dev/null)

if [ -n "$BARE" ]; then
    echo "[hook:comment-check] Bare markers found in $FILE:"
    echo "$BARE"
    echo "Add descriptive context after TODO/FIXME/HACK markers."
fi

exit 0
