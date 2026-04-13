---
name: skill-installer
description: >
  Detects project dependencies and suggests or installs relevant official skills — maps package.json, pyproject.toml, and other manifests to matching skills.
  Trigger: When onboarding to a project, user says "install skills", "suggest skills", "what skills do I need", or when setting up a new project workspace.
metadata:
  author: javi-ai
  version: "1.0"
  tags: [skills, installer, dependencies, onboarding, automation]
  category: workflow
allowed-tools: Read, Write, Bash, Glob, Grep, WebFetch
---

# Skill Installer

Dependency-aware skill discovery and installation for any project.

---

## Purpose

Manually identifying which skills apply to a project is tedious and error-prone. This skill reads project manifests (package.json, pyproject.toml, Cargo.toml, etc.), maps detected dependencies to known skills, and suggests or installs the relevant ones.

---

## When to Activate

- User starts work on a new or unfamiliar project
- User says "install skills", "suggest skills", "what skills should I use"
- User says "onboard me" or "set up skills for this project"
- After `sdd-init` when bootstrapping a new workspace
- When a project adds new dependencies (e.g., after `npm install`)

**Do NOT activate** when:
- User wants to create a new skill (use `skill-creator`)
- User wants to generate a skill from docs (use `skill-generator`)
- Project has no dependency manifests (suggest manual skill selection)

---

## Detection Pipeline

### Step 1: Discover Manifests

Scan the project root for dependency manifests:

| Manifest | Ecosystem | How to Parse |
|----------|-----------|-------------|
| `package.json` | Node.js / JavaScript / TypeScript | Read `dependencies` + `devDependencies` keys |
| `pyproject.toml` | Python | Read `[project.dependencies]` and `[project.optional-dependencies]` |
| `requirements.txt` | Python (legacy) | Read each line as a package name (strip version specifiers) |
| `Cargo.toml` | Rust | Read `[dependencies]` section |
| `go.mod` | Go | Read `require` block |
| `Gemfile` | Ruby | Read `gem` declarations |
| `pubspec.yaml` | Dart/Flutter | Read `dependencies` section |
| `build.gradle` / `build.gradle.kts` | JVM | Read `implementation`/`api` declarations |
| `composer.json` | PHP | Read `require` section |

```
1. Glob for all known manifest filenames at project root and one level deep
2. Parse each manifest to extract dependency names
3. Normalize names: lowercase, strip version specifiers, strip scope (@org/)
4. Deduplicate across manifests
```

### Step 2: Detect Framework/Stack Signals

Beyond individual packages, detect stack-level signals:

| Signal | Detection | Implies |
|--------|-----------|---------|
| Next.js | `next` in deps OR `next.config.*` exists | `nextjs-15`, `react-19`, `typescript` |
| React (standalone) | `react` in deps, no `next` | `react-19`, `typescript` |
| Angular | `@angular/core` in deps | `typescript` |
| Django | `django` in deps | `django-drf`, `pytest` |
| FastAPI | `fastapi` in deps | `pytest` |
| Playwright | `@playwright/test` or `playwright` in deps | `playwright` |
| Tailwind | `tailwindcss` in deps OR `tailwind.config.*` exists | `tailwind-4` |
| Zustand | `zustand` in deps | `zustand-5` |
| Zod | `zod` in deps | `zod-4` |
| AI SDK | `ai` or `@ai-sdk/*` in deps | `ai-sdk-5` |

### Step 3: Map Dependencies to Skills

Use a two-tier mapping:

**Tier 1 — Direct mappings** (dependency name → skill name):

| Dependency | Skill | Confidence |
|-----------|-------|------------|
| `react` | `react-19` | HIGH |
| `next` | `nextjs-15` | HIGH |
| `tailwindcss` | `tailwind-4` | HIGH |
| `zustand` | `zustand-5` | HIGH |
| `zod` | `zod-4` | HIGH |
| `ai` / `@ai-sdk/*` | `ai-sdk-5` | HIGH |
| `django` | `django-drf` | HIGH |
| `djangorestframework` | `django-drf` | HIGH |
| `pytest` | `pytest` | HIGH |
| `@playwright/test` | `playwright` | HIGH |
| `typescript` | `typescript` | HIGH |
| `stripe` | `stripe` | MEDIUM — check if skill exists |
| `supabase` / `@supabase/*` | `supabase` | MEDIUM — check if skill exists |
| `prisma` | `prisma` | MEDIUM — check if skill exists |
| `drizzle-orm` | `drizzle` | MEDIUM — check if skill exists |

