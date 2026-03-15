#!/usr/bin/env bash
# ensure-deps.sh — silently install beautiful-mermaid if missing
#
# Called from SKILL.md Step 0 before any node script.
# Expects to run from any directory; locates package.json relative to itself.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -d "$SCRIPT_DIR/node_modules/beautiful-mermaid" ]]; then
  echo "Installing beautiful-mermaid (first run)..." >&2
  npm install --prefix "$SCRIPT_DIR" --silent 2>&1 >&2
  echo "✅ beautiful-mermaid installed" >&2
fi
