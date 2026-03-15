/**
 * uninstall.test.ts — Integration tests for buildUninstallPlan and runUninstall
 *
 * Strategy for ASSETS_ROOT: uninstall.ts computes ASSETS_ROOT = path.resolve(__dirname, '../../')
 * We redirect it using a FIXED path stored in process.env.
 * Per-test mutable state (tmpDir, cliPaths) uses a module-level variable
 * updated in beforeEach.
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
    FIXED_ASSETS_ROOT: p.join(o.tmpdir(), 'javi-ai-uninstall-assets-test') as string,
  }
})

// Per-test mutable tmpDir
let currentTmpDir = path.join(os.tmpdir(), 'javi-ai-uninstall-INITIAL')

function getUninstallPaths() {
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
  get MANIFEST_PATH() { return getUninstallPaths().MANIFEST_PATH },
  get BACKUP_DIR() { return getUninstallPaths().BACKUP_DIR },
  MARKER_START: '<!-- BEGIN JAVI-AI -->',
  MARKER_END: '<!-- END JAVI-AI -->',
  get HOME() { return require('os').homedir() },
  get CLI_OPTIONS() {
    const p = getUninstallPaths()
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

vi.mock('url', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodePath = require('path') as typeof import('path')
  const actual = await importOriginal<typeof import('url')>()
  return {
    ...actual,
    fileURLToPath: (url: string | URL) => {
      const urlStr = url.toString()
      if (urlStr.includes('uninstall') && !urlStr.includes('uninstall.test')) {
        // uninstall.ts: ASSETS_ROOT = path.resolve(__dirname, '../../')
        // return FIXED_ASSETS_ROOT/src/commands/uninstall.js
        // __dirname = FIXED_ASSETS_ROOT/src/commands
        // path.resolve(FIXED_ASSETS_ROOT/src/commands, '../../') = FIXED_ASSETS_ROOT ✓
        return nodePath.join(FIXED_ASSETS_ROOT, 'src', 'commands', 'uninstall.js')
      }
      return actual.fileURLToPath(url)
    },
  }
})

import { buildUninstallPlan, runUninstall, type UninstallItem } from './uninstall.js'
import { readManifest } from '../installer/manifest.js'
import { MARKER_START, MARKER_END } from '../constants.js'

const mockReadManifest = vi.mocked(readManifest)

function makeManifest(clis: string[] = []) {
  return {
    version: '0.1.0',
    installedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clis: clis as any,
    skills: {},
  }
}

describe('buildUninstallPlan', () => {
  beforeEach(async () => {
    currentTmpDir = path.join(os.tmpdir(), `javi-ai-uninstall-${crypto.randomUUID()}`)
    await fs.ensureDir(currentTmpDir)
    await fs.remove(FIXED_ASSETS_ROOT)
  })

  afterEach(async () => {
    await fs.remove(currentTmpDir)
    await fs.remove(FIXED_ASSETS_ROOT)
    vi.clearAllMocks()
  })

  it('empty manifest returns only manifest item (if path exists)', async () => {
    mockReadManifest.mockResolvedValue(makeManifest([]))
    const p = getUninstallPaths()
    await fs.writeFile(p.MANIFEST_PATH, '{}', 'utf-8')

    const { items } = await buildUninstallPlan()

    expect(items).toHaveLength(1)
    expect(items[0]!.type).toBe('manifest')
    expect(items[0]!.path).toBe(p.MANIFEST_PATH)
  })

  it('empty manifest without manifest file returns empty items', async () => {
    mockReadManifest.mockResolvedValue(makeManifest([]))

    const { items } = await buildUninstallPlan()
    expect(items).toHaveLength(0)
  })

  it('claude in manifest: includes skills-dir, hooks-dir, config-section items for .md files', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))
    const p = getUninstallPaths()

    await fs.ensureDir(p.CLAUDE_SKILLS)
    await fs.ensureDir(path.join(p.CLAUDE_CONFIG, 'hooks'))

    const configSrc = path.join(FIXED_ASSETS_ROOT, 'configs', 'claude')
    await fs.ensureDir(configSrc)
    await fs.writeFile(path.join(configSrc, 'CLAUDE.md'), '# Claude config', 'utf-8')
    await fs.ensureDir(p.CLAUDE_CONFIG)
    await fs.writeFile(path.join(p.CLAUDE_CONFIG, 'CLAUDE.md'), '# Installed', 'utf-8')

    await fs.writeFile(p.MANIFEST_PATH, '{}', 'utf-8')

    const { items } = await buildUninstallPlan()

    const types = items.map(i => i.type)
    expect(types).toContain('skills-dir')
    expect(types).toContain('config-section')
    expect(types).toContain('hooks-dir')
    expect(types).toContain('manifest')
  })

  it('opencode in manifest: includes skills-dir, config-section, NO hooks-dir', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['opencode']))
    const p = getUninstallPaths()

    await fs.ensureDir(p.OPENCODE_SKILLS)

    const configSrc = path.join(FIXED_ASSETS_ROOT, 'configs', 'opencode')
    await fs.ensureDir(configSrc)
    await fs.writeFile(path.join(configSrc, 'OPENCODE.md'), '# opencode', 'utf-8')
    await fs.ensureDir(p.OPENCODE_CONFIG)
    await fs.writeFile(path.join(p.OPENCODE_CONFIG, 'OPENCODE.md'), '# installed', 'utf-8')

    await fs.writeFile(p.MANIFEST_PATH, '{}', 'utf-8')

    const { items } = await buildUninstallPlan()

    const types = items.map(i => i.type)
    expect(types).toContain('skills-dir')
    expect(types).not.toContain('hooks-dir')
  })

  it('items have correct targetPath values', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))
    const p = getUninstallPaths()
    await fs.ensureDir(p.CLAUDE_SKILLS)
    await fs.writeFile(p.MANIFEST_PATH, '{}', 'utf-8')

    const { items } = await buildUninstallPlan()

    const skillsItem = items.find(i => i.type === 'skills-dir')
    expect(skillsItem?.path).toBe(p.CLAUDE_SKILLS)

    const manifestItem = items.find(i => i.type === 'manifest')
    expect(manifestItem?.path).toBe(p.MANIFEST_PATH)
  })
})

describe('runUninstall', () => {
  beforeEach(async () => {
    currentTmpDir = path.join(os.tmpdir(), `javi-ai-uninstall-${crypto.randomUUID()}`)
    await fs.ensureDir(currentTmpDir)
    await fs.remove(FIXED_ASSETS_ROOT)
  })

  afterEach(async () => {
    await fs.remove(currentTmpDir)
    await fs.remove(FIXED_ASSETS_ROOT)
    vi.clearAllMocks()
  })

  it('manifest item: file is removed after execution', async () => {
    const p = getUninstallPaths()
    await fs.writeFile(p.MANIFEST_PATH, '{}', 'utf-8')

    const items: UninstallItem[] = [
      { label: 'manifest', path: p.MANIFEST_PATH, type: 'manifest' },
    ]
    await runUninstall(items)

    expect(await fs.pathExists(p.MANIFEST_PATH)).toBe(false)
  })

  it('skills-dir item: directory is removed', async () => {
    const p = getUninstallPaths()
    await fs.ensureDir(p.CLAUDE_SKILLS)
    await fs.writeFile(path.join(p.CLAUDE_SKILLS, 'skill.md'), 'content', 'utf-8')

    const items: UninstallItem[] = [
      { label: 'claude skills', path: p.CLAUDE_SKILLS, type: 'skills-dir', cli: 'claude' },
    ]
    await runUninstall(items)

    expect(await fs.pathExists(p.CLAUDE_SKILLS)).toBe(false)
  })

  it('hooks-dir: only removes files from javi-ai hooks source; user-created hooks survive', async () => {
    const p = getUninstallPaths()
    const hooksDir = path.join(p.tmpDir, 'hooks')
    await fs.ensureDir(hooksDir)

    await fs.writeFile(path.join(hooksDir, 'post-tool.sh'), '#!/bin/sh', 'utf-8')
    await fs.writeFile(path.join(hooksDir, 'user-hook.sh'), '#!/bin/sh', 'utf-8')

    const hooksSrc = path.join(FIXED_ASSETS_ROOT, 'own', 'hooks', 'claude')
    await fs.ensureDir(hooksSrc)
    await fs.writeFile(path.join(hooksSrc, 'post-tool.sh'), '#!/bin/sh', 'utf-8')

    const items: UninstallItem[] = [
      { label: 'hooks', path: hooksDir, type: 'hooks-dir', cli: 'claude' },
    ]
    await runUninstall(items)

    expect(await fs.pathExists(path.join(hooksDir, 'post-tool.sh'))).toBe(false)
    expect(await fs.pathExists(path.join(hooksDir, 'user-hook.sh'))).toBe(true)
  })

  it('config-section with backup: file is restored from backup, not stripped', async () => {
    const p = getUninstallPaths()
    const configFile = path.join(p.CLAUDE_CONFIG, 'CLAUDE.md')
    await fs.ensureDir(p.CLAUDE_CONFIG)

    const originalContent = '# Original\nUser content here.'
    await fs.writeFile(configFile, `${MARKER_START}\nManaged\n${MARKER_END}`, 'utf-8')

    const backupDir = path.join(p.BACKUP_DIR, '2024-01-01T00-00-00-000Z', 'claude')
    await fs.ensureDir(backupDir)
    await fs.writeFile(path.join(backupDir, 'CLAUDE.md'), originalContent, 'utf-8')

    const items: UninstallItem[] = [
      { label: 'claude config', path: configFile, type: 'config-section', cli: 'claude' },
    ]
    const result = await runUninstall(items)

    const restored = await fs.readFile(configFile, 'utf-8')
    expect(restored).toBe(originalContent)
    expect(result.restored).toHaveLength(1)
    expect(result.restored[0]).toContain('restored from backup')
  })

  it('config-section no backup, has markers: markers and content stripped, surrounding preserved', async () => {
    const p = getUninstallPaths()
    const configFile = path.join(p.CLAUDE_CONFIG, 'CLAUDE.md')
    await fs.ensureDir(p.CLAUDE_CONFIG)

    const before = '# Header\n\nUser content.\n\n'
    const after = '\n\n## Footer\nMore user content.'
    const content = `${before}${MARKER_START}\nManaged section\n${MARKER_END}${after}`
    await fs.writeFile(configFile, content, 'utf-8')

    const items: UninstallItem[] = [
      { label: 'claude config', path: configFile, type: 'config-section', cli: 'claude' },
    ]
    const result = await runUninstall(items)

    const remaining = await fs.readFile(configFile, 'utf-8')
    expect(remaining).toContain('Header')
    expect(remaining).toContain('User content.')
    expect(remaining).toContain('Footer')
    expect(remaining).not.toContain(MARKER_START)
    expect(remaining).not.toContain(MARKER_END)
    expect(remaining).not.toContain('Managed section')
    expect(result.removed.some(r => r.includes('section removed'))).toBe(true)
  })

  it('config-section no backup, ONLY javi-ai content: file is deleted', async () => {
    const p = getUninstallPaths()
    const configFile = path.join(p.CLAUDE_CONFIG, 'CLAUDE.md')
    await fs.ensureDir(p.CLAUDE_CONFIG)

    const content = `${MARKER_START}\nManaged section\n${MARKER_END}`
    await fs.writeFile(configFile, content, 'utf-8')

    const items: UninstallItem[] = [
      { label: 'claude config', path: configFile, type: 'config-section', cli: 'claude' },
    ]
    const result = await runUninstall(items)

    expect(await fs.pathExists(configFile)).toBe(false)
    expect(result.removed.some(r => r.includes('file removed'))).toBe(true)
  })

  it('config-section no backup, no markers: file left untouched', async () => {
    const p = getUninstallPaths()
    const configFile = path.join(p.CLAUDE_CONFIG, 'CLAUDE.md')
    await fs.ensureDir(p.CLAUDE_CONFIG)

    const content = '# No markers here\nUser content only.'
    await fs.writeFile(configFile, content, 'utf-8')

    const items: UninstallItem[] = [
      { label: 'claude config', path: configFile, type: 'config-section', cli: 'claude' },
    ]
    await runUninstall(items)

    expect(await fs.pathExists(configFile)).toBe(true)
    expect(await fs.readFile(configFile, 'utf-8')).toBe(content)
  })

  it('error in one item does not abort remaining items', async () => {
    const p = getUninstallPaths()
    const goodFile = path.join(p.tmpDir, 'good.json')
    await fs.writeFile(goodFile, '{}', 'utf-8')

    const badConfigFile = path.join(p.tmpDir, 'nonexistent-config.md')

    const items: UninstallItem[] = [
      { label: 'bad config', path: badConfigFile, type: 'config-section', cli: 'claude' },
      { label: 'good manifest', path: goodFile, type: 'manifest' },
    ]

    const result = await runUninstall(items)

    expect(await fs.pathExists(goodFile)).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('bad config')
  })

  it('result.removed lists correctly removed items', async () => {
    const p = getUninstallPaths()
    await fs.writeFile(p.MANIFEST_PATH, '{}', 'utf-8')
    await fs.ensureDir(p.CLAUDE_SKILLS)

    const items: UninstallItem[] = [
      { label: 'manifest label', path: p.MANIFEST_PATH, type: 'manifest' },
      { label: 'skills label', path: p.CLAUDE_SKILLS, type: 'skills-dir', cli: 'claude' },
    ]
    const result = await runUninstall(items)

    expect(result.removed).toContain('manifest label')
    expect(result.removed).toContain('skills label')
    expect(result.removed).toHaveLength(2)
  })

  it('result.restored lists correctly restored items', async () => {
    const p = getUninstallPaths()
    const configFile = path.join(p.CLAUDE_CONFIG, 'CLAUDE.md')
    await fs.ensureDir(p.CLAUDE_CONFIG)
    await fs.writeFile(configFile, `${MARKER_START}\ncontent\n${MARKER_END}`, 'utf-8')

    const backupDir = path.join(p.BACKUP_DIR, '2024-06-01T10-00-00-000Z', 'claude')
    await fs.ensureDir(backupDir)
    await fs.writeFile(path.join(backupDir, 'CLAUDE.md'), '# Original', 'utf-8')

    const items: UninstallItem[] = [
      { label: 'claude config label', path: configFile, type: 'config-section', cli: 'claude' },
    ]
    const result = await runUninstall(items)

    expect(result.restored).toHaveLength(1)
    expect(result.restored[0]).toContain('restored from backup')
  })

  it('result.errors lists items that failed', async () => {
    const p = getUninstallPaths()
    const nonExistentFile = path.join(p.tmpDir, 'does-not-exist.md')

    const items: UninstallItem[] = [
      { label: 'failing item', path: nonExistentFile, type: 'config-section', cli: 'claude' },
    ]
    const result = await runUninstall(items)

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('failing item')
  })

  it('findLatestBackup uses the MOST RECENT backup (reverse sort)', async () => {
    // If backups exist at multiple timestamps, the most recent one should be used
    const p = getUninstallPaths()
    const configFile = path.join(p.CLAUDE_CONFIG, 'CLAUDE.md')
    await fs.ensureDir(p.CLAUDE_CONFIG)
    await fs.writeFile(configFile, `${MARKER_START}\ncontent\n${MARKER_END}`, 'utf-8')

    // Create two backups — older and newer
    const olderDir = path.join(p.BACKUP_DIR, '2023-01-01T00-00-00-000Z', 'claude')
    await fs.ensureDir(olderDir)
    await fs.writeFile(path.join(olderDir, 'CLAUDE.md'), '# Older backup', 'utf-8')

    const newerDir = path.join(p.BACKUP_DIR, '2024-06-01T10-00-00-000Z', 'claude')
    await fs.ensureDir(newerDir)
    await fs.writeFile(path.join(newerDir, 'CLAUDE.md'), '# Newer backup', 'utf-8')

    const items: UninstallItem[] = [
      { label: 'claude config', path: configFile, type: 'config-section', cli: 'claude' },
    ]
    await runUninstall(items)

    const restoredContent = await fs.readFile(configFile, 'utf-8')
    // Should restore from the newest backup
    expect(restoredContent).toBe('# Newer backup')
  })

  it('config-section with non-.md file is skipped (no config-section for .json in buildUninstallPlan)', async () => {
    // This is a structural test: json files don't create config-section items
    mockReadManifest.mockResolvedValue(makeManifest(['opencode']))
    const p = getUninstallPaths()

    const configSrc = path.join(FIXED_ASSETS_ROOT, 'configs', 'opencode')
    await fs.ensureDir(configSrc)
    await fs.writeFile(path.join(configSrc, 'opencode.json'), '{}', 'utf-8')
    await fs.ensureDir(p.OPENCODE_CONFIG)
    await fs.writeFile(path.join(p.OPENCODE_CONFIG, 'opencode.json'), '{}', 'utf-8')

    await fs.writeFile(p.MANIFEST_PATH, '{}', 'utf-8')

    const { items } = await buildUninstallPlan()
    const configSectionItems = items.filter(i => i.type === 'config-section')
    // JSON files don't get config-section items
    expect(configSectionItems).toHaveLength(0)
  })

  it('buildUninstallPlan: skills dir is only included if it exists', async () => {
    mockReadManifest.mockResolvedValue(makeManifest(['claude']))
    const p = getUninstallPaths()
    // Do NOT create CLAUDE_SKILLS dir — it doesn't exist

    await fs.writeFile(p.MANIFEST_PATH, '{}', 'utf-8')

    const { items } = await buildUninstallPlan()
    const skillsItems = items.filter(i => i.type === 'skills-dir')
    expect(skillsItems).toHaveLength(0)
  })

  it('config-section: before/after trim is applied (trimEnd before, trimStart after)', async () => {
    const p = getUninstallPaths()
    const configFile = path.join(p.CLAUDE_CONFIG, 'CLAUDE.md')
    await fs.ensureDir(p.CLAUDE_CONFIG)

    // Content with trailing whitespace before marker and leading whitespace after
    const content = `# Header\n\n\n${MARKER_START}\nManaged\n${MARKER_END}\n\n\n# Footer`
    await fs.writeFile(configFile, content, 'utf-8')

    const items: UninstallItem[] = [
      { label: 'claude config', path: configFile, type: 'config-section', cli: 'claude' },
    ]
    await runUninstall(items)

    const remaining = await fs.readFile(configFile, 'utf-8')
    // Both parts should be present
    expect(remaining).toContain('# Header')
    expect(remaining).toContain('# Footer')
    expect(remaining).not.toContain(MARKER_START)
  })
})
