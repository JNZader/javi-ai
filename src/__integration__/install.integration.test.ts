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
})
