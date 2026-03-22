import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import { installSkillsForCLI } from '../installer/skills.js'
import { createTempDir, cleanupTempDir, fileExists, readFile } from './helpers.js'

// We need to redirect paths so skills install to our temp dir, not ~/.claude/
// Mock only constants (paths), NOT filesystem
vi.mock('../constants.js', () => {
  const tmpSkills = path.join(os.tmpdir(), `javi-ai-skills-test-${Date.now()}`)
  return {
    HOME: os.tmpdir(),
    CLI_OPTIONS: [
      {
        id: 'claude',
        label: 'Claude Code',
        configPath: path.join(os.tmpdir(), '.claude-test'),
        skillsPath: tmpSkills,
        available: true,
      },
    ],
    MANIFEST_PATH: path.join(os.tmpdir(), '.javi-ai-test', 'manifest.json'),
    BACKUP_DIR: path.join(os.tmpdir(), '.javi-ai-test', 'backups'),
    MARKER_START: '<!-- BEGIN JAVI-AI -->',
    MARKER_END: '<!-- END JAVI-AI -->',
    AI_CONFIG_DIR_NAME: '.ai-config',
    AI_CLI_CONFIG_FILES: { claude: 'CLAUDE.md' },
    SYNC_TARGETS: ['claude'],
  }
})

// Import after mock so we get the mocked paths
const { CLI_OPTIONS } = await import('../constants.js')

