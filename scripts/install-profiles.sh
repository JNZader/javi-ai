#!/usr/bin/env bash

set -euo pipefail

SCRIPT_NAME=$(basename "$0")
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
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

Install javi-ai provider profiles and shared packages to user home.

Options:
  --provider ID            Published provider ID. Repeatable.
  --package ID             Published package ID. Repeatable.
  --preset ID              Reserved preset identifier. Repeatable.
  --target ID              Published install target ID.
  --home DIR               Target home directory (required for user targets).
  --destination DIR        Output directory for repo-scoped targets (copilot).
  --contract-version VER   Contract version to negotiate or pin.
  --dry-run                Print planned file operations without executing.
  --list-contracts         Print published provider, package, and target IDs.
  -h, --help               Show this help message.

Examples:
  # Dry-run Claude Code setup
  ${SCRIPT_NAME} --provider claude --target target.claude.user --home "\$HOME" --dry-run

  # Install Claude Code profile
  ${SCRIPT_NAME} --provider claude --target target.claude.user --home "\$HOME"

  # Install Claude with shared skills
  ${SCRIPT_NAME} --provider claude --target target.claude.user --home "\$HOME" \\
    --package shared.skills --package shared.hooks
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

# ─── file linking ─────────────────────────────────────────────────────────────

link_asset() {
  local src="$1"
  local dest="$2"
  local dest_dir
  dest_dir=$(dirname "$dest")

  if [[ ! -e "$src" ]]; then
    printf 'skip (missing source): %s\n' "$src"
    return 0
  fi

  if [[ "$dry_run" -eq 1 ]]; then
    printf 'dry-run: ln -sfn %s %s\n' "$src" "$dest"
    return 0
  fi

  mkdir -p "$dest_dir"

  if [[ -L "$dest" ]]; then
    local current_target
    current_target=$(readlink "$dest")
    if [[ "$current_target" == "$src" ]]; then
      printf 'ok: %s\n' "$dest"
      return 0
    fi
  fi

  if [[ -e "$dest" ]] && [[ ! -L "$dest" ]]; then
    printf 'skip (file exists): %s\n' "$dest"
    return 0
  fi

  ln -sfn "$src" "$dest"
  printf 'linked: %s -> %s\n' "$dest" "$src"
}

copy_asset() {
  local src="$1"
  local dest="$2"
  local dest_dir
  dest_dir=$(dirname "$dest")

  if [[ ! -e "$src" ]]; then
    printf 'skip (missing source): %s\n' "$src"
    return 0
  fi

  if [[ "$dry_run" -eq 1 ]]; then
    printf 'dry-run: cp %s %s\n' "$src" "$dest"
    return 0
  fi

  mkdir -p "$dest_dir"

  if [[ -e "$dest" ]]; then
    printf 'skip (file exists): %s\n' "$dest"
    return 0
  fi

  cp "$src" "$dest"
  printf 'copied: %s -> %s\n' "$src" "$dest"
}

