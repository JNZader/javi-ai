# .claude/mermaid.json — Mermaid plugin config

Copy this file to `.claude/mermaid.json` in your project root, or run `/mermaid-config` to set values interactively.

```json
{
  "theme": "zinc-light",
  "output_directory": "./diagrams",
  "auto_validate": true,
  "auto_render": false,
  "output_format": "svg",
  "_custom_theme_note": "Set theme to 'custom' and fill in themeVariables to use",
  "themeVariables": {
    "bg": "#ffffff",
    "fg": "#1a1a2e",
    "line": "#666666",
    "accent": "#4a90d9",
    "muted": "#999999"
  }
}
```

**Settings:**

| Key | Values | Default | Notes |
|---|---|---|---|
| `theme` | zinc-light, zinc-dark, github-light, github-dark, catppuccin-latte, catppuccin-mocha, nord-light, nord, dracula, solarized-light, solarized-dark, tokyo-night, tokyo-night-light, tokyo-night-storm, one-dark, custom | zinc-light | Applied to all generated diagrams |
| `output_directory` | any path or `"same"` | `./diagrams` | `"same"` saves output next to the input file |
| `auto_validate` | true/false | true | Run validation after generating |
| `auto_render` | true/false | false | Auto-render to SVG after generating |
| `output_format` | svg | svg | Only SVG is supported |
| `themeVariables` | JSON object | (none) | Only used when `theme` is `"custom"`. Keys: `bg`, `fg`, `line`, `accent`, `muted` |

## Definition of Done

- [ ] File exists at `.claude/mermaid.json` in the project root
- [ ] `theme` and `output_directory` match team conventions
- [ ] `auto_validate` and `auto_render` are explicitly chosen for the workflow
- [ ] If `theme` is `custom`, `themeVariables` has all required keys
- [ ] A sample diagram validates and renders using this configuration
