# Six-CLI Parity Checklist

## Purpose

This checklist records Wave 3 contract parity for the six first-class CLI
providers published by `javi-ai`.

It follows the parity dimensions defined in
`javi-platform/openspec/changes/ecosystem-restructure/verification.md`.

## Current Parity Matrix

| Provider | Profile boundary exists | Provider contract | Package contract | Target contract | Docs current | Public install surface | Cutover status |
|---|---|---|---|---|---|---|---|
| Claude | yes | yes | yes | yes | yes | yes | WI-027 complete for migrated slice |
| OpenCode | yes | yes | yes | yes | yes | yes | WI-027 complete for migrated slice |
| Gemini | yes | yes | yes | yes | yes | yes | WI-027 complete for migrated slice |
| Qwen | yes | yes | yes | yes | yes | yes | WI-027 complete for migrated slice |
| Codex | yes | yes | yes | yes | yes | yes | WI-027 complete for migrated slice |
| Copilot | yes | yes | yes | yes | yes | yes | WI-027 complete for migrated slice |

## Evidence For Each Row

- profile boundary exists via `packages/providers/<provider>/`
- provider contract comes from `manifests/providers.yaml`
- package contract comes from `manifests/packages.yaml`
- target contract comes from `manifests/targets.yaml`
- docs current means this checklist plus `AI-INTEGRATIONS.md`,
  `PROVIDER-CONTRACT.md`, and `INSTALL-CONTRACT.md` describe the published
  authority
- public install surface means `scripts/install-profiles.sh` accepts and validates
  the provider through published IDs
- cutover status means the migrated provider slice no longer records active
  legacy derivation and keeps any old path references as historical metadata only

## Gate Interpretation

For WI-012, parity means contract visibility is complete across all six providers.

After WI-027, the completed provider slices also pass the AI cutover check for
"no active legacy derivation".

This checklist should block later authority claims if any provider loses:

- a published provider ID
- a published provider package ID
- a published install target ID
- current canonical documentation
- support in the public install entrypoint shape
