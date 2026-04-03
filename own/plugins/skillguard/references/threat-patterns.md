# Threat Pattern Reference

## Credential Patterns

```regex
(api[_-]?key|secret|password|token|credential|private[_-]?key)
~/.ssh/
~/.aws/
~/.config/gh/
```

## Injection Patterns

```regex
eval\(
exec\(
Function\(
`\$\{.*\}`
```

## Exfiltration Patterns

```regex
curl\s+
wget\s+
fetch\(
http://
https://
```

## Scope Escape Patterns

```regex
ignore previous
override.*instruction
bypass.*safety
disable.*guard
```

## Self-Modification Patterns

```regex
CLAUDE\.md
AGENTS\.md
settings\.json
\.claude/
```
