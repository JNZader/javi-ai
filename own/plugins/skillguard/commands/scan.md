# /skillguard scan <path>

Scan a skill or plugin directory for security threats.

## Usage

```
/skillguard scan <path-to-skill>
/skillguard scan .  # scan current directory
```

## Behavior

1. Read the target directory structure
2. Run static analysis on SKILL.md and all .md files
3. Inspect assets/ for binaries and encoded content
4. Output a structured report with severity levels

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `path` | Yes | Path to the skill directory to scan |

## Output

Structured scan report with PASS / WARN / BLOCK result.
