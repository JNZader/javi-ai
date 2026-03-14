#!/usr/bin/env bash

set -euo pipefail

SCRIPT_NAME=$(basename "$0")
DEFAULT_CONTRACT_VERSION="0.1.0"

SUPPORTED_PROVIDERS=(
  "claude"
  "opencode"
  "gemini"
  "qwen"
  "codex"
  "copilot"
)

SUPPORTED_PACKAGES=(
  "shared.instructions"
  "shared.agents"
  "shared.skills"
  "shared.hooks"
  "shared.commands"
  "shared.mcp"
  "shared.memory"
  "provider.claude.core"
  "provider.opencode.core"
  "provider.gemini.core"
  "provider.qwen.core"
  "provider.codex.core"
  "provider.copilot.core"
)

SUPPORTED_TARGETS=(
  "target.claude.user"
  "target.opencode.user"
  "target.gemini.user"
  "target.qwen.user"
  "target.codex.user"
  "target.copilot.repo"
)

usage() {
  cat <<EOF
Usage: ${SCRIPT_NAME} [options]

Single public install entrypoint scaffold for javi-ai provider profiles.

Options:
  --provider ID            Published provider ID. Repeatable.
  --package ID             Published package ID. Repeatable.
  --preset ID              Reserved preset identifier. Repeatable.
  --target ID              Published install target ID.
  --contract-version VER   Contract version to negotiate or pin.
  --dry-run                Print the resolved request without installing.
  --list-contracts         Print published provider, package, and target IDs.
  -h, --help               Show this help message.

Notes:
  - This WI-011 scaffold defines the stable CLI shape only.
  - Installation behavior is intentionally deferred to later work items.
EOF
}

contains() {
  local needle="$1"
  shift
  local item
  for item in "$@"; do
    if [[ "$item" == "$needle" ]]; then
      return 0
    fi
  done
  return 1
}

print_contracts() {
  local item

  printf 'contract_version: %s\n' "$DEFAULT_CONTRACT_VERSION"
  printf 'providers:\n'
  for item in "${SUPPORTED_PROVIDERS[@]}"; do
    printf '  - %s\n' "$item"
  done

  printf 'packages:\n'
  for item in "${SUPPORTED_PACKAGES[@]}"; do
    printf '  - %s\n' "$item"
  done

  printf 'targets:\n'
  for item in "${SUPPORTED_TARGETS[@]}"; do
    printf '  - %s\n' "$item"
  done
}

providers=()
packages=()
presets=()
target=""
contract_version="$DEFAULT_CONTRACT_VERSION"
dry_run=0
list_contracts=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --provider)
      [[ $# -ge 2 ]] || { printf 'error: --provider requires a value\n' >&2; exit 1; }
      providers+=("$2")
      shift 2
      ;;
    --package)
      [[ $# -ge 2 ]] || { printf 'error: --package requires a value\n' >&2; exit 1; }
      packages+=("$2")
      shift 2
      ;;
    --preset)
      [[ $# -ge 2 ]] || { printf 'error: --preset requires a value\n' >&2; exit 1; }
      presets+=("$2")
      shift 2
      ;;
    --target)
      [[ $# -ge 2 ]] || { printf 'error: --target requires a value\n' >&2; exit 1; }
      target="$2"
      shift 2
      ;;
    --contract-version)
      [[ $# -ge 2 ]] || { printf 'error: --contract-version requires a value\n' >&2; exit 1; }
      contract_version="$2"
      shift 2
      ;;
    --dry-run)
      dry_run=1
      shift
      ;;
    --list-contracts)
      list_contracts=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'error: unknown option: %s\n' "$1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ "$list_contracts" -eq 1 ]]; then
  print_contracts
  exit 0
fi

if [[ "$contract_version" != "$DEFAULT_CONTRACT_VERSION" ]]; then
  printf 'error: unsupported contract version: %s\n' "$contract_version" >&2
  printf 'supported contract version: %s\n' "$DEFAULT_CONTRACT_VERSION" >&2
  exit 1
fi

if [[ ${#providers[@]} -eq 0 ]]; then
  printf 'error: at least one --provider is required unless --list-contracts is used\n' >&2
  exit 1
fi

for provider in "${providers[@]}"; do
  if ! contains "$provider" "${SUPPORTED_PROVIDERS[@]}"; then
    printf 'error: unsupported provider ID: %s\n' "$provider" >&2
    exit 1
  fi
done

for package in "${packages[@]}"; do
  if ! contains "$package" "${SUPPORTED_PACKAGES[@]}"; then
    printf 'error: unsupported package ID: %s\n' "$package" >&2
    exit 1
  fi
done

if [[ -n "$target" ]] && ! contains "$target" "${SUPPORTED_TARGETS[@]}"; then
  printf 'error: unsupported target ID: %s\n' "$target" >&2
  exit 1
fi

printf 'entrypoint: javi-ai/scripts/install-profiles.sh\n'
printf 'mode: scaffold\n'
printf 'contract_version: %s\n' "$contract_version"

printf 'providers:\n'
for provider in "${providers[@]}"; do
  printf '  - %s\n' "$provider"
done

printf 'packages:\n'
if [[ ${#packages[@]} -eq 0 ]]; then
  printf '  - none-requested\n'
else
  for package in "${packages[@]}"; do
    printf '  - %s\n' "$package"
  done
fi

printf 'presets:\n'
if [[ ${#presets[@]} -eq 0 ]]; then
  printf '  - none-requested\n'
else
  for preset in "${presets[@]}"; do
    printf '  - %s\n' "$preset"
  done
fi

printf 'target: %s\n' "${target:-none-requested}"

if [[ "$dry_run" -eq 1 ]]; then
  printf 'result: dry-run request accepted by scaffold\n'
else
  printf 'result: scaffold accepted request shape; install behavior not implemented yet\n'
fi
