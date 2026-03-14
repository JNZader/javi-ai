# Six-CLI Parity Checklist

## Purpose

This checklist records Wave 3 contract parity for the six first-class CLI
providers published by `javi-ai`.

It follows the parity dimensions defined in
`javi-platform/openspec/changes/ecosystem-restructure/verification.md`.

## Current Parity Matrix

| Provider | Profile boundary exists | Provider contract | Package contract | Target contract | Docs current | Public install surface | Cutover status |
|---|---|---|---|---|---|---|---|
| Claude | yes | yes | yes | yes | yes | yes | pending later extraction/cutover waves |
| OpenCode | yes | yes | yes | yes | yes | yes | pending later extraction/cutover waves |
| Gemini | yes | yes | yes | yes | yes | yes | pending later extraction/cutover waves |
| Qwen | yes | yes | yes | yes | yes | yes | pending later extraction/cutover waves |
| Codex | yes | yes | yes | yes | yes | yes | pending later extraction/cutover waves |
| Copilot | yes | yes | yes | yes | yes | yes | pending later extraction/cutover waves |

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

## Gate Interpretation

For WI-012, parity means contract visibility is complete across all six providers.

It does not mean provider extraction is complete.

This checklist should block later authority claims if any provider loses:

- a published provider ID
- a published provider package ID
- a published install target ID
- current canonical documentation
- support in the public install entrypoint shape