link_dir_contents() {
  local src_dir="$1"
  local dest_dir="$2"

  if [[ ! -d "$src_dir" ]]; then
    printf 'skip (missing source dir): %s\n' "$src_dir"
    return 0
  fi

  if [[ "$dry_run" -eq 1 ]]; then
    printf 'dry-run: link contents of %s -> %s\n' "$src_dir" "$dest_dir"
    return 0
  fi

  mkdir -p "$dest_dir"
  local file
  for file in "$src_dir"/*/; do
    [[ -d "$file" ]] || continue
    local base
    base=$(basename "$file")
    link_asset "$file" "$dest_dir/$base"
  done
}

# ─── target root resolution ───────────────────────────────────────────────────

resolve_target_root() {
  local provider="$1"
  local target="$2"

  case "$target" in
    target.claude.user)    printf '%s/.claude' "$home_dir" ;;
    target.opencode.user)  printf '%s/.config/opencode' "$home_dir" ;;
    target.gemini.user)    printf '%s/.gemini' "$home_dir" ;;
    target.qwen.user)      printf '%s/.config/qwen' "$home_dir" ;;
    target.codex.user)     printf '%s/.codex' "$home_dir" ;;
    target.copilot.repo)   printf '%s/.github' "${destination:-$(pwd)}" ;;
    *)
      printf 'error: unknown target: %s\n' "$target" >&2
      exit 1
      ;;
  esac
}

# ─── provider installation ────────────────────────────────────────────────────

install_provider_claude() {
  local target_root="$1"
  local pkg_root="$REPO_ROOT/packages/providers/claude"

  printf 'installing: provider.claude.core -> %s\n' "$target_root"

  link_asset "$pkg_root/runtime/settings.json"           "$target_root/settings.json"
  link_asset "$pkg_root/overrides/statusline.sh"         "$target_root/statusline.sh"
  link_asset "$pkg_root/overrides/tweakcc-theme.json"    "$target_root/tweakcc-theme.json"
}

install_provider_opencode() {
  local target_root="$1"
  local pkg_root="$REPO_ROOT/packages/providers/opencode"

  printf 'installing: provider.opencode.core -> %s\n' "$target_root"

  link_asset "$pkg_root/runtime/opencode.json"            "$target_root/opencode.json"
  link_asset "$pkg_root/overrides/gentleman-theme.json"   "$target_root/themes/gentleman.json"
}

install_provider_gemini() {
  local target_root="$1"
  local pkg_root="$REPO_ROOT/packages/providers/gemini"

  printf 'installing: provider.gemini.core -> %s\n' "$target_root"

  link_asset "$pkg_root/runtime/GEMINI.md"        "$target_root/GEMINI.md"
  link_asset "$pkg_root/runtime/settings.json"    "$target_root/settings.json"
}

install_provider_qwen() {
  local target_root="$1"
  local pkg_root="$REPO_ROOT/packages/providers/qwen"

  printf 'installing: provider.qwen.core -> %s\n' "$target_root"

  link_asset "$pkg_root/runtime/QWEN.md"          "$target_root/QWEN.md"
  link_asset "$pkg_root/runtime/settings.json"    "$target_root/settings.json"
}

install_provider_codex() {
  local target_root="$1"
  local pkg_root="$REPO_ROOT/packages/providers/codex"

  printf 'installing: provider.codex.core -> %s\n' "$target_root"

  link_asset "$pkg_root/runtime/AGENTS.md"        "$target_root/AGENTS.md"
  link_asset "$pkg_root/runtime/codex.toml"       "$target_root/codex.toml"
}

install_provider_copilot() {
  local target_root="$1"
  local pkg_root="$REPO_ROOT/packages/providers/copilot"

  printf 'installing: provider.copilot.core -> %s\n' "$target_root"

  link_asset "$pkg_root/runtime/copilot-instructions.md"   "$target_root/copilot/instructions.md"
}

install_provider() {
  local provider="$1"
  local target_root="$2"

  case "$provider" in
    claude)   install_provider_claude   "$target_root" ;;
    opencode) install_provider_opencode "$target_root" ;;
    gemini)   install_provider_gemini   "$target_root" ;;
    qwen)     install_provider_qwen     "$target_root" ;;
    codex)    install_provider_codex    "$target_root" ;;
    copilot)  install_provider_copilot  "$target_root" ;;
    *)
      printf 'error: no installer for provider: %s\n' "$provider" >&2
      exit 1
      ;;
  esac
}

# ─── shared package installation ─────────────────────────────────────────────

install_shared_package() {
  local package="$1"
  local provider="$2"
  local target_root="$3"

  local pkg_root="$REPO_ROOT/packages/shared"

  case "$package" in
    shared.instructions)
      printf 'installing: shared.instructions\n'
      case "$provider" in
        claude)   copy_asset "$pkg_root/instructions/AGENTS.md"    "$target_root/CLAUDE.md" ;;
        opencode) copy_asset "$pkg_root/instructions/AGENTS.md"    "$target_root/AGENTS.md" ;;
        gemini)   copy_asset "$pkg_root/instructions/AGENTS.md"    "$target_root/GEMINI.md" ;;
        qwen)     copy_asset "$pkg_root/instructions/AGENTS.md"    "$target_root/QWEN.md" ;;
        codex)    copy_asset "$pkg_root/instructions/AGENTS.md"    "$target_root/AGENTS.md" ;;
        copilot)  copy_asset "$pkg_root/instructions/AGENTS.md"    "$target_root/copilot/instructions.md" ;;
      esac
      ;;
    shared.agents)
      printf 'installing: shared.agents\n'
      case "$provider" in
        claude)   link_dir_contents "$pkg_root/agents/orchestrators" "$target_root/agents/orchestrators" ;;
        opencode) link_dir_contents "$pkg_root/agents/orchestrators" "$target_root/agents" ;;
        *)        printf 'note: shared.agents install path not defined for %s\n' "$provider" ;;
      esac
      ;;
    shared.skills)
      printf 'installing: shared.skills\n'
      case "$provider" in
        claude)   link_dir_contents "$pkg_root/skills" "$target_root/skills" ;;
        opencode) link_dir_contents "$pkg_root/skills" "$target_root/skill" ;;
        *)        printf 'note: shared.skills install path not defined for %s\n' "$provider" ;;
      esac
      ;;
    shared.hooks)
      printf 'installing: shared.hooks\n'
      case "$provider" in
        claude)   link_dir_contents "$pkg_root/hooks/scripts" "$target_root/hooks" ;;
        *)        printf 'note: shared.hooks install path not defined for %s\n' "$provider" ;;
      esac
      ;;
    shared.commands)
      printf 'installing: shared.commands\n'
      case "$provider" in
        opencode) link_dir_contents "$pkg_root/commands" "$target_root/commands" ;;
        *)        printf 'note: shared.commands install path not defined for %s\n' "$provider" ;;
      esac
      ;;
    shared.mcp)
      printf 'installing: shared.mcp\n'
      case "$provider" in
        claude)   copy_asset "$pkg_root/mcp/mcp-servers.template.json"  "$target_root/mcp-servers.template.json" ;;
        opencode) copy_asset "$pkg_root/mcp/opencode-mcp.template.json" "$target_root/mcp.template.json" ;;
        *)        printf 'note: shared.mcp install path not defined for %s\n' "$provider" ;;
      esac
      ;;
    shared.memory)
      printf 'installing: shared.memory\n'
      copy_asset "$pkg_root/memory/engram-config.md" "$target_root/engram-config.md"
      ;;
    provider.*.core)
      printf 'note: provider package %s is installed automatically with --provider\n' "$package"
      ;;
    *)
      printf 'note: package %s has no install implementation yet\n' "$package"
      ;;
  esac
}

# ─── argument parsing ─────────────────────────────────────────────────────────

providers=()
packages=()
presets=()
target=""
home_dir="${HOME:-}"
destination=""
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
    --home)
      [[ $# -ge 2 ]] || { printf 'error: --home requires a value\n' >&2; exit 1; }
      home_dir="$2"
      shift 2
      ;;
    --destination)
      [[ $# -ge 2 ]] || { printf 'error: --destination requires a value\n' >&2; exit 1; }
      destination="$2"
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

# ─── list-contracts early exit ────────────────────────────────────────────────

if [[ "$list_contracts" -eq 1 ]]; then
  print_contracts
  exit 0
fi

# ─── validation ───────────────────────────────────────────────────────────────

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

# home_dir is required for user-profile targets
if [[ -z "$target" || "$target" != "target.copilot.repo" ]]; then
  if [[ -z "$home_dir" ]]; then
    printf 'error: --home is required for user-profile targets\n' >&2
    exit 1
  fi
fi

# ─── header ───────────────────────────────────────────────────────────────────

printf 'entrypoint: javi-ai/scripts/install-profiles.sh\n'
printf 'mode: install\n'
printf 'contract_version: %s\n' "$contract_version"
[[ "$dry_run" -eq 1 ]] && printf 'dry_run: true\n'

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

printf 'target: %s\n' "${target:-auto}"
printf 'home: %s\n' "${home_dir:-n/a}"

# ─── installation ─────────────────────────────────────────────────────────────

for provider in "${providers[@]}"; do
  # Resolve target: use explicit or derive from provider
  local_target="${target}"
  if [[ -z "$local_target" ]]; then
    case "$provider" in
      claude)   local_target="target.claude.user" ;;
      opencode) local_target="target.opencode.user" ;;
      gemini)   local_target="target.gemini.user" ;;
      qwen)     local_target="target.qwen.user" ;;
      codex)    local_target="target.codex.user" ;;
      copilot)  local_target="target.copilot.repo" ;;
    esac
  fi

  target_root=$(resolve_target_root "$provider" "$local_target")

  printf '\n--- provider: %s target: %s root: %s\n' "$provider" "$local_target" "$target_root"

  install_provider "$provider" "$target_root"

  for package in "${packages[@]}"; do
    install_shared_package "$package" "$provider" "$target_root"
  done
done

if [[ "$dry_run" -eq 1 ]]; then
  printf '\nresult: dry-run plan complete\n'
else
  printf '\nresult: install complete\n'
fi