**Tier 2 — Pattern mappings** (dependency pattern → skill category):

| Pattern | Suggests |
|---------|----------|
| Any test runner (`jest`, `vitest`, `pytest`, `mocha`) | Testing-related skills |
| Any ORM (`prisma`, `drizzle`, `sqlalchemy`, `typeorm`) | Database skills |
| Any auth lib (`next-auth`, `passport`, `django-allauth`) | Auth/security skills |
| Any UI framework (`@mui/*`, `@chakra-ui/*`, `shadcn`) | Component pattern skills |

### Step 4: Check Availability

```
1. For each mapped skill, check if it exists:
   a. own/skills/{skill-name}/SKILL.md — local skills
   b. ~/.claude/skills/{skill-name}/SKILL.md — global skills
2. Classify results:
   - AVAILABLE: skill exists locally or globally
   - AVAILABLE_REMOTE: skill exists in a known registry (future)
   - NOT_FOUND: no matching skill exists
3. For NOT_FOUND with HIGH confidence mapping:
   - Suggest creating one with skill-generator
```

### Step 5: Present Recommendations

Output a structured report:

```markdown
## Skill Recommendations for {project-name}

### Detected Stack
- **Runtime**: {Node.js 20 / Python 3.12 / etc.}
- **Framework**: {Next.js 15 / Django 5 / etc.}
- **Key Libraries**: {list top 5-10 dependencies}

### Recommended Skills

| Skill | Status | Confidence | Source |
|-------|--------|------------|--------|
| `react-19` | ✅ Installed | HIGH | `next` + `react` detected |
| `typescript` | ✅ Installed | HIGH | `typescript` in devDeps |
| `playwright` | ⚠️ Available | HIGH | `@playwright/test` in devDeps |
| `stripe` | ❌ Not found | MEDIUM | `stripe` in deps |

### Actions
- [ ] Install: `playwright` — available at own/skills/playwright/SKILL.md
- [ ] Generate: `stripe` — no skill found, run skill-generator with Stripe docs
```

### Step 6: Install (if requested)

When the user confirms installation:

```
1. For AVAILABLE skills not yet active:
   - Add skill to project's CLAUDE.md skill detection table
   - Or add to .atl/skill-registry.md if using skill registry
2. For AVAILABLE_REMOTE skills:
   - Download/copy to own/skills/{name}/
3. For NOT_FOUND skills with HIGH confidence:
   - Suggest: "Run skill-generator with {technology} docs to create this skill"
4. Report what was installed/configured
```

---

## Project Type Presets

For common project types, suggest skill bundles:

| Project Type | Detection | Skill Bundle |
|-------------|-----------|-------------|
| Next.js App | `next` in deps | `nextjs-15`, `react-19`, `typescript`, `tailwind-4` |
| React SPA | `react` (no `next`) | `react-19`, `typescript`, `tailwind-4` |
| Django API | `django` + `djangorestframework` | `django-drf`, `pytest` |
| Full-stack Next.js | `next` + `prisma`/`drizzle` | All Next.js + database skill |
| CLI Tool (Node) | `commander`/`yargs` + no framework | `typescript` |
| Python ML | `torch`/`tensorflow`/`transformers` | `pytest`, `embedding-strategies` |

---

## Critical Rules

1. **NEVER auto-install without user confirmation** — always present recommendations first, let user choose
2. **NEVER modify existing skills** — installation means adding references, not changing skill content
3. **ALWAYS check if a skill exists before recommending** — don't suggest non-existent skills as "installable"
4. **Map frameworks before individual packages** — `next` implies `react-19` + `typescript`, don't list them as separate discoveries
5. **Show confidence levels** — HIGH for direct mappings, MEDIUM for pattern-based, LOW for guesses
6. **Detect version mismatches** — if project uses React 18 but skill is `react-19`, warn about potential incompatibility
7. **Respect existing configuration** — if CLAUDE.md or skill-registry already includes a skill, mark it as "already installed"
