---
name: skillguard
description: >
  Security scanner for AI agent skills — detects credential theft, code injection, data exfiltration, and scope escape before installation.
  Trigger: When installing skills, reviewing skill files, user mentions skill security, or before running `javi-forge plugin add`.
metadata:
  author: javi-ai
  version: "1.0"
  tags: [security, scanning, skills, validation]
  category: safety
allowed-tools: Read, Bash, Glob, Grep
---

## Purpose

Scan AI agent skills for security risks before installation. Detects 20+ categories of threats across 3 severity levels. Runs automatically on `javi-forge plugin add` and `javi-ai install`.

---

## When to Activate

- Before installing any third-party skill
- When reviewing a SKILL.md file from an unknown source
- After `javi-forge plugin add` (pre-install scan)
- User asks to "scan", "review security", or "check this skill"

---

## Scan Categories

### Critical (Block Installation)

| Category | Pattern | Risk |
|----------|---------|------|
| **Credential Theft** | References to `~/.ssh/`, `~/.aws/`, `~/.config/gh/`, `API_KEY`, `SECRET` | Exfiltration of secrets |
| **Code Injection** | `eval()`, `exec()`, `Function()`, backtick interpolation of user input | Arbitrary code execution |
| **Data Exfiltration** | `curl`, `wget`, `fetch()` to unknown URLs, encoded payloads | Sending data to attacker |
| **Self-Modification** | Modifying `CLAUDE.md`, `AGENTS.md`, `settings.json`, hook scripts | Persistence/privilege escalation |
| **Scope Escape** | Instructions to ignore previous instructions, override safety rules | Prompt injection |
| **Hook Tampering** | Disabling, removing, or modifying hook scripts or hook config | Bypassing safety guardrails |
| **Recursive Agent Spawning** | Spawning agents in loops without termination conditions | Resource exhaustion / infinite loops |

### High (Warn, Require Confirmation)

| Category | Pattern | Risk |
|----------|---------|------|
| **Privilege Escalation** | `sudo`, `chmod 777`, `chown root` | System compromise |
| **Destructive Commands** | `rm -rf`, `DROP TABLE`, `git push --force` | Data loss |
| **Network Access** | Outbound connections, webhook URLs, API endpoints | Unexpected communication |
| **File System Traversal** | `../../`, absolute paths outside project | Access to unintended files |
| **Environment Manipulation** | Modifying `PATH`, `HOME`, `LD_PRELOAD` | System subversion |
| **Process Execution** | `child_process`, `subprocess`, `os.system()`, spawning shells | Arbitrary process creation |
| **Disk Operations** | Large file writes, `/tmp` abuse, filling disk intentionally | Denial of service |

### Medium (Log, Continue)

| Category | Pattern | Risk |
|----------|---------|------|
| **Excessive Permissions** | Requesting tools beyond stated purpose | Over-privileged skill |
| **Obfuscated Content** | Base64 encoded strings, hex-encoded commands | Hidden functionality |
| **Missing Provenance** | No author, no version, no repository URL | Unknown origin |
| **Overly Broad Triggers** | Trigger patterns that match everything | Unwanted activation |
| **Large Asset Files** | Binary files, compiled code in assets/ | Uninspectable content |
| **Stale Dependencies** | References to deprecated or unmaintained packages | Supply chain risk |

---

## Scan Protocol

### Step 1: Static Analysis

```bash
# Check for credential patterns
rg -i '(api.key|secret|password|token|credential|private.key)' SKILL.md

# Check for exfiltration
rg '(curl|wget|fetch|http://|https://)' SKILL.md --ignore-case

# Check for injection
rg '(eval|exec|Function\(|`\$\{)' SKILL.md

# Check for scope escape
rg -i '(ignore previous|override|bypass|disable safety)' SKILL.md

# Check for self-modification  
rg '(CLAUDE\.md|AGENTS\.md|settings\.json|\.claude/)' SKILL.md
```

### Step 2: Asset Inspection

```bash
# Check for binaries
find assets/ -type f -exec file {} \; | grep -v 'text\|empty\|JSON\|YAML'

# Check for base64
rg '[A-Za-z0-9+/]{40,}={0,2}' assets/

# Check asset sizes
find assets/ -type f -size +100k
```

### Step 3: Report

```
## SkillGuard Scan: [skill-name]

### Result: PASS | WARN | BLOCK

### Findings
- [CRITICAL] Credential pattern found: line 42 references ~/.aws/credentials
- [HIGH] Network access: line 78 contains curl to external URL
- [MEDIUM] No author metadata in frontmatter

### Recommendation
BLOCK — Critical finding on line 42. Review and remove credential access before installing.
```

---

## Sentinel Test Prompts

Validate that SkillGuard detects threats:

```
/skillguard test credential-theft
/skillguard test code-injection
/skillguard test data-exfiltration
/skillguard test scope-escape
```

Each test creates a temporary malicious skill, scans it, and verifies detection.

---

## Rules

1. **Always scan before install** — no exceptions for "trusted" sources
2. **Critical findings block installation** — user cannot override without editing the skill
3. **High findings require explicit confirmation** — user must acknowledge the risk
4. **Scan assets too** — not just SKILL.md
5. **Log all scan results** — even PASS results, for audit trail
6. **Re-scan on update** — when a skill is updated, scan the new version