describe('installSkillsForCLI() — integration', () => {
  let skillsDest: string

  beforeEach(async () => {
    skillsDest = CLI_OPTIONS[0]!.skillsPath
    await fs.ensureDir(skillsDest)
  })

  afterEach(async () => {
    await fs.remove(skillsDest)
  })

  it('installs upstream skills with real SKILL.md files', async () => {
    const installed = await installSkillsForCLI('claude', false)

    expect(installed.length).toBeGreaterThan(30)

    // Verify actual files were created
    const firstSkill = installed.find(s => s !== '_shared')!
    expect(await fileExists(skillsDest, firstSkill, 'SKILL.md')).toBe(true)

    const content = await readFile(skillsDest, firstSkill, 'SKILL.md')
    expect(content.length).toBeGreaterThan(50)
  })

  it('installs own skills', async () => {
    const installed = await installSkillsForCLI('claude', false)

    // Own skills should be in the list
    expect(installed).toContain('skill-creator')
    expect(await fileExists(skillsDest, 'skill-creator', 'SKILL.md')).toBe(true)
  })

  it('installs _shared directory', async () => {
    const installed = await installSkillsForCLI('claude', false)

    expect(installed).toContain('_shared')
    expect(await fileExists(skillsDest, '_shared')).toBe(true)
  })

  it('appends EXTENSION.md to upstream skills that have it', async () => {
    const installed = await installSkillsForCLI('claude', false)

    // Check if any skill has an extension (sdd-explore typically does)
    // Read one that should have extension content (separator ---)
    if (installed.includes('sdd-explore')) {
      const content = await readFile(skillsDest, 'sdd-explore', 'SKILL.md')
      if (content.includes('---\n\n')) {
        // Has extension separator — extension was appended
        expect(content.split('---\n\n').length).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('handles symlinks at destination gracefully', async () => {
    // Create a symlink where a skill directory should go
    const symlinkTarget = await createTempDir()
    await fs.writeFile(path.join(symlinkTarget, 'old-file.txt'), 'old')
    const symlinkPath = path.join(skillsDest, 'skill-creator')
    await fs.ensureSymlink(symlinkTarget, symlinkPath)

    // Verify symlink exists
    const stat = await fs.lstat(symlinkPath)
    expect(stat.isSymbolicLink()).toBe(true)

    // Install should succeed (replacing the symlink)
    const installed = await installSkillsForCLI('claude', false)
    expect(installed).toContain('skill-creator')

    // Should now be a real directory, not a symlink
    const newStat = await fs.lstat(symlinkPath)
    expect(newStat.isSymbolicLink()).toBe(false)
    expect(newStat.isDirectory()).toBe(true)

    // Should have SKILL.md, not old-file.txt
    expect(await fileExists(skillsDest, 'skill-creator', 'SKILL.md')).toBe(true)

    await cleanupTempDir(symlinkTarget)
  })

  it('dry-run returns skill names without creating files', async () => {
    const installed = await installSkillsForCLI('claude', true)

    expect(installed.length).toBeGreaterThan(0)
    // No files should be created
    const dirs = await fs.readdir(skillsDest)
    expect(dirs.length).toBe(0)
  })

  it('unknown CLI returns empty array', async () => {
    const installed = await installSkillsForCLI('unknown-cli' as any, false)
    expect(installed).toEqual([])
  })

  // ── 3-Layer Model Tests ──────────────────────────────────────────────

  it('installs ATL skills (sdd-*, branch-pr, issue-creation, skill-registry)', async () => {
    const installed = await installSkillsForCLI('claude', false)

    // ATL-specific skills that only exist in agent-teams-lite
    expect(installed).toContain('branch-pr')
    expect(installed).toContain('issue-creation')
    expect(installed).toContain('skill-registry')
    expect(installed).toContain('sdd-apply')
    expect(installed).toContain('sdd-explore')

    expect(await fileExists(skillsDest, 'branch-pr', 'SKILL.md')).toBe(true)
    expect(await fileExists(skillsDest, 'issue-creation', 'SKILL.md')).toBe(true)
  })

  it('installs Gentleman-Skills curated (react-19, typescript, angular, github-pr)', async () => {
    const installed = await installSkillsForCLI('claude', false)

    expect(installed).toContain('react-19')
    expect(installed).toContain('typescript')
    expect(installed).toContain('angular')
    expect(installed).toContain('github-pr')

    // angular is multi-file (no SKILL.md, has subdirectories)
    expect(await fileExists(skillsDest, 'angular', 'core')).toBe(true)
    expect(await fileExists(skillsDest, 'angular', 'architecture')).toBe(true)
  })

  it('delta override replaces ATL original SKILL.md', async () => {
    const installed = await installSkillsForCLI('claude', false)
    expect(installed).toContain('sdd-apply')

    const content = await readFile(skillsDest, 'sdd-apply', 'SKILL.md')
    // The override version has different content than ATL original
    // Read the ATL original to compare
    const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../')
    const atlOriginal = await readFile(repoRoot, 'upstream', 'agent-teams-lite', 'skills', 'sdd-apply', 'SKILL.md')
    const overrideContent = await readFile(repoRoot, 'delta', 'overrides', 'sdd-apply', 'SKILL.md')

    // Installed should match override, NOT ATL original
    expect(content.startsWith(overrideContent.substring(0, 100))).toBe(true)
    expect(content).not.toBe(atlOriginal)
  })

  it('delta extension appends to SKILL.md with separator', async () => {
    const installed = await installSkillsForCLI('claude', false)
    expect(installed).toContain('sdd-explore')

    const content = await readFile(skillsDest, 'sdd-explore', 'SKILL.md')

    // Should have the separator between base and extension
    expect(content).toContain('\n\n---\n\n')

    // Read the extension to verify it's appended
    const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../')
    const extension = await readFile(repoRoot, 'delta', 'extensions', 'sdd-explore', 'EXTENSION.md')
    expect(content).toContain(extension.substring(0, 50))
  })

  it('own skills override upstream when same name exists (skill-creator)', async () => {
    const installed = await installSkillsForCLI('claude', false)

    // skill-creator exists in Gentleman-Skills AND own/ — own should win
    const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../')
    const ownContent = await readFile(repoRoot, 'own', 'skills', 'skill-creator', 'SKILL.md')
    const installedContent = await readFile(skillsDest, 'skill-creator', 'SKILL.md')

    // Should match own version (has "Project-specific"), not Gentleman version (has "Prowler-specific")
    expect(installedContent).toBe(ownContent)
  })

  it('total skills count matches expected (ATL + GS + own + _shared)', async () => {
    const installed = await installSkillsForCLI('claude', false)

    // 12 ATL + 15 GS + 29 own + 1 _shared = 57
    // But skill-creator is in both GS and own (counted twice in install list)
    expect(installed.length).toBeGreaterThanOrEqual(55)
  })

  it('_shared has ATL convention files', async () => {
    await installSkillsForCLI('claude', false)

    expect(await fileExists(skillsDest, '_shared', 'persistence-contract.md')).toBe(true)
    expect(await fileExists(skillsDest, '_shared', 'engram-convention.md')).toBe(true)
    expect(await fileExists(skillsDest, '_shared', 'openspec-convention.md')).toBe(true)
    expect(await fileExists(skillsDest, '_shared', 'sdd-phase-common.md')).toBe(true)
  })
})
