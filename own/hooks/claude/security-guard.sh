#!/usr/bin/env bash
# security-guard.sh — PreToolUse hook for Claude Code
# Reads patterns.yaml and blocks/warns on dangerous operations.
#
# Exit codes:
#   0 = allow (or JSON for ask)
#   2 = block
#
# Environment from Claude Code:
#   $TOOL_NAME  — Tool being invoked (Bash, Edit, Write, etc.)
#   $TOOL_INPUT — JSON string with tool arguments

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATTERNS_FILE="${SCRIPT_DIR}/security-guard.yaml"

# If patterns file doesn't exist, allow everything
if [[ ! -f "$PATTERNS_FILE" ]]; then
  exit 0
fi

# Only check Bash and Write/Edit tools
case "${TOOL_NAME:-}" in
  Bash|bash)
    COMMAND="${TOOL_INPUT:-}"
    ;;
  Write|Edit|write|edit)
    # For write/edit, check the file path
    FILE_PATH=$(echo "${TOOL_INPUT:-}" | grep -oP '"filePath"\s*:\s*"([^"]*)"' | head -1 | sed 's/.*"filePath"\s*:\s*"//' | sed 's/"//')
    COMMAND="write ${FILE_PATH:-}"
    ;;
  *)
    exit 0
    ;;
esac

# ── Check blocked commands ───────────────────────────────────────────────────
BLOCKED_PATTERNS=(
  'rm -rf /'
  'rm -rf ~'
  'rm -rf \*'
  ':(){ :|:& };:'
  'mkfs\.'
  'dd if=.* of=/dev/'
  '> /dev/sd'
  'chmod -R 777 /'
  'DELETE FROM .* WHERE 1'
  'DROP DATABASE'
  'DROP TABLE'
  'TRUNCATE TABLE'
  'shutdown|reboot|init 0|init 6'
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qEi "$pattern" 2>/dev/null; then
    echo "BLOCKED: Dangerous command detected — matches: $pattern" >&2
    exit 2
  fi
done

# ── Check zero access paths ─────────────────────────────────────────────────
ZERO_ACCESS_PATHS=(
  '/etc/shadow'
  '/etc/passwd'
  '/etc/sudoers'
  "$HOME/.ssh/id_"
  "$HOME/.ssh/config"
  "$HOME/.gnupg/"
  "$HOME/.aws/credentials"
  "$HOME/.config/gh/hosts.yml"
)

for zpath in "${ZERO_ACCESS_PATHS[@]}"; do
  if echo "$COMMAND" | grep -qF "$zpath" 2>/dev/null; then
    echo "BLOCKED: Access to protected path — $zpath" >&2
    exit 2
  fi
done

# ── Check warned commands ────────────────────────────────────────────────────
WARNED_PATTERNS=(
  'git push.*--force'
  'git push.*-f '
  'git reset --hard'
  'git clean -fd'
  'npm publish'
  'docker system prune'
  'curl.*| bash'
  'wget.*| sh'
  'sudo '
)

for pattern in "${WARNED_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qEi "$pattern" 2>/dev/null; then
    # Output JSON to trigger confirmation dialog
    echo "{\"decision\": \"ask\", \"reason\": \"Potentially dangerous: matches $pattern\"}"
    exit 0
  fi
done

# ── Check protected files (for Write/Edit) ───────────────────────────────────
if [[ "${TOOL_NAME:-}" == "Write" || "${TOOL_NAME:-}" == "Edit" ]]; then
  PROTECTED_PATTERNS=(
    '\.pem$'
    '\.key$'
    '\.p12$'
    '\.pfx$'
    '\.env$'
    '\.env\.local$'
    '\.env\.production$'
    'credentials\.json$'
    'service-account\.json$'
    'secrets\.yaml$'
    '\.secret$'
  )

  for pattern in "${PROTECTED_PATTERNS[@]}"; do
    if echo "${FILE_PATH:-}" | grep -qE "$pattern" 2>/dev/null; then
      echo "{\"decision\": \"ask\", \"reason\": \"Writing to sensitive file: ${FILE_PATH}\"}"
      exit 0
    fi
  done
fi

# All clear
exit 0
