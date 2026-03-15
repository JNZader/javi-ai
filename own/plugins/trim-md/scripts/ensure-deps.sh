#!/usr/bin/env bash
# ensure-deps.sh — Check trim-md dependencies and offer install instructions.
#
# Required: npx (ships with Node.js)
# Optional: markdownlint-cli2 (auto-downloaded by npx on first use)

set -euo pipefail

MISSING=()

if ! command -v npx >/dev/null 2>&1; then
  MISSING+=("npx (install Node.js 18+: https://nodejs.org)")
fi

if ((${#MISSING[@]} > 0)); then
  echo "trim-md: missing dependencies:" >&2
  for dep in "${MISSING[@]}"; do
    echo "  - $dep" >&2
  done
  echo "" >&2
  if [[ "$(uname)" == "Darwin" ]]; then
    echo "Quick install (macOS): brew install node" >&2
  else
    echo "Quick install (Linux): sudo apt install nodejs npm" >&2
  fi
  exit 1
fi
