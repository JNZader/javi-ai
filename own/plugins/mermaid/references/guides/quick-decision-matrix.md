# Mermaid Quick Decision Matrix

Use this table to choose the next step fast when something is blocked.

| Symptom | Guide to load | Command to run |
|---|---|---|
| Not sure which diagram type to use | `references/guides/code-to-diagram/README.md` | `/mermaid-diagram "<goal>"` |
| Syntax error while generating | `references/guides/troubleshooting.md` | `node "$PLUGIN_DIR/scripts/extract_mermaid.js" <file>.mmd --validate` |
| Repeated parse failures or fragile output | `references/guides/common-mistakes.md` | `/mermaid-validate <path>` |
| Styling unreadable or low contrast | `references/guides/styling-guide.md` | `/mermaid-config` (theme/custom colors) |
| Diagram colors override selected theme | `references/guides/styling-guide.md` | Remove hardcoded `classDef fill/stroke/color` and re-render |
| Need robust end-to-end generation flow | `references/guides/resilient-workflow.md` | `node "$PLUGIN_DIR/scripts/resilient_diagram.js" <file>.mmd --output-dir <dir> --theme <theme>` |
| Need symbols/icons in labels | `references/guides/unicode-symbols/guide.md` | `/mermaid-diagram "<goal with symbols>"` |
| Framework-specific reverse-engineering | `examples/<framework>/README.md` | `/mermaid-architect <path>` |

## Fast Path

1. Validate early: `node "$PLUGIN_DIR/scripts/extract_mermaid.js" <file>.mmd --validate`
2. Fix with `troubleshooting.md` first, then `common-mistakes.md`
3. Only after validation, embed into markdown
