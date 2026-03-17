#!/usr/bin/env bash
# cleanup-debug.sh — Remove all #region DEBUG blocks from the codebase
# Usage: bash cleanup-debug.sh [directory]

set -euo pipefail

DIR="${1:-.}"
COUNT=0

# Find all files containing #region DEBUG
while IFS= read -r file; do
  # Remove lines between #region DEBUG and #endregion DEBUG (inclusive)
  sed -i '/#region DEBUG/,/#endregion DEBUG/d' "$file"
  COUNT=$((COUNT + 1))
  echo "Cleaned: $file"
done < <(rg -l '#region DEBUG' "$DIR" 2>/dev/null || true)

# Remove debug log if it exists
if [[ -f "${DIR}/.claude/debug.log" ]]; then
  rm "${DIR}/.claude/debug.log"
  echo "Removed: .claude/debug.log"
fi

if [[ $COUNT -eq 0 ]]; then
  echo "No debug instrumentation found."
else
  echo "Cleaned $COUNT files."
fi
