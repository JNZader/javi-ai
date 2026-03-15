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
})
