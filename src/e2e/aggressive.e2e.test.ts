/**
 * Aggressive E2E tests — REAL filesystem operations in sandbox HOME directories.
 *
 * These tests do NOT use dry-run. They verify that files actually arrive
 * where they should, with correct content, correct permissions, and correct
 * merge behavior.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs-extra'
import path from 'path'
import { createSandbox, removeSandbox, runCLI, countFiles, listDirs } from './helpers.js'

// ═══════════════════════════════════════════════════════════════════════════════
// 1. INSTALL VERIFICATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('E2E Aggressive: install verification', () => {
  let sandbox: string

  beforeEach(async () => {
    sandbox = await createSandbox()
  })

  afterEach(async () => {
    await removeSandbox(sandbox)
  })

  // ─── Test 1: Full claude install — every expected file exists ────────────

  it('full claude install: every expected file exists', async () => {
    const result = await runCLI(['install', '--cli', 'claude'], sandbox)
    expect(result.exitCode).toBe(0)

    // Skills directory with ≥30 SKILL.md files
    const skillsDir = path.join(sandbox, '.claude', 'skills')
    const skillCount = await countFiles(skillsDir, 'SKILL.md')
    expect(skillCount).toBeGreaterThanOrEqual(30)

    // Each SKILL.md is non-empty (>100 chars)
    const walk = async (dir: string): Promise<string[]> => {
      const files: string[] = []
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) files.push(...await walk(full))
        else if (entry.name === 'SKILL.md') files.push(full)
      }
      return files
    }
    const allSkillFiles = await walk(skillsDir)
    for (const skillFile of allSkillFiles) {
      const content = await fs.readFile(skillFile, 'utf-8')
      expect(content.length, `${skillFile} should be >100 chars`).toBeGreaterThan(100)
    }

    // _shared conventions exist
    expect(await fs.pathExists(path.join(skillsDir, '_shared', 'persistence-contract.md'))).toBe(true)
    expect(await fs.pathExists(path.join(skillsDir, '_shared', 'engram-convention.md'))).toBe(true)

    // Extensions: sdd-explore contains "Perspective Mode"
    const sddExplore = await fs.readFile(path.join(skillsDir, 'sdd-explore', 'SKILL.md'), 'utf-8')
    expect(sddExplore).toContain('Perspective Mode')

    // Extensions: sdd-apply contains "Per-Task" or "Rollback"
    const sddApply = await fs.readFile(path.join(skillsDir, 'sdd-apply', 'SKILL.md'), 'utf-8')
    expect(sddApply.includes('Per-Task') || sddApply.includes('Rollback')).toBe(true)

    // Own skills installed
    expect(await fs.pathExists(path.join(skillsDir, 'skill-creator', 'SKILL.md'))).toBe(true)
    expect(await fs.pathExists(path.join(skillsDir, 'obsidian-braindump', 'SKILL.md'))).toBe(true)

    // CLAUDE.md exists and >500 chars
    const claudeMd = path.join(sandbox, '.claude', 'CLAUDE.md')
    expect(await fs.pathExists(claudeMd)).toBe(true)
    const claudeMdContent = await fs.readFile(claudeMd, 'utf-8')
    expect(claudeMdContent.length).toBeGreaterThan(500)

    // settings.json exists and is valid JSON
    const settingsPath = path.join(sandbox, '.claude', 'settings.json')
    expect(await fs.pathExists(settingsPath)).toBe(true)
    const settingsContent = await fs.readFile(settingsPath, 'utf-8')
    expect(() => JSON.parse(settingsContent)).not.toThrow()

    // Hooks are executable
    const commentCheck = path.join(sandbox, '.claude', 'hooks', 'comment-check.sh')
    expect(await fs.pathExists(commentCheck)).toBe(true)
    const commentStat = await fs.stat(commentCheck)
    expect(commentStat.mode & 0o111).toBeGreaterThan(0)

    const todoTracker = path.join(sandbox, '.claude', 'hooks', 'todo-tracker.sh')
    expect(await fs.pathExists(todoTracker)).toBe(true)
    const todoStat = await fs.stat(todoTracker)
    expect(todoStat.mode & 0o111).toBeGreaterThan(0)

    // Orchestrators directory has .md files
    const agentsDir = path.join(sandbox, '.claude', 'agents', 'claude')
    expect(await fs.pathExists(agentsDir)).toBe(true)
    const agentFiles = await fs.readdir(agentsDir)
    const mdFiles = agentFiles.filter(f => f.endsWith('.md'))
    expect(mdFiles.length).toBeGreaterThanOrEqual(1)

    // Manifest is valid JSON with clis: ["claude"]
    const manifestPath = path.join(sandbox, '.javi-ai', 'manifest.json')
    expect(await fs.pathExists(manifestPath)).toBe(true)
    const manifest = await fs.readJSON(manifestPath)
    expect(manifest.clis).toContain('claude')
  }, 60_000)

  // ─── Test 2: Full opencode install — correct paths ──────────────────────

  it('full opencode install: correct paths', async () => {
    const result = await runCLI(['install', '--cli', 'opencode'], sandbox)
    expect(result.exitCode).toBe(0)

    // Skills directory with ≥30 SKILL.md files
    const skillsDir = path.join(sandbox, '.config', 'opencode', 'skill')
    const skillCount = await countFiles(skillsDir, 'SKILL.md')
    expect(skillCount).toBeGreaterThanOrEqual(30)

    // opencode.json exists and is valid JSON
    const opencodeJson = path.join(sandbox, '.config', 'opencode', 'opencode.json')
    expect(await fs.pathExists(opencodeJson)).toBe(true)
    const jsonContent = await fs.readFile(opencodeJson, 'utf-8')
    expect(() => JSON.parse(jsonContent)).not.toThrow()

    // gentleman theme exists
    const themePath = path.join(sandbox, '.config', 'opencode', 'themes', 'gentleman.json')
    expect(await fs.pathExists(themePath)).toBe(true)

    // Orchestrator agents directory has files
    const agentsDir = path.join(sandbox, '.config', 'opencode', 'agents')
    expect(await fs.pathExists(agentsDir)).toBe(true)
    // walk the agents dir to find .md files (may be nested)
    const findMdFiles = async (dir: string): Promise<string[]> => {
      const files: string[] = []
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) files.push(...await findMdFiles(full))
        else if (entry.name.endsWith('.md')) files.push(full)
      }
      return files
    }
    const orchMdFiles = await findMdFiles(agentsDir)
    expect(orchMdFiles.length).toBeGreaterThanOrEqual(1)

    // Manifest has opencode
    const manifest = await fs.readJSON(path.join(sandbox, '.javi-ai', 'manifest.json'))
    expect(manifest.clis).toContain('opencode')
  }, 60_000)

  // ─── Test 3: Multi-CLI install — both paths populated ───────────────────

  it('multi-CLI install: all 3 paths populated', async () => {
    const result = await runCLI(['install', '--cli', 'claude,opencode,qwen'], sandbox)
    expect(result.exitCode).toBe(0)

    // Claude skills
    const claudeSkills = path.join(sandbox, '.claude', 'skills')
    expect(await countFiles(claudeSkills, 'SKILL.md')).toBeGreaterThanOrEqual(30)

    // OpenCode skills
    const opencodeSkills = path.join(sandbox, '.config', 'opencode', 'skill')
    expect(await countFiles(opencodeSkills, 'SKILL.md')).toBeGreaterThanOrEqual(30)

    // Qwen skills
    const qwenSkills = path.join(sandbox, '.qwen', 'skills')
    expect(await countFiles(qwenSkills, 'SKILL.md')).toBeGreaterThanOrEqual(30)

    // Manifest has all 3
    const manifest = await fs.readJSON(path.join(sandbox, '.javi-ai', 'manifest.json'))
    expect(manifest.clis).toContain('claude')
    expect(manifest.clis).toContain('opencode')
    expect(manifest.clis).toContain('qwen')
  }, 90_000)

  // ─── Test 4: All 6 CLIs install ─────────────────────────────────────────

  it('all 6 CLIs install: each has skills directory with files', async () => {
    const result = await runCLI(
      ['install', '--cli', 'claude,opencode,gemini,qwen,codex,copilot'],
      sandbox,
    )
    expect(result.exitCode).toBe(0)

    const cliPaths: Record<string, string> = {
      claude: path.join(sandbox, '.claude', 'skills'),
      opencode: path.join(sandbox, '.config', 'opencode', 'skill'),
      gemini: path.join(sandbox, '.gemini', 'skills'),
      qwen: path.join(sandbox, '.qwen', 'skills'),
      codex: path.join(sandbox, '.codex', 'skills'),
      copilot: path.join(sandbox, '.copilot', 'skills'),
    }

    for (const [cli, skillsPath] of Object.entries(cliPaths)) {
      const count = await countFiles(skillsPath, 'SKILL.md')
      expect(count, `${cli} should have ≥30 skills`).toBeGreaterThanOrEqual(30)
    }

    // Manifest has all 6
    const manifest = await fs.readJSON(path.join(sandbox, '.javi-ai', 'manifest.json'))
    expect(manifest.clis).toHaveLength(6)
    for (const cli of ['claude', 'opencode', 'gemini', 'qwen', 'codex', 'copilot']) {
      expect(manifest.clis).toContain(cli)
    }
  }, 120_000)
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. MERGE BEHAVIOR TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('E2E Aggressive: merge behavior', () => {
  let sandbox: string

  beforeEach(async () => {
    sandbox = await createSandbox()
  })

  afterEach(async () => {
    await removeSandbox(sandbox)
  })

  // ─── Test 5: JSON deep merge — existing settings.json preserved ─────────

  it('JSON deep merge: existing settings.json custom keys preserved', async () => {
    // Pre-create settings.json with custom content
    const settingsDir = path.join(sandbox, '.claude')
    await fs.ensureDir(settingsDir)
    await fs.writeJSON(path.join(settingsDir, 'settings.json'), { myCustomKey: 'preserved' })

    // Install
    const result = await runCLI(['install', '--cli', 'claude'], sandbox)
    expect(result.exitCode).toBe(0)

    // Read merged settings.json
    const merged = await fs.readJSON(path.join(settingsDir, 'settings.json'))
    // Custom key preserved
    expect(merged.myCustomKey).toBe('preserved')
    // javi-ai keys also present (settings.json has content from configs/claude/settings.json)
    expect(Object.keys(merged).length).toBeGreaterThan(1)
  }, 30_000)

  // ─── Test 6: Markdown marker merge — existing CLAUDE.md preserved ───────

  it('markdown marker merge: existing CLAUDE.md content preserved', async () => {
    // Pre-create CLAUDE.md with custom content
    const claudeDir = path.join(sandbox, '.claude')
    await fs.ensureDir(claudeDir)
    await fs.writeFile(
      path.join(claudeDir, 'CLAUDE.md'),
      '# My Custom Header\n\nMy content here\n',
      'utf-8',
    )

    // Install
    const result = await runCLI(['install', '--cli', 'claude'], sandbox)
    expect(result.exitCode).toBe(0)

    // Read merged CLAUDE.md
    const content = await fs.readFile(path.join(claudeDir, 'CLAUDE.md'), 'utf-8')
    expect(content).toContain('My Custom Header')
    expect(content).toContain('<!-- BEGIN JAVI-AI -->')
    expect(content).toContain('<!-- END JAVI-AI -->')
  }, 30_000)

  // ─── Test 7: Marker merge idempotent — no duplicate markers ─────────────

  it('marker merge idempotent: second install does not duplicate markers', async () => {
    // First install
    await runCLI(['install', '--cli', 'claude'], sandbox)

    // Second install
    await runCLI(['install', '--cli', 'claude'], sandbox)

    // Read CLAUDE.md
    const content = await fs.readFile(
      path.join(sandbox, '.claude', 'CLAUDE.md'),
      'utf-8',
    )

    // Count occurrences of BEGIN marker
    const beginCount = content.split('<!-- BEGIN JAVI-AI -->').length - 1
    expect(beginCount).toBe(1)
  }, 60_000)

  // ─── Test 8: Hooks create-if-absent — existing hooks NOT overwritten ────

  it('hooks create-if-absent: existing hooks NOT overwritten', async () => {
    // Pre-create hooks dir with custom hook
    const hooksDir = path.join(sandbox, '.claude', 'hooks')
    await fs.ensureDir(hooksDir)
    await fs.writeFile(
      path.join(hooksDir, 'comment-check.sh'),
      '#!/bin/bash\n# MY CUSTOM HOOK\necho "custom"\n',
      'utf-8',
    )
    await fs.chmod(path.join(hooksDir, 'comment-check.sh'), 0o755)

    // Install
    const result = await runCLI(['install', '--cli', 'claude'], sandbox)
    expect(result.exitCode).toBe(0)

    // Read the hook file — should still be our custom content
    const hookContent = await fs.readFile(
      path.join(hooksDir, 'comment-check.sh'),
      'utf-8',
    )
    expect(hookContent).toContain('# MY CUSTOM HOOK')
  }, 30_000)
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. EXTENSION MODEL TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('E2E Aggressive: extension model', () => {
  let sandbox: string

  beforeEach(async () => {
    sandbox = await createSandbox()
  })

  afterEach(async () => {
    await removeSandbox(sandbox)
  })

  // ─── Test 9: Upstream skill without extension is exact copy ──────────────

  it('upstream skill without extension is exact copy', async () => {
    await runCLI(['install', '--cli', 'claude'], sandbox)

    // Read the upstream source react-19/SKILL.md from the repo
    const repoRoot = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '../../',
    )
    const upstreamContent = await fs.readFile(
      path.join(repoRoot, 'upstream', 'skills', 'react-19', 'SKILL.md'),
      'utf-8',
    )

    // Read the installed copy
    const installedContent = await fs.readFile(
      path.join(sandbox, '.claude', 'skills', 'react-19', 'SKILL.md'),
      'utf-8',
    )

    // Content should be identical (no corruption, no extension appended)
    expect(installedContent).toBe(upstreamContent)
  }, 30_000)

  // ─── Test 10: Upstream skill WITH extension has separator ────────────────

  it('upstream skill WITH extension has separator and both sections', async () => {
    await runCLI(['install', '--cli', 'claude'], sandbox)

    const installed = await fs.readFile(
      path.join(sandbox, '.claude', 'skills', 'sdd-explore', 'SKILL.md'),
      'utf-8',
    )

    // Contains the separator between upstream and extension
    expect(installed).toContain('\n\n---\n\n')

    // Read the original upstream SKILL.md to verify the upstream part is present
    const repoRoot = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '../../',
    )
    const upstreamSkill = await fs.readFile(
      path.join(repoRoot, 'upstream', 'skills', 'sdd-explore', 'SKILL.md'),
      'utf-8',
    )
    // The installed file should start with the upstream content
    expect(installed.startsWith(upstreamSkill)).toBe(true)

    // Extension section contains "Perspective Mode"
    expect(installed).toContain('Perspective Mode')
  }, 30_000)
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. UPDATE LIFECYCLE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('E2E Aggressive: update lifecycle', () => {
  let sandbox: string

  beforeEach(async () => {
    sandbox = await createSandbox()
  })

  afterEach(async () => {
    await removeSandbox(sandbox)
  })

  // ─── Test 11: Install → update — skills count unchanged ─────────────────

  it('install → update: skills count unchanged', async () => {
    await runCLI(['install', '--cli', 'claude'], sandbox)

    const skillsDir = path.join(sandbox, '.claude', 'skills')
    const countBefore = await countFiles(skillsDir, 'SKILL.md')

    await runCLI(['update'], sandbox)

    const countAfter = await countFiles(skillsDir, 'SKILL.md')
    expect(countAfter).toBe(countBefore)
  }, 60_000)

  // ─── Test 12: Install → update — manifest updatedAt changes ─────────────

  it('install → update: manifest updatedAt changes', async () => {
    await runCLI(['install', '--cli', 'claude'], sandbox)

    const manifestPath = path.join(sandbox, '.javi-ai', 'manifest.json')
    const manifest1 = await fs.readJSON(manifestPath)
    const updatedAt1 = manifest1.updatedAt

    // Wait 1.1 second to ensure time difference
    await new Promise(resolve => setTimeout(resolve, 1100))

    await runCLI(['update'], sandbox)

    const manifest2 = await fs.readJSON(manifestPath)
    const updatedAt2 = manifest2.updatedAt

    // updatedAt should have changed (be different from / later than the first)
    expect(new Date(updatedAt2).getTime()).toBeGreaterThan(new Date(updatedAt1).getTime())
  }, 60_000)
})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. UNINSTALL LIFECYCLE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('E2E Aggressive: uninstall lifecycle', () => {
  let sandbox: string

  beforeEach(async () => {
    sandbox = await createSandbox()
  })

  afterEach(async () => {
    await removeSandbox(sandbox)
  })

  // ─── Test 13: Install → uninstall — manifest removed ────────────────────

  it('install → uninstall: manifest removed', async () => {
    await runCLI(['install', '--cli', 'claude'], sandbox)

    const manifestPath = path.join(sandbox, '.javi-ai', 'manifest.json')
    expect(await fs.pathExists(manifestPath)).toBe(true)

    await runCLI(['uninstall'], sandbox)

    expect(await fs.pathExists(manifestPath)).toBe(false)
  }, 60_000)

  // ─── Test 14: Install → uninstall → doctor — shows not installed ────────

  it('install → uninstall → doctor: shows not installed', async () => {
    await runCLI(['install', '--cli', 'claude'], sandbox)
    await runCLI(['uninstall'], sandbox)

    const doctorResult = await runCLI(['doctor'], sandbox)
    const output = doctorResult.stdout + doctorResult.stderr
    const hasNoInstall =
      output.includes('No installation') ||
      output.includes('fail') ||
      output.includes('No CLIs')
    expect(hasNoInstall).toBe(true)
  }, 90_000)
})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. SYNC TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('E2E Aggressive: sync', () => {
  let sandbox: string

  beforeEach(async () => {
    sandbox = await createSandbox()
  })

  afterEach(async () => {
    await removeSandbox(sandbox)
  })

  // ─── Test 15: Sync generates CLAUDE.md from real .ai-config ─────────────

  it('sync generates CLAUDE.md from real .ai-config', async () => {
    const projectDir = path.join(sandbox, 'test-project')
    await fs.ensureDir(projectDir)

    // Create .ai-config/agents/backend/go-pro.md
    const agentDir = path.join(projectDir, '.ai-config', 'agents', 'backend')
    await fs.ensureDir(agentDir)
    await fs.writeFile(
      path.join(agentDir, 'go-pro.md'),
      '---\nname: go-pro\ndescription: Go specialist\n---\n# Go Pro\n',
      'utf-8',
    )

    // Create .ai-config/skills/backend/go-backend/SKILL.md
    const skillDir = path.join(projectDir, '.ai-config', 'skills', 'backend', 'go-backend')
    await fs.ensureDir(skillDir)
    await fs.writeFile(
      path.join(skillDir, 'SKILL.md'),
      '---\nname: go-backend\ndescription: Go backend patterns\n---\n# Go Backend Skill\n',
      'utf-8',
    )

    // Run sync targeting claude
    const result = await runCLI(
      ['sync', '--project-dir', projectDir, '--target', 'claude'],
      sandbox,
    )
    expect(result.exitCode).toBe(0)

    // CLAUDE.md should exist
    const claudeMd = path.join(projectDir, 'CLAUDE.md')
    expect(await fs.pathExists(claudeMd)).toBe(true)

    const content = await fs.readFile(claudeMd, 'utf-8')
    expect(content).toContain('go-pro')
    expect(content).toContain('go-backend')
  }, 30_000)

  // ─── Test 16: Sync respects .skillignore ────────────────────────────────

  it('sync respects .skillignore', async () => {
    const projectDir = path.join(sandbox, 'test-project')
    await fs.ensureDir(projectDir)

    // Create agent
    const agentDir = path.join(projectDir, '.ai-config', 'agents', 'backend')
    await fs.ensureDir(agentDir)
    await fs.writeFile(
      path.join(agentDir, 'go-pro.md'),
      '---\nname: go-pro\ndescription: Go specialist\n---\n# Go Pro\n',
      'utf-8',
    )

    // Create skill
    const skillDir = path.join(projectDir, '.ai-config', 'skills', 'backend', 'go-backend')
    await fs.ensureDir(skillDir)
    await fs.writeFile(
      path.join(skillDir, 'SKILL.md'),
      '---\nname: go-backend\ndescription: Go backend patterns\n---\n# Go Backend Skill\n',
      'utf-8',
    )

    // Create .skillignore excluding go-backend for claude
    await fs.writeFile(
      path.join(projectDir, '.ai-config', '.skillignore'),
      'claude:backend/go-backend\n',
      'utf-8',
    )

    // Run sync
    const result = await runCLI(
      ['sync', '--project-dir', projectDir, '--target', 'claude'],
      sandbox,
    )
    expect(result.exitCode).toBe(0)

    const content = await fs.readFile(path.join(projectDir, 'CLAUDE.md'), 'utf-8')

    // Agent NOT excluded
    expect(content).toContain('go-pro')
    // Skill excluded by .skillignore
    expect(content).not.toContain('go-backend')
  }, 30_000)

  // ─── Test 17: Sync merge mode preserves user content ────────────────────

  it('sync merge mode preserves user content', async () => {
    const projectDir = path.join(sandbox, 'test-project')
    await fs.ensureDir(projectDir)

    // Create agent
    const agentDir = path.join(projectDir, '.ai-config', 'agents')
    await fs.ensureDir(agentDir)
    await fs.writeFile(
      path.join(agentDir, 'helper.md'),
      '---\nname: Helper\ndescription: Helps\n---\n# Helper\n',
      'utf-8',
    )

    // Pre-create CLAUDE.md with user content
    await fs.writeFile(
      path.join(projectDir, 'CLAUDE.md'),
      '# My Project Rules\n\nDo not use semicolons.\n',
      'utf-8',
    )

    // Run sync in merge mode
    const result = await runCLI(
      ['sync', '--project-dir', projectDir, '--target', 'claude', '--mode', 'merge'],
      sandbox,
    )
    expect(result.exitCode).toBe(0)

    const content = await fs.readFile(path.join(projectDir, 'CLAUDE.md'), 'utf-8')

    // User content preserved
    expect(content).toContain('My Project Rules')
    expect(content).toContain('Do not use semicolons')

    // Generated content within markers
    expect(content).toContain('<!-- BEGIN JAVI-AI -->')
    expect(content).toContain('<!-- END JAVI-AI -->')
    expect(content).toContain('Helper')
  }, 30_000)
})
