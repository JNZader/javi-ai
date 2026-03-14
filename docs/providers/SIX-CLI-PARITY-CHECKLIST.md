# Six-CLI Parity Checklist

## Purpose

This checklist records full parity for the six first-class CLI providers published by `javi-ai` after the `javi-ai-completion` milestone.

It covers both contract parity (Wave 3 / WI-012) and file-installation parity (javi-ai-completion).

## Current Parity Matrix

| Provider | Profile boundary exists | Provider contract | Package contract | Target contract | Files installable | Docs current | Public install surface | Cutover status |
|---|---|---|---|---|---|---|---|---|
| Claude | yes | yes | yes | yes | yes | yes | yes | WI-027 complete + javi-ai-completion |
| OpenCode | yes | yes | yes | yes | yes | yes | yes | WI-027 complete + javi-ai-completion |
| Gemini | yes | yes | yes | yes | yes | yes | yes | WI-027 complete + javi-ai-completion |
| Qwen | yes | yes | yes | yes | yes | yes | yes | WI-027 complete + javi-ai-completion |
| Codex | yes | yes | yes | yes | yes | yes | yes | WI-027 complete + javi-ai-completion |
| Copilot | yes | yes | yes | yes | yes | yes | yes | WI-027 complete + javi-ai-completion |

## Evidence For Each Column

- **Profile boundary exists**: `packages/providers/<provider>/` directory with package.yaml, runtime/, overrides/, targets/
- **Provider contract**: entry in `manifests/providers.yaml` with stable provider ID
- **Package contract**: entry in `manifests/packages.yaml` with stable package ID
- **Target contract**: entry in `manifests/targets.yaml` with stable target ID
- **Files installable**: provider has real runtime/override assets in its package directory, and `scripts/install-profiles.sh` can link them to the user home via `--provider + --home` flags
- **Docs current**: this checklist plus `AI-INTEGRATIONS.md`, `PROVIDER-CONTRACT.md`, and `INSTALL-CONTRACT.md` describe the published authority
- **Public install surface**: `scripts/install-profiles.sh` accepts and validates the provider through published IDs AND installs real files
- **Cutover status**: migrated provider slice no longer records active legacy derivation

## Provider Runtime Asset Summary

| Provider | Runtime assets installed |
|---|---|
| Claude | `settings.json`, `statusline.sh`, `tweakcc-theme.json` |
| OpenCode | `opencode.json`, `themes/gentleman.json` |
| Gemini | `GEMINI.md`, `settings.json` |
| Qwen | `QWEN.md`, `settings.json` |
| Codex | `AGENTS.md`, `codex.toml` |
| Copilot | `copilot/instructions.md` (repo-scoped) |

## Gate Interpretation

For WI-012, parity meant contract visibility is complete across all six providers.

After `javi-ai-completion`, all six providers additionally pass:
- file-installation parity: real assets exist and the installer can write them
- shared package parity: skills, commands, mcp, memory are all populated

This checklist should block later authority claims if any provider loses:

- a published provider ID or package ID
- a published install target ID
- installable runtime assets
- current canonical documentation
- support in the public install entrypoint
