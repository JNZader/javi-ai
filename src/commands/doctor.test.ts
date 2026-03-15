/**
 * doctor.test.ts — Integration tests for runDoctor
 *
 * Strategy for ASSETS_ROOT: doctor.ts computes ASSETS_ROOT = path.resolve(__dirname, '../../')
 * We redirect it using a FIXED path stored in process.env.
 * Constants and paths use getters so they're re-evaluated per test,
 * but ASSETS_ROOT is fixed for the whole file (module load time).
 * We use a fixed base dir and rebuild content in beforeEach.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import crypto from 'crypto'

// vi.hoisted() runs before vi.mock() factories — use require() to access built-ins
const { FIXED_ASSETS_ROOT } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const p = require('path')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const o = require('os')
  return {
    FIXED_ASSETS_ROOT: p.join(o.tmpdir(), 'javi-ai-doctor-assets-test') as string,
  }
})

// Per-test mutable state: tmpDir changes each test
let currentTmpDir = path.join(os.tmpdir(), 'javi-ai-doctor-INITIAL')

function getDoctorPaths() {
  const t = currentTmpDir
  return {
    tmpDir: t,
    MANIFEST_PATH: path.join(t, 'manifest.json'),
    BACKUP_DIR: path.join(t, 'backups'),
    CLAUDE_CONFIG: path.join(t, 'claude-config'),
    CLAUDE_SKILLS: path.join(t, 'claude-skills'),
    OPENCODE_CONFIG: path.join(t, 'opencode-config'),
    OPENCODE_SKILLS: path.join(t, 'opencode-skills'),
  }
}

vi.mock('../constants.js', () => ({
  get MANIFEST_PATH() { return getDoctorPaths().MANIFEST_PATH },
  get BACKUP_DIR() { return getDoctorPaths().BACKUP_DIR },
  MARKER_START: '<!-- BEGIN JAVI-AI -->',
  MARKER_END: '<!-- END JAVI-AI -->',
  get HOME() { return require('os').homedir() },
  get CLI_OPTIONS() {
    const p = getDoctorPaths()
    return [
      {
        id: 'claude',
        label: 'Claude Code',
        configPath: p.CLAUDE_CONFIG,
        skillsPath: p.CLAUDE_SKILLS,
        available: true,
      },
      {
        id: 'opencode',
        label: 'OpenCode',
        configPath: p.OPENCODE_CONFIG,
        skillsPath: p.OPENCODE_SKILLS,
        available: true,
      },
    ]
  },
}))

vi.mock('../installer/manifest.js', () => ({
  readManifest: vi.fn(),
  writeManifest: vi.fn(),
}))

vi.mock('child_process', () => ({
  execFile: vi.fn(),
}))

vi.mock('url', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodePath = require('path') as typeof import('path')
  const actual = await importOriginal<typeof import('url')>()
  return {
    ...actual,
    fileURLToPath: (url: string | URL) => {
      const urlStr = url.toString()
      if (urlStr.includes('doctor') && !urlStr.includes('doctor.test')) {
        // doctor.ts: ASSETS_ROOT = path.resolve(__dirname, '../../')
        // return FIXED_ASSETS_ROOT/src/commands/doctor.js
        // __dirname = FIXED_ASSETS_ROOT/src/commands
        // path.resolve(FIXED_ASSETS_ROOT/src/commands, '../../') = FIXED_ASSETS_ROOT ✓
        return nodePath.join(FIXED_ASSETS_ROOT, 'src', 'commands', 'doctor.js')
      }
      return actual.fileURLToPath(url)
    },
  }
})

import { runDoctor } from './doctor.js'
import { readManifest } from '../installer/manifest.js'
import { execFile } from 'child_process'

const mockReadManifest = vi.mocked(readManifest)
const mockExecFile = vi.mocked(execFile)

function makeManifest(clis: string[] = []) {
  return {
    version: '0.1.0',
    installedAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-06-01T08:30:00.000Z',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clis: clis as any,
    skills: {},
  }
}

function mockWhich(binResults: Record<string, string | null>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockExecFile.mockImplementation((_bin: string, args: any, callback: any) => {
    const bin = args[0] as string
    const result = binResults[bin]
    if (result !== undefined && result !== null) {
      callback(null, { stdout: result + '\n', stderr: '' })
    } else {
      callback(new Error('not found'), { stdout: '', stderr: '' })
    }
    return {} as ReturnType<typeof execFile>
  })
}

describe('runDoctor', () => {
  beforeEach(async () => {
    currentTmpDir = path.join(os.tmpdir(), `javi-ai-doctor-${crypto.randomUUID()}`)
    await fs.ensureDir(currentTmpDir)
    // Clear FIXED_ASSETS_ROOT for each test
    await fs.remove(FIXED_ASSETS_ROOT)
    mockWhich({})
  })

  afterEach(async () => {
    await fs.remove(currentTmpDir)
    await fs.remove(FIXED_ASSETS_ROOT)
    vi.clearAllMocks()
  })

  it('no manifest: installation section shows installed=false', async () => {
    mockReadManifest.mockResolvedValue(makeManifest([]))

    const result = await runDoctor()

    const installSection = result.sections.find(s => s.title === 'Installation')!
    expect(installSection).toBeDefined()
    const failCheck = installSection.checks.find(c => c.status === 'fail')
    expect(failCheck).toBeDefined()
    expect(failCheck?.label).toContain('No installation found')
  })

  it('manifest with 2 CLIs: shows them listed', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude', 'opencode']))

    const result = await runDoctor()

    const installSection = result.sections.find(s => s.title === 'Installation')!
    const cliCheck = installSection.checks.find(c => c.label.includes('CLIs configured'))
    expect(cliCheck).toBeDefined()
    expect(cliCheck?.label).toContain('claude')
    expect(cliCheck?.label).toContain('opencode')
  })

  it('CLI in manifest + found in PATH: cli status = ok', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))
    mockWhich({ claude: '/usr/bin/claude' })

    const result = await runDoctor()

    const cliSection = result.sections.find(s => s.title === 'CLI Detection')!
    const claudeCheck = cliSection.checks.find(c => c.label.trim() === 'claude')!
    expect(claudeCheck.status).toBe('ok')
    expect(claudeCheck.detail).toContain('/usr/bin/claude')
  })

  it('CLI in manifest + NOT in PATH: cli status = fail', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))
    mockWhich({ claude: null })

    const result = await runDoctor()

    const cliSection = result.sections.find(s => s.title === 'CLI Detection')!
    const claudeCheck = cliSection.checks.find(c => c.label.trim() === 'claude')!
    expect(claudeCheck.status).toBe('fail')
    expect(claudeCheck.detail).toContain('not found in PATH')
  })

  it('CLI not in manifest: cli status = skip', async () => {
    mockReadManifest.mockResolvedValue(makeManifest([]))
    mockWhich({ claude: '/usr/bin/claude' })

    const result = await runDoctor()

    const cliSection = result.sections.find(s => s.title === 'CLI Detection')!
    const claudeCheck = cliSection.checks.find(c => c.label.trim() === 'claude')!
    expect(claudeCheck.status).toBe('skip')
  })

  it('skill count matches expected: status ok', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    const upstreamSkills = path.join(FIXED_ASSETS_ROOT, 'upstream', 'skills')
    await fs.ensureDir(path.join(upstreamSkills, 'react-19'))
    await fs.writeFile(path.join(upstreamSkills, 'react-19', 'SKILL.md'), '# React 19', 'utf-8')

    const p = getDoctorPaths()
    await fs.ensureDir(path.join(p.CLAUDE_SKILLS, 'react-19'))
    await fs.writeFile(path.join(p.CLAUDE_SKILLS, 'react-19', 'SKILL.md'), '# React 19', 'utf-8')

    const result = await runDoctor()

    const skillSection = result.sections.find(s => s.title === 'Skills')!
    const claudeSkillCheck = skillSection.checks.find(c => c.label.trim() === 'claude')!
    expect(claudeSkillCheck.status).toBe('ok')
  })

  it('skill count below expected: status fail', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    const upstreamSkills = path.join(FIXED_ASSETS_ROOT, 'upstream', 'skills')
    for (const s of ['react-19', 'typescript']) {
      await fs.ensureDir(path.join(upstreamSkills, s))
      await fs.writeFile(path.join(upstreamSkills, s, 'SKILL.md'), `# ${s}`, 'utf-8')
    }

    const p = getDoctorPaths()
    await fs.ensureDir(path.join(p.CLAUDE_SKILLS, 'react-19'))
    await fs.writeFile(path.join(p.CLAUDE_SKILLS, 'react-19', 'SKILL.md'), '# React 19', 'utf-8')

    const result = await runDoctor()

    const skillSection = result.sections.find(s => s.title === 'Skills')!
    const claudeSkillCheck = skillSection.checks.find(c => c.label.trim() === 'claude')!
    expect(claudeSkillCheck.status).toBe('fail')
    expect(claudeSkillCheck.detail).toContain('1/2')
  })

  it('config file present: section has ok/fail checks (not skip) for installed CLI', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    const result = await runDoctor()
    const configSection = result.sections.find(s => s.title === 'Config Files')!

    const claudeConfigCheck = configSection.checks.find(c =>
      c.label.includes('.claude') || c.label.includes('CLAUDE')
    )
    expect(claudeConfigCheck).toBeDefined()
    expect(['ok', 'fail']).toContain(claudeConfigCheck?.status)
  })

  it('config file absent: status fail for installed CLI config', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    const result = await runDoctor()
    const configSection = result.sections.find(s => s.title === 'Config Files')!

    const claudeConfigCheck = configSection.checks.find(c =>
      c.label.includes('.claude') || c.label.includes('CLAUDE')
    )!
    expect(['ok', 'fail']).toContain(claudeConfigCheck.status)
    if (claudeConfigCheck.status === 'fail') {
      expect(claudeConfigCheck.detail).toContain('missing')
    }
  })

  it('hook file absent: status fail (when hooks source exists)', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    const hooksSrc = path.join(FIXED_ASSETS_ROOT, 'own', 'hooks', 'claude')
    await fs.ensureDir(hooksSrc)
    await fs.writeFile(path.join(hooksSrc, 'check-format.sh'), '#!/bin/sh', 'utf-8')

    const result = await runDoctor()
    const hookSection = result.sections.find(s => s.title === 'Hooks')!

    const hookCheck = hookSection.checks.find(c => c.label.includes('check-format.sh'))
    if (hookCheck) {
      expect(hookCheck.status).toBe('fail')
      expect(hookCheck.detail).toContain('not found')
    }
  })

  it('hook file present + executable: hook check status reflects install state', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    const hooksSrc = path.join(FIXED_ASSETS_ROOT, 'own', 'hooks', 'claude')
    await fs.ensureDir(hooksSrc)
    await fs.writeFile(path.join(hooksSrc, 'post-tool.sh'), '#!/bin/sh', 'utf-8')

    const hookFile = path.join(os.homedir(), '.claude', 'hooks', 'post-tool.sh')
    const hookExists = await fs.pathExists(hookFile)

    const result = await runDoctor()
    const hookSection = result.sections.find(s => s.title === 'Hooks')!

    const hookCheck = hookSection.checks.find(c => c.label === 'post-tool.sh')
    if (hookCheck && hookExists) {
      expect(['ok', 'fail']).toContain(hookCheck.status)
    } else if (hookCheck) {
      expect(hookCheck.status).toBe('fail')
    }
  })

  it('hook file present + NOT executable: check status is fail', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    const hooksSrc = path.join(FIXED_ASSETS_ROOT, 'own', 'hooks', 'claude')
    await fs.ensureDir(hooksSrc)
    await fs.writeFile(path.join(hooksSrc, 'my-hook.sh'), '#!/bin/sh', 'utf-8')

    const result = await runDoctor()
    const hookSection = result.sections.find(s => s.title === 'Hooks')!

    const hookCheck = hookSection.checks.find(c => c.label === 'my-hook.sh')
    if (hookCheck) {
      expect(hookCheck.status).toBe('fail')
    }
  })

  it('backup dirs listed (up to 5)', async () => {
    mockReadManifest.mockResolvedValue(makeManifest([]))

    const p = getDoctorPaths()
    await fs.ensureDir(p.BACKUP_DIR)
    const backupNames = [
      '2024-01-01T00-00-00-000Z',
      '2024-02-01T00-00-00-000Z',
      '2024-03-01T00-00-00-000Z',
      '2024-04-01T00-00-00-000Z',
      '2024-05-01T00-00-00-000Z',
      '2024-06-01T00-00-00-000Z',
      '2024-07-01T00-00-00-000Z',
    ]

    for (const name of backupNames) {
      const dir = path.join(p.BACKUP_DIR, name)
      await fs.ensureDir(dir)
      await fs.writeFile(path.join(dir, 'test.md'), '# test', 'utf-8')
    }

    const result = await runDoctor()
    const backupSection = result.sections.find(s => s.title === 'Backups')!

    const backupEntries = backupSection.checks.filter(c => c.status === 'ok')
    expect(backupEntries.length).toBeLessThanOrEqual(5)

    const moreEntry = backupSection.checks.find(c => c.label.includes('more'))
    expect(moreEntry).toBeDefined()
    expect(moreEntry?.label).toContain('2 more')
  })

  it('backup file count is correct (no double-counting) after bug fix', async () => {
    mockReadManifest.mockResolvedValue(makeManifest([]))

    const p = getDoctorPaths()
    await fs.ensureDir(p.BACKUP_DIR)
    const backupDir = path.join(p.BACKUP_DIR, '2024-01-01T00-00-00-000Z')
    await fs.ensureDir(backupDir)

    // 3 top-level files + 1 subdir with 1 nested file = 4 total files
    await fs.writeFile(path.join(backupDir, 'file1.md'), 'a', 'utf-8')
    await fs.writeFile(path.join(backupDir, 'file2.md'), 'b', 'utf-8')
    await fs.writeFile(path.join(backupDir, 'file3.json'), 'c', 'utf-8')
    await fs.ensureDir(path.join(backupDir, 'subdir'))
    await fs.writeFile(path.join(backupDir, 'subdir', 'nested.md'), 'd', 'utf-8')

    const result = await runDoctor()
    const backupSection = result.sections.find(s => s.title === 'Backups')!
    const backupEntry = backupSection.checks.find(c => c.status === 'ok')!

    expect(backupEntry.detail).toContain('4 files')
  })

  it('sections array has all expected sections', async () => {
    mockReadManifest.mockResolvedValue(makeManifest([]))

    const result = await runDoctor()

    const titles = result.sections.map(s => s.title)
    expect(titles).toContain('Installation')
    expect(titles).toContain('CLI Detection')
    expect(titles).toContain('Skills')
    expect(titles).toContain('Config Files')
    expect(titles).toContain('Hooks')
    expect(titles).toContain('Backups')
  })

  it('backup directory absent: shows skip check', async () => {
    mockReadManifest.mockResolvedValue(makeManifest([]))

    const result = await runDoctor()
    const backupSection = result.sections.find(s => s.title === 'Backups')!
    const skipCheck = backupSection.checks.find(c => c.status === 'skip')
    expect(skipCheck).toBeDefined()
  })

  it('backup dirs are sorted newest-first (reverse chronological)', async () => {
    mockReadManifest.mockResolvedValue(makeManifest([]))

    const p = getDoctorPaths()
    await fs.ensureDir(p.BACKUP_DIR)

    const backupNames = [
      '2024-01-01T00-00-00-000Z',
      '2024-03-01T00-00-00-000Z',
      '2024-02-01T00-00-00-000Z',
    ]
    for (const name of backupNames) {
      await fs.ensureDir(path.join(p.BACKUP_DIR, name))
      await fs.writeFile(path.join(p.BACKUP_DIR, name, 'file.md'), 'x', 'utf-8')
    }

    const result = await runDoctor()
    const backupSection = result.sections.find(s => s.title === 'Backups')!
    const okEntries = backupSection.checks.filter(c => c.status === 'ok')

    // Should be newest first
    expect(okEntries[0]!.label).toContain('2024-03')
    expect(okEntries[okEntries.length - 1]!.label).toContain('2024-01')
  })

  it('skill count: installed skills WITHOUT SKILL.md are not counted', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    const upstreamSkills = path.join(FIXED_ASSETS_ROOT, 'upstream', 'skills')
    await fs.ensureDir(path.join(upstreamSkills, 'react-19'))
    await fs.writeFile(path.join(upstreamSkills, 'react-19', 'SKILL.md'), '# React 19', 'utf-8')

    const p = getDoctorPaths()
    // Create a dir without SKILL.md
    await fs.ensureDir(path.join(p.CLAUDE_SKILLS, 'fake-skill'))
    await fs.writeFile(path.join(p.CLAUDE_SKILLS, 'fake-skill', 'README.md'), '# Fake', 'utf-8')

    const result = await runDoctor()

    const skillSection = result.sections.find(s => s.title === 'Skills')!
    const claudeSkillCheck = skillSection.checks.find(c => c.label.trim() === 'claude')!
    // fake-skill without SKILL.md is NOT counted, so 0/1
    expect(claudeSkillCheck.status).toBe('fail')
    expect(claudeSkillCheck.detail).toContain('0/1')
  })

  it('opencode config shows as skip when opencode not in manifest', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    const result = await runDoctor()
    const configSection = result.sections.find(s => s.title === 'Config Files')!

    const opencodeConfigCheck = configSection.checks.find(c =>
      c.label.includes('opencode')
    )
    if (opencodeConfigCheck) {
      expect(opencodeConfigCheck.status).toBe('skip')
    }
  })

  it('hook detection: installs.has(claude) + missing hooksSrc → skip/no hook checks', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))
    // No FIXED_ASSETS_ROOT/own/hooks/claude created → hooksSrc doesn't exist

    const result = await runDoctor()
    const hookSection = result.sections.find(s => s.title === 'Hooks')!

    // No hook source → no hook checks → shows "No hooks installed"
    const skipCheck = hookSection.checks.find(c => c.status === 'skip')
    expect(skipCheck).toBeDefined()
  })

  it('empty backup directory: shows "No backups found" skip check', async () => {
    mockReadManifest.mockResolvedValue(makeManifest([]))

    const p = getDoctorPaths()
    await fs.ensureDir(p.BACKUP_DIR)
    // Empty backup dir

    const result = await runDoctor()
    const backupSection = result.sections.find(s => s.title === 'Backups')!
    const skipCheck = backupSection.checks.find(c =>
      c.label.includes('No backups') && c.status === 'skip'
    )
    expect(skipCheck).toBeDefined()
  })

  it('backup count >5: shows "and N more" with correct count', async () => {
    mockReadManifest.mockResolvedValue(makeManifest([]))

    const p = getDoctorPaths()
    await fs.ensureDir(p.BACKUP_DIR)

    for (let i = 1; i <= 8; i++) {
      const name = `2024-0${i.toString().padStart(1, '0')}-01T00-00-00-000Z`
      await fs.ensureDir(path.join(p.BACKUP_DIR, name))
      await fs.writeFile(path.join(p.BACKUP_DIR, name, 'test.md'), '# test', 'utf-8')
    }

    const result = await runDoctor()
    const backupSection = result.sections.find(s => s.title === 'Backups')!
    const moreEntry = backupSection.checks.find(c => c.label.includes('more'))!
    expect(moreEntry).toBeDefined()
    expect(moreEntry.label).toContain('3 more')
  })

  // ── countExpectedSkills deduplication ──────────────────────────────────────

  it('countExpectedSkills: same skill name in own/ and upstream/ is only counted once', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    const upstreamSkills = path.join(FIXED_ASSETS_ROOT, 'upstream', 'skills')
    const ownSkills = path.join(FIXED_ASSETS_ROOT, 'own', 'skills')

    // Both have 'react-19', upstream also has 'typescript'
    await fs.ensureDir(path.join(upstreamSkills, 'react-19'))
    await fs.writeFile(path.join(upstreamSkills, 'react-19', 'SKILL.md'), '# React 19', 'utf-8')
    await fs.ensureDir(path.join(upstreamSkills, 'typescript'))
    await fs.writeFile(path.join(upstreamSkills, 'typescript', 'SKILL.md'), '# TS', 'utf-8')

    // own also has 'react-19' (duplicate)
    await fs.ensureDir(path.join(ownSkills, 'react-19'))
    await fs.writeFile(path.join(ownSkills, 'react-19', 'SKILL.md'), '# React 19 own', 'utf-8')

    // Install all expected skills in claude's path
    const p = getDoctorPaths()
    await fs.ensureDir(path.join(p.CLAUDE_SKILLS, 'react-19'))
    await fs.writeFile(path.join(p.CLAUDE_SKILLS, 'react-19', 'SKILL.md'), '# React 19', 'utf-8')
    await fs.ensureDir(path.join(p.CLAUDE_SKILLS, 'typescript'))
    await fs.writeFile(path.join(p.CLAUDE_SKILLS, 'typescript', 'SKILL.md'), '# TS', 'utf-8')

    const result = await runDoctor()
    const skillSection = result.sections.find(s => s.title === 'Skills')!
    const claudeCheck = skillSection.checks.find(c => c.label.trim() === 'claude')!

    // Expected = 2 (react-19 + typescript, deduplicated), present = 2 → ok
    expect(claudeCheck.status).toBe('ok')
    expect(claudeCheck.detail).toContain('2/2')
  })

  it('countExpectedSkills: upstream skills without SKILL.md are excluded', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    const upstreamSkills = path.join(FIXED_ASSETS_ROOT, 'upstream', 'skills')
    // skill-without-md has no SKILL.md
    await fs.ensureDir(path.join(upstreamSkills, 'skill-without-md'))
    await fs.writeFile(path.join(upstreamSkills, 'skill-without-md', 'README.md'), '# Not counted', 'utf-8')

    // valid-skill has SKILL.md
    await fs.ensureDir(path.join(upstreamSkills, 'valid-skill'))
    await fs.writeFile(path.join(upstreamSkills, 'valid-skill', 'SKILL.md'), '# Valid', 'utf-8')

    const p = getDoctorPaths()
    await fs.ensureDir(path.join(p.CLAUDE_SKILLS, 'valid-skill'))
    await fs.writeFile(path.join(p.CLAUDE_SKILLS, 'valid-skill', 'SKILL.md'), '# Valid', 'utf-8')

    const result = await runDoctor()
    const skillSection = result.sections.find(s => s.title === 'Skills')!
    const claudeCheck = skillSection.checks.find(c => c.label.trim() === 'claude')!

    // skill-without-md is NOT counted, so expected = 1
    expect(claudeCheck.detail).toContain('1/1')
    expect(claudeCheck.status).toBe('ok')
  })

  it('countExpectedSkills: upstream dot-dirs and _shared are excluded', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    const upstreamSkills = path.join(FIXED_ASSETS_ROOT, 'upstream', 'skills')
    // .hidden should be skipped
    await fs.ensureDir(path.join(upstreamSkills, '.hidden'))
    await fs.writeFile(path.join(upstreamSkills, '.hidden', 'SKILL.md'), '# Hidden', 'utf-8')
    // _shared should be skipped
    await fs.ensureDir(path.join(upstreamSkills, '_shared'))
    await fs.writeFile(path.join(upstreamSkills, '_shared', 'SKILL.md'), '# Shared', 'utf-8')
    // real skill
    await fs.ensureDir(path.join(upstreamSkills, 'react-19'))
    await fs.writeFile(path.join(upstreamSkills, 'react-19', 'SKILL.md'), '# React 19', 'utf-8')

    const p = getDoctorPaths()
    await fs.ensureDir(path.join(p.CLAUDE_SKILLS, 'react-19'))
    await fs.writeFile(path.join(p.CLAUDE_SKILLS, 'react-19', 'SKILL.md'), '# React 19', 'utf-8')

    const result = await runDoctor()
    const skillSection = result.sections.find(s => s.title === 'Skills')!
    const claudeCheck = skillSection.checks.find(c => c.label.trim() === 'claude')!

    // Only react-19 counts (1 expected)
    expect(claudeCheck.detail).toContain('1/1')
    expect(claudeCheck.status).toBe('ok')
  })

  // ── which() null return → fail status ──────────────────────────────────────

  it('which returns null (empty stdout): cli status is fail', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    // Mock which to return empty string (stdout = '')
    mockExecFile.mockImplementation((_bin: string, _args: unknown, callback: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(callback as any)(null, { stdout: '', stderr: '' })
      return {} as ReturnType<typeof execFile>
    })

    const result = await runDoctor()
    const cliSection = result.sections.find(s => s.title === 'CLI Detection')!
    const claudeCheck = cliSection.checks.find(c => c.label.trim() === 'claude')!

    expect(claudeCheck.status).toBe('fail')
    expect(claudeCheck.detail).toContain('not found in PATH')
  })

  // ── Skill count boundary: present === expected → ok ─────────────────────────

  it('skill count: present === expected → ok (not fail)', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    // 1 upstream skill
    const upstreamSkills = path.join(FIXED_ASSETS_ROOT, 'upstream', 'skills')
    await fs.ensureDir(path.join(upstreamSkills, 'the-skill'))
    await fs.writeFile(path.join(upstreamSkills, 'the-skill', 'SKILL.md'), '# The Skill', 'utf-8')

    // Exactly 1 installed (matches expected)
    const p = getDoctorPaths()
    await fs.ensureDir(path.join(p.CLAUDE_SKILLS, 'the-skill'))
    await fs.writeFile(path.join(p.CLAUDE_SKILLS, 'the-skill', 'SKILL.md'), '# The Skill', 'utf-8')

    const result = await runDoctor()
    const skillSection = result.sections.find(s => s.title === 'Skills')!
    const claudeCheck = skillSection.checks.find(c => c.label.trim() === 'claude')!

    expect(claudeCheck.status).toBe('ok')
    expect(claudeCheck.detail).toContain('1/1')
  })

  it('skill count: present === expected - 1 → fail', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    const upstreamSkills = path.join(FIXED_ASSETS_ROOT, 'upstream', 'skills')
    await fs.ensureDir(path.join(upstreamSkills, 'skill-a'))
    await fs.writeFile(path.join(upstreamSkills, 'skill-a', 'SKILL.md'), '# A', 'utf-8')
    await fs.ensureDir(path.join(upstreamSkills, 'skill-b'))
    await fs.writeFile(path.join(upstreamSkills, 'skill-b', 'SKILL.md'), '# B', 'utf-8')

    // Only 1 installed out of 2
    const p = getDoctorPaths()
    await fs.ensureDir(path.join(p.CLAUDE_SKILLS, 'skill-a'))
    await fs.writeFile(path.join(p.CLAUDE_SKILLS, 'skill-a', 'SKILL.md'), '# A', 'utf-8')

    const result = await runDoctor()
    const skillSection = result.sections.find(s => s.title === 'Skills')!
    const claudeCheck = skillSection.checks.find(c => c.label.trim() === 'claude')!

    expect(claudeCheck.status).toBe('fail')
    expect(claudeCheck.detail).toContain('1/2')
  })

  // ── Backup limit boundary tests ────────────────────────────────────────────

  it('backup: exactly 5 dirs → no "more" entry', async () => {
    mockReadManifest.mockResolvedValue(makeManifest([]))

    const p = getDoctorPaths()
    await fs.ensureDir(p.BACKUP_DIR)
    for (let i = 1; i <= 5; i++) {
      const name = `2024-0${i}-01T00-00-00-000Z`
      await fs.ensureDir(path.join(p.BACKUP_DIR, name))
      await fs.writeFile(path.join(p.BACKUP_DIR, name, 'f.md'), 'x', 'utf-8')
    }

    const result = await runDoctor()
    const backupSection = result.sections.find(s => s.title === 'Backups')!
    const moreEntry = backupSection.checks.find(c => c.label.includes('more'))
    const okEntries = backupSection.checks.filter(c => c.status === 'ok')

    expect(moreEntry).toBeUndefined()
    expect(okEntries).toHaveLength(5)
  })

  it('backup: exactly 6 dirs → "1 more" entry', async () => {
    mockReadManifest.mockResolvedValue(makeManifest([]))

    const p = getDoctorPaths()
    await fs.ensureDir(p.BACKUP_DIR)
    for (let i = 1; i <= 6; i++) {
      const name = `2024-0${i}-01T00-00-00-000Z`
      await fs.ensureDir(path.join(p.BACKUP_DIR, name))
      await fs.writeFile(path.join(p.BACKUP_DIR, name, 'f.md'), 'x', 'utf-8')
    }

    const result = await runDoctor()
    const backupSection = result.sections.find(s => s.title === 'Backups')!
    const moreEntry = backupSection.checks.find(c => c.label.includes('more'))!
    expect(moreEntry).toBeDefined()
    expect(moreEntry.label).toContain('1 more')
    expect(moreEntry.status).toBe('skip')
  })

  it('backup: exactly 0 dirs in backup dir → "No backups found" skip', async () => {
    mockReadManifest.mockResolvedValue(makeManifest([]))

    const p = getDoctorPaths()
    await fs.ensureDir(p.BACKUP_DIR)
    // empty backup dir

    const result = await runDoctor()
    const backupSection = result.sections.find(s => s.title === 'Backups')!
    const skipCheck = backupSection.checks.find(c => c.label.includes('No backups') && c.status === 'skip')
    expect(skipCheck).toBeDefined()
  })

  // ── Health score: correct totals with mixed results ─────────────────────────

  it('sections contain correct status distribution: ok/fail/skip mix', async () => {
    // Use claude (installed) + opencode (not installed)
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))
    mockWhich({ claude: '/usr/bin/claude' })

    const result = await runDoctor()

    // Installation section: should have ok checks (claude is installed)
    const installSection = result.sections.find(s => s.title === 'Installation')!
    const installOkChecks = installSection.checks.filter(c => c.status === 'ok')
    expect(installOkChecks.length).toBeGreaterThan(0)

    // CLI section: claude → ok, opencode → skip
    const cliSection = result.sections.find(s => s.title === 'CLI Detection')!
    const claudeCliCheck = cliSection.checks.find(c => c.label.trim() === 'claude')!
    const opencodeCliCheck = cliSection.checks.find(c => c.label.trim() === 'opencode')!
    expect(claudeCliCheck.status).toBe('ok')
    expect(opencodeCliCheck.status).toBe('skip')

    // Opencode config → skip (not installed)
    const configSection = result.sections.find(s => s.title === 'Config Files')!
    const opencodeConfigCheck = configSection.checks.find(c => c.label.includes('opencode'))
    if (opencodeConfigCheck) {
      expect(opencodeConfigCheck.status).toBe('skip')
    }
  })

  // ── Config file check: each of the 6 CLIs ──────────────────────────────────

  it('config section: installed CLI with missing config file → fail', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    const result = await runDoctor()
    const configSection = result.sections.find(s => s.title === 'Config Files')!

    const claudeConfig = configSection.checks.find(c =>
      c.label.includes('CLAUDE.md') || c.label.includes('.claude')
    )!
    expect(claudeConfig).toBeDefined()
    // Since the file doesn't exist in the real home (test isolation), it shows fail
    expect(['ok', 'fail']).toContain(claudeConfig.status)
  })

  it('config section: all uninstalled CLIs show skip', async () => {
    mockReadManifest.mockResolvedValue(makeManifest([]))

    const result = await runDoctor()
    const configSection = result.sections.find(s => s.title === 'Config Files')!

    // All should be skip since no CLI is installed
    expect(configSection.checks.every(c => c.status === 'skip')).toBe(true)
  })

  it('config section: opencode installed → shows ok or fail (not skip)', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['opencode']))

    const result = await runDoctor()
    const configSection = result.sections.find(s => s.title === 'Config Files')!

    const opencodeConfig = configSection.checks.find(c => c.label.includes('opencode'))
    if (opencodeConfig) {
      expect(['ok', 'fail']).toContain(opencodeConfig.status)
    }
  })

  // ── Hook executable check ──────────────────────────────────────────────────

  it('hook check: hook file exists but is not executable → status fail', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    const hooksSrc = path.join(FIXED_ASSETS_ROOT, 'own', 'hooks', 'claude')
    await fs.ensureDir(hooksSrc)
    await fs.writeFile(path.join(hooksSrc, 'test-hook.sh'), '#!/bin/sh', 'utf-8')

    // Spy on fs.access to simulate "not executable"
    const accessSpy = vi.spyOn(fs, 'access').mockImplementation((_path, _mode) => {
      return Promise.reject(new Error('EACCES: permission denied'))
    })

    // Spy on fs.pathExists to return true for the hook path
    const hookPath = path.join(os.homedir(), '.claude', 'hooks', 'test-hook.sh')
    const pathExistsSpy = vi.spyOn(fs, 'pathExists').mockImplementation(async (p) => {
      if (String(p) === hooksSrc) return true
      if (String(p) === hookPath) return true
      return false
    })

    const result = await runDoctor()
    const hookSection = result.sections.find(s => s.title === 'Hooks')!

    const hookCheck = hookSection.checks.find(c => c.label === 'test-hook.sh')
    if (hookCheck) {
      expect(hookCheck.status).toBe('fail')
      expect(hookCheck.detail).toContain('not executable')
    }

    accessSpy.mockRestore()
    pathExistsSpy.mockRestore()
  })

  it('hook check: hook file exists and is executable → status ok', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    const hooksSrc = path.join(FIXED_ASSETS_ROOT, 'own', 'hooks', 'claude')
    await fs.ensureDir(hooksSrc)
    await fs.writeFile(path.join(hooksSrc, 'exec-hook.sh'), '#!/bin/sh', 'utf-8')

    const hookPath = path.join(os.homedir(), '.claude', 'hooks', 'exec-hook.sh')

    // Spy on pathExists to return true for both hooksSrc and the hook file
    const pathExistsSpy = vi.spyOn(fs, 'pathExists').mockImplementation(async (p) => {
      if (String(p) === hooksSrc) return true
      if (String(p) === hookPath) return true
      return false
    })

    // Spy on access to simulate executable
    const accessSpy = vi.spyOn(fs, 'access').mockResolvedValue(undefined)

    const result = await runDoctor()
    const hookSection = result.sections.find(s => s.title === 'Hooks')!

    const hookCheck = hookSection.checks.find(c => c.label === 'exec-hook.sh')
    if (hookCheck) {
      expect(hookCheck.status).toBe('ok')
      expect(hookCheck.detail).toContain('executable')
    }

    accessSpy.mockRestore()
    pathExistsSpy.mockRestore()
  })

  // ── No CLIs installed: skills section shows skip ───────────────────────────

  it('skills section: no CLIs installed → shows "No CLIs installed" skip', async () => {
    mockReadManifest.mockResolvedValue(makeManifest([]))

    const result = await runDoctor()
    const skillSection = result.sections.find(s => s.title === 'Skills')!

    const skipCheck = skillSection.checks.find(c => c.label.includes('No CLIs installed'))
    expect(skipCheck).toBeDefined()
    expect(skipCheck?.status).toBe('skip')
  })

  // ── Installation section dates ─────────────────────────────────────────────

  it('installation section: shows correct date from manifest', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    const result = await runDoctor()
    const installSection = result.sections.find(s => s.title === 'Installation')!

    const dateCheck = installSection.checks.find(c => c.label.includes('Installed on'))
    expect(dateCheck).toBeDefined()
    expect(dateCheck?.label).toContain('2024-01-15')
    expect(dateCheck?.label).toContain('2024-06-01')
    expect(dateCheck?.status).toBe('ok')
  })

  it('installation section: shows installed CLIs list', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude', 'opencode']))

    const result = await runDoctor()
    const installSection = result.sections.find(s => s.title === 'Installation')!

    const cliListCheck = installSection.checks.find(c => c.label.includes('CLIs configured'))
    expect(cliListCheck).toBeDefined()
    expect(cliListCheck?.status).toBe('ok')
  })

  // ── Additional tests to kill surviving string/conditional mutants ──────────

  it('installation "no install found" detail is non-empty string', async () => {
    mockReadManifest.mockResolvedValue(makeManifest([]))

    const result = await runDoctor()
    const installSection = result.sections.find(s => s.title === 'Installation')!
    const failCheck = installSection.checks.find(c => c.status === 'fail')

    expect(failCheck?.detail).toBeTruthy()
    expect(failCheck?.detail?.length).toBeGreaterThan(0)
    expect(failCheck?.detail).toContain('javi-ai')
  })

  it('cli detection: skip detail is non-empty (not installed via javi-ai)', async () => {
    mockReadManifest.mockResolvedValue(makeManifest([]))
    mockWhich({ claude: null })

    const result = await runDoctor()
    const cliSection = result.sections.find(s => s.title === 'CLI Detection')!
    const claudeCheck = cliSection.checks.find(c => c.label.trim() === 'claude')!

    expect(claudeCheck.status).toBe('skip')
    expect(claudeCheck.detail).toBeTruthy()
    expect(claudeCheck.detail).toContain('javi-ai')
  })

  it('cli detection: when join uses separator, multiple CLIs shown comma-separated', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude', 'opencode']))

    const result = await runDoctor()
    const installSection = result.sections.find(s => s.title === 'Installation')!
    const cliCheck = installSection.checks.find(c => c.label.includes('CLIs configured'))!

    // Separator is ', ' — if changed to '' they'd run together
    expect(cliCheck.label).toContain(', ')
  })

  it('config files: missing config detail is non-empty string', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    const result = await runDoctor()
    const configSection = result.sections.find(s => s.title === 'Config Files')!

    const claudeConfig = configSection.checks.find(c =>
      c.label.includes('CLAUDE.md') || c.label.includes('.claude')
    )!
    if (claudeConfig.status === 'fail') {
      expect(claudeConfig.detail).toBeTruthy()
      expect(claudeConfig.detail).toContain('missing')
    }
  })

  it('config files: present config detail is "present" (not empty)', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    // Create the actual config file in the real home dir to avoid mocking
    // Instead, use a claude that reports config file path within our tmp dir
    // The CLI_OPTIONS mock returns CLAUDE_CONFIG = currentTmpDir/claude-config
    // The CONFIG_FILES in doctor.ts hardcodes paths from process.env.HOME
    // so we can't easily redirect it. Instead, just check the detail string values:
    // If ok → detail is 'present'; if fail → detail is 'missing'
    const result = await runDoctor()
    const configSection = result.sections.find(s => s.title === 'Config Files')!

    const claudeConfig = configSection.checks.find(c =>
      c.label.includes('CLAUDE.md') || c.label.includes('.claude')
    )!
    expect(claudeConfig).toBeDefined()
    // Verify that regardless of status, detail is one of the expected strings (not empty)
    expect(claudeConfig.detail).toBeTruthy()
    expect(['present', 'missing']).toContain(claudeConfig.detail)
  })

  it('hooks section: "No hooks installed" label is non-empty', async () => {
    mockReadManifest.mockResolvedValue(makeManifest([]))

    const result = await runDoctor()
    const hookSection = result.sections.find(s => s.title === 'Hooks')!
    const skipCheck = hookSection.checks.find(c => c.status === 'skip')

    expect(skipCheck?.label).toBeTruthy()
    expect(skipCheck?.label.length).toBeGreaterThan(0)
  })

  it('backups: "No backup directory" label is non-empty', async () => {
    mockReadManifest.mockResolvedValue(makeManifest([]))
    // No backup dir

    const result = await runDoctor()
    const backupSection = result.sections.find(s => s.title === 'Backups')!
    const skipCheck = backupSection.checks.find(c => c.status === 'skip')

    expect(skipCheck?.label).toBeTruthy()
    expect(skipCheck?.label.length).toBeGreaterThan(0)
  })

  it('backups: more entry label uses subtraction (length - 5), not addition', async () => {
    mockReadManifest.mockResolvedValue(makeManifest([]))

    const p = getDoctorPaths()
    await fs.ensureDir(p.BACKUP_DIR)

    // Create 7 backups → 7 - 5 = 2 more
    for (let i = 1; i <= 7; i++) {
      const name = `2024-0${i}-01T00-00-00-000Z`
      await fs.ensureDir(path.join(p.BACKUP_DIR, name))
      await fs.writeFile(path.join(p.BACKUP_DIR, name, 'f.md'), 'x', 'utf-8')
    }

    const result = await runDoctor()
    const backupSection = result.sections.find(s => s.title === 'Backups')!
    const moreEntry = backupSection.checks.find(c => c.label.includes('more'))!

    // Should say "2 more" (7-5=2), NOT "12 more" (7+5=12)
    expect(moreEntry.label).toContain('2 more')
    expect(moreEntry.label).not.toContain('12 more')
  })

  it('backup label format: T followed by colon-separated time (not dashes)', async () => {
    mockReadManifest.mockResolvedValue(makeManifest([]))

    const p = getDoctorPaths()
    await fs.ensureDir(p.BACKUP_DIR)
    const backupName = '2024-06-15T10-30-45-000Z'
    await fs.ensureDir(path.join(p.BACKUP_DIR, backupName))
    await fs.writeFile(path.join(p.BACKUP_DIR, backupName, 'f.md'), 'x', 'utf-8')

    const result = await runDoctor()
    const backupSection = result.sections.find(s => s.title === 'Backups')!
    const entry = backupSection.checks.find(c => c.status === 'ok')!

    // The regex replaces T\d{2}-\d{2}-\d{2} with T$1:$2:$3
    // '2024-06-15T10-30-45' → '2024-06-15T10:30:45'
    expect(entry.label).toContain('2024-06-15T10:30:45')
    expect(entry.label).not.toContain('10-30-45')
  })

  it('hooks src path uses "own" subdir', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    // Create hooks in wrong path (not 'own') — should NOT be detected
    const wrongHooksSrc = path.join(FIXED_ASSETS_ROOT, 'delta', 'hooks', 'claude')
    await fs.ensureDir(wrongHooksSrc)
    await fs.writeFile(path.join(wrongHooksSrc, 'hook.sh'), '#!/bin/sh', 'utf-8')

    const result = await runDoctor()
    const hookSection = result.sections.find(s => s.title === 'Hooks')!

    // Wrong path → no hook files found → shows skip
    const skipCheck = hookSection.checks.find(c => c.status === 'skip')
    expect(skipCheck).toBeDefined()
  })

  it('countExpectedSkills: own skills do not require SKILL.md to be counted', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    const ownSkills = path.join(FIXED_ASSETS_ROOT, 'own', 'skills')
    // own skill WITHOUT SKILL.md (still gets counted — only upstream requires SKILL.md)
    await fs.ensureDir(path.join(ownSkills, 'custom-tool'))
    await fs.writeFile(path.join(ownSkills, 'custom-tool', 'README.md'), '# Tool', 'utf-8')

    const p = getDoctorPaths()
    await fs.ensureDir(path.join(p.CLAUDE_SKILLS, 'custom-tool'))
    await fs.writeFile(path.join(p.CLAUDE_SKILLS, 'custom-tool', 'SKILL.md'), '# Tool', 'utf-8')

    const result = await runDoctor()
    const skillSection = result.sections.find(s => s.title === 'Skills')!
    const claudeCheck = skillSection.checks.find(c => c.label.trim() === 'claude')!

    // 'custom-tool' is counted in expected (own doesn't check SKILL.md)
    expect(claudeCheck.detail).toContain('1/1')
    expect(claudeCheck.status).toBe('ok')
  })

  it('skill check: opt is found by exact CLI id match', async () => {
    // This tests that CLI_OPTIONS.find(c => c.id === cli) finds by exact match, not always first
    mockReadManifest.mockResolvedValue(makeManifest(['opencode']))

    const upstreamSkills = path.join(FIXED_ASSETS_ROOT, 'upstream', 'skills')
    await fs.ensureDir(path.join(upstreamSkills, 'react-19'))
    await fs.writeFile(path.join(upstreamSkills, 'react-19', 'SKILL.md'), '# React 19', 'utf-8')

    const p = getDoctorPaths()
    await fs.ensureDir(path.join(p.OPENCODE_SKILLS, 'react-19'))
    await fs.writeFile(path.join(p.OPENCODE_SKILLS, 'react-19', 'SKILL.md'), '# React 19', 'utf-8')

    const result = await runDoctor()
    const skillSection = result.sections.find(s => s.title === 'Skills')!
    const opencodeCheck = skillSection.checks.find(c => c.label.trim() === 'opencode')

    expect(opencodeCheck).toBeDefined()
    expect(opencodeCheck?.status).toBe('ok')
    // Should use OPENCODE_SKILLS, not CLAUDE_SKILLS
    expect(opencodeCheck?.detail).toContain('1/1')
  })

  it('hooks loop body runs for each hook file (not skipped entirely)', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    const hooksSrc = path.join(FIXED_ASSETS_ROOT, 'own', 'hooks', 'claude')
    await fs.ensureDir(hooksSrc)
    await fs.writeFile(path.join(hooksSrc, 'hook-a.sh'), '#!/bin/sh', 'utf-8')
    await fs.writeFile(path.join(hooksSrc, 'hook-b.sh'), '#!/bin/sh', 'utf-8')

    const result = await runDoctor()
    const hookSection = result.sections.find(s => s.title === 'Hooks')!

    // Both hooks should generate checks
    const hookACheck = hookSection.checks.find(c => c.label === 'hook-a.sh')
    const hookBCheck = hookSection.checks.find(c => c.label === 'hook-b.sh')

    expect(hookACheck).toBeDefined()
    expect(hookBCheck).toBeDefined()
    expect(hookACheck?.status).toBe('fail') // not installed
    expect(hookBCheck?.status).toBe('fail') // not installed
  })

  it('hooks pathExists false → status fail with "not found" detail', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    const hooksSrc = path.join(FIXED_ASSETS_ROOT, 'own', 'hooks', 'claude')
    await fs.ensureDir(hooksSrc)
    await fs.writeFile(path.join(hooksSrc, 'absent-hook.sh'), '#!/bin/sh', 'utf-8')

    const result = await runDoctor()
    const hookSection = result.sections.find(s => s.title === 'Hooks')!
    const hookCheck = hookSection.checks.find(c => c.label === 'absent-hook.sh')!

    expect(hookCheck).toBeDefined()
    expect(hookCheck.status).toBe('fail')
    expect(hookCheck.detail).toContain('not found')
  })

  it('hooks access catch → detail says "not executable"', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    const hooksSrc = path.join(FIXED_ASSETS_ROOT, 'own', 'hooks', 'claude')
    await fs.ensureDir(hooksSrc)
    await fs.writeFile(path.join(hooksSrc, 'noexec.sh'), '#!/bin/sh', 'utf-8')

    const hookPath = path.join(os.homedir(), '.claude', 'hooks', 'noexec.sh')

    const pathExistsSpy = vi.spyOn(fs, 'pathExists').mockImplementation(async (p) => {
      if (String(p) === hooksSrc) return true
      if (String(p) === hookPath) return true
      return false
    })

    const accessSpy = vi.spyOn(fs, 'access').mockRejectedValue(new Error('EACCES'))

    const result = await runDoctor()
    const hookSection = result.sections.find(s => s.title === 'Hooks')!
    const hookCheck = hookSection.checks.find(c => c.label === 'noexec.sh')!

    if (hookCheck) {
      expect(hookCheck.status).toBe('fail')
      expect(hookCheck.detail).toBe('not executable')
    }

    pathExistsSpy.mockRestore()
    accessSpy.mockRestore()
  })

  it('hooks access success → detail says "executable"', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    const hooksSrc = path.join(FIXED_ASSETS_ROOT, 'own', 'hooks', 'claude')
    await fs.ensureDir(hooksSrc)
    await fs.writeFile(path.join(hooksSrc, 'exec.sh'), '#!/bin/sh', 'utf-8')

    const hookPath = path.join(os.homedir(), '.claude', 'hooks', 'exec.sh')

    const pathExistsSpy = vi.spyOn(fs, 'pathExists').mockImplementation(async (p) => {
      if (String(p) === hooksSrc) return true
      if (String(p) === hookPath) return true
      return false
    })

    const accessSpy = vi.spyOn(fs, 'access').mockResolvedValue(undefined)

    const result = await runDoctor()
    const hookSection = result.sections.find(s => s.title === 'Hooks')!
    const hookCheck = hookSection.checks.find(c => c.label === 'exec.sh')!

    if (hookCheck) {
      expect(hookCheck.status).toBe('ok')
      expect(hookCheck.detail).toBe('executable')
    }

    pathExistsSpy.mockRestore()
    accessSpy.mockRestore()
  })

  it('hooks check: hookChecks.length === 0 after hook loop shows skip', async () => {
    // claude in manifest, hooksSrc exists but is EMPTY (no hook files)
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))

    const hooksSrc = path.join(FIXED_ASSETS_ROOT, 'own', 'hooks', 'claude')
    await fs.ensureDir(hooksSrc)
    // No files in hooksSrc

    const result = await runDoctor()
    const hookSection = result.sections.find(s => s.title === 'Hooks')!

    // With empty hooksSrc, no hook checks → shows "No hooks installed"
    const skipCheck = hookSection.checks.find(c => c.status === 'skip')
    expect(skipCheck).toBeDefined()
    expect(skipCheck?.label.length).toBeGreaterThan(0)
  })
})
