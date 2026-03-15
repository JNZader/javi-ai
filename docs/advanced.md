# Advanced Usage

---

## Adding a custom provider profile

javi-ai is designed to be extended. To add a new provider (e.g., a hypothetical `cursor` CLI):

### 1. Create the provider package directory

```
packages/providers/cursor/
├── runtime/
│   ├── cursor.json          # Runtime config file
│   └── CURSOR.md            # Instruction file
└── overrides/
    └── cursor-theme.json    # Optional theme override
```

### 2. Register the provider in manifests/providers.yaml

```yaml
- id: cursor
  display_name: Cursor
  profile_status: scaffold
  profile_metadata:
    first_class: true
    readiness: contract-published
    provider_family: cursor
  supported_install_targets:
    - target.cursor.user
  minimum_packages:
    - shared.instructions
    - provider.cursor.core
  optional_package_groups:
    - shared.agents
    - shared.skills
    - shared.hooks
    - shared.commands
    - shared.mcp
    - shared.memory
  contract_version: 0.1.0
```

### 3. Add the target in manifests/targets.yaml

```yaml
- id: target.cursor.user
  target_root_pattern: "$HOME/.cursor"
  scope: user
```

### 4. Add the package in manifests/packages.yaml

```yaml
- id: provider.cursor.core
  type: provider
  version: 0.1.0
  dependencies:
    - shared.instructions
  install_targets:
    - target.cursor.user
  source_lineage:
    publication: net-new
    implementation_sources:
      - delta
    notes: provider core package for Cursor-specific runtime assets
```

### 5. Add install functions to install-profiles.sh

```bash
# In SUPPORTED_PROVIDERS
SUPPORTED_PROVIDERS=(
  ...
  "cursor"
)

# In SUPPORTED_TARGETS
SUPPORTED_TARGETS=(
  ...
  "target.cursor.user"
)

# In resolve_target_root()
target.cursor.user) printf '%s/.cursor' "$home_dir" ;;

# New install function
install_provider_cursor() {
  local target_root="$1"
  local pkg_root="$REPO_ROOT/packages/providers/cursor"

  printf 'installing: provider.cursor.core -> %s\n' "$target_root"

  link_asset "$pkg_root/runtime/cursor.json"      "$target_root/cursor.json"
  link_asset "$pkg_root/runtime/CURSOR.md"        "$target_root/CURSOR.md"
}

# In install_provider() case statement
cursor) install_provider_cursor "$target_root" ;;
```

### 6. Add shared.instructions delivery

In `install_shared_package()`, add a cursor case to `shared.instructions`:

```bash
shared.instructions)
  ...
  cursor) copy_asset "$pkg_root/instructions/AGENTS.md" "$target_root/CURSOR.md" ;;
```

---

## Adding a new shared package

To add a new shared package (e.g., `shared.templates`):

### 1. Create the package directory

```
packages/shared/templates/
├── react-component.md
├── go-service.md
└── ...
```

### 2. Register in manifests/packages.yaml

```yaml
- id: shared.templates
  type: shared
  version: 0.1.0
  dependencies:
    - shared.instructions
  install_targets:
    - target.claude.user
    - target.opencode.user
  source_lineage:
    publication: net-new
    implementation_sources:
      - delta
    notes: shared template snippets for AI-assisted code generation
```

### 3. Add install logic to install-profiles.sh

```bash
# In SUPPORTED_PACKAGES
SUPPORTED_PACKAGES=(
  ...
  "shared.templates"
)

# In install_shared_package() case statement
shared.templates)
  printf 'installing: shared.templates\n'
  case "$provider" in
    claude)
      link_dir_contents "$pkg_root/templates" "$target_root/templates"
      ;;
    *)
      printf 'note: shared.templates install path not defined for %s\n' "$provider"
      ;;
  esac
  ;;
```

---

## Adding a custom project package

To add a new project-facing package (e.g., `project.testing.base`):

### 1. Register in manifests/project-packages.yaml

```yaml
- id: project.testing.base
  display_name: Project Testing Base
  version: 0.1.0
  status: published
  package_class: project-facing
  purpose: expose testing workflow guidance for generated repositories
  composed_from:
    shared_packages:
      - shared.instructions
      - shared.hooks
    provider_packages: []
  exported_capabilities:
    - testing workflow instructions
    - pre-commit hook for test coverage checks
  allowed_consumers:
    - javi-forge
    - generated repositories
  source_lineage:
    publication: net-new
    package_inputs:
      - shared.instructions
      - shared.hooks
    notes: project-facing testing package
  compatibility_notes:
    - safe for project use — no provider-specific assets
```

### 2. Implement in javi-forge

Project packages are delivered by `javi-forge`'s `forge-init.sh`. Add handling for the new package ID in that script.

---

## Running install-profiles.sh in CI

You can use javi-ai in a CI pipeline to set up a consistent AI environment:

```yaml
# .github/workflows/setup-ai.yml
name: Setup AI Environment
on: [push]
jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Clone javi-ai
        run: |
          git clone https://github.com/JNZader/javi-ai.git /tmp/javi-ai
      - name: Install Claude profile (dry-run)
        run: |
          /tmp/javi-ai/scripts/install-profiles.sh \
            --provider claude \
            --home "$HOME" \
            --dry-run
```

---

## Contract versioning

All manifests carry a `contract_version: 0.1.0`. If you need to pin a specific version:

```bash
scripts/install-profiles.sh \
  --provider claude \
  --contract-version 0.1.0 \
  --home "$HOME"
```

Currently only `0.1.0` is supported. Future versions will be announced in the CHANGELOG.

---

## Forking javi-ai

javi-ai is designed to be forked for teams with custom requirements:

| File to customize | Purpose |
|------------------|---------|
| `packages/shared/instructions/AGENTS.md` | Core AI instructions |
| `packages/providers/<name>/runtime/` | Provider-specific configs |
| `manifests/*.yaml` | Published contract IDs |
| `scripts/install-profiles.sh` | Install logic |

After forking, update `manifests/providers.yaml` with your team's contract version and point your `javi-dots` fork to the new repo URL.
