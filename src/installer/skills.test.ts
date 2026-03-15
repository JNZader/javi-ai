/**
 * skills.test.ts — Integration tests for installSkillsForCLI
 *
 * Key design: ASSETS_ROOT is computed at module load time in skills.ts.
 * We redirect it by mocking the 'url' module's fileURLToPath.
 * We use vi.hoisted() with require() to create a fixed path that is available
 * inside the vi.mock() factory (which is hoisted above all module-level code).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'

// vi.hoisted() runs before vi.mock() factories — use require() to access built-ins
const { FIXED_ASSETS_ROOT, FIXED_CLAUDE_DEST } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const p = require('path')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const o = require('os')
  return {
    FIXED_ASSETS_ROOT: p.join(o.tmpdir(), 'javi-ai-skills-test-suite') as string,
    FIXED_CLAUDE_DEST: p.join(o.tmpdir(), 'javi-ai-skills-claude-dest-test') as string,
  }
})

vi.mock('url', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodePath = require('path')
  const actual = await importOriginal<typeof import('url')>()
  return {
    ...actual,
    fileURLToPath: (url: string | URL) => {
      const urlStr = url.toString()
      if (urlStr.includes('skills') && !urlStr.includes('skills.test')) {
        // skills.ts: ASSETS_ROOT = path.resolve(__dirname, '../../')
        // return FIXED_ASSETS_ROOT/src/installer/skills.js
        // __dirname = FIXED_ASSETS_ROOT/src/installer
        // path.resolve(FIXED_ASSETS_ROOT/src/installer, '../../') = FIXED_ASSETS_ROOT ✓
        return nodePath.join(FIXED_ASSETS_ROOT, 'src', 'installer', 'skills.js')
      }
      return actual.fileURLToPath(url)
    },
  }
})

vi.mock('../constants.js', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodePath = require('path')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodeOs = require('os')
  return {
    CLI_OPTIONS: [
      {
        id: 'claude',
        label: 'Claude Code',
        configPath: nodePath.join(nodeOs.homedir(), '.claude'),
        skillsPath: FIXED_CLAUDE_DEST,
        available: true,
      },
    ],
    MANIFEST_PATH: nodePath.join(nodeOs.tmpdir(), 'javi-ai-skills-manifest-test.json'),
    BACKUP_DIR: nodePath.join(nodeOs.tmpdir(), 'javi-ai-skills-backups-test'),
    MARKER_START: '<!-- BEGIN JAVI-AI -->',
    MARKER_END: '<!-- END JAVI-AI -->',
    HOME: nodeOs.homedir(),
  }
})

import { installSkillsForCLI } from './skills.js'

async function createAssetTree(): Promise<void> {
  await fs.remove(FIXED_ASSETS_ROOT)

  const upstreamSkills = path.join(FIXED_ASSETS_ROOT, 'upstream', 'skills')

  await fs.ensureDir(path.join(upstreamSkills, 'react-19'))
  await fs.writeFile(path.join(upstreamSkills, 'react-19', 'SKILL.md'), '# React 19 Skill', 'utf-8')

  await fs.ensureDir(path.join(upstreamSkills, 'typescript'))
  await fs.writeFile(path.join(upstreamSkills, 'typescript', 'SKILL.md'), '# TypeScript Skill', 'utf-8')

  await fs.ensureDir(path.join(upstreamSkills, 'sdd-explore'))
  await fs.writeFile(path.join(upstreamSkills, 'sdd-explore', 'SKILL.md'), '# SDD Explore', 'utf-8')
  await fs.writeFile(path.join(upstreamSkills, 'sdd-explore', 'EXTENSION.md'), '## Extension: Perspective', 'utf-8')

  await fs.ensureDir(path.join(upstreamSkills, '_shared'))
  await fs.writeFile(path.join(upstreamSkills, '_shared', 'persistence-contract.md'), '# Shared', 'utf-8')

  await fs.ensureDir(path.join(upstreamSkills, '.dotfile'))
  await fs.writeFile(path.join(upstreamSkills, '.dotfile', 'SKILL.md'), '# Dotfile', 'utf-8')

  await fs.ensureDir(path.join(upstreamSkills, 'no-skill-dir'))
  await fs.writeFile(path.join(upstreamSkills, 'no-skill-dir', 'README.md'), '# No skill', 'utf-8')

  const ownSkills = path.join(FIXED_ASSETS_ROOT, 'own', 'skills')
  await fs.ensureDir(path.join(ownSkills, 'skill-creator'))
  await fs.writeFile(path.join(ownSkills, 'skill-creator', 'SKILL.md'), '# Skill Creator', 'utf-8')
  await fs.ensureDir(path.join(ownSkills, 'obsidian-braindump'))
  await fs.writeFile(path.join(ownSkills, 'obsidian-braindump', 'SKILL.md'), '# Obsidian', 'utf-8')
}

describe('installSkillsForCLI', () => {
  beforeEach(async () => {
    await createAssetTree()
    await fs.remove(FIXED_CLAUDE_DEST)
  })

  afterEach(async () => {
    await fs.remove(FIXED_CLAUDE_DEST)
  })

  it('returns [] for unknown cli', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await installSkillsForCLI('unknown' as any, true)
    expect(result).toEqual([])
  })

  it('dryRun: returns correct skill names without creating files', async () => {
    const result = await installSkillsForCLI('claude', true)

    expect(result).toContain('react-19')
    expect(result).toContain('typescript')
    expect(result).toContain('sdd-explore')
    expect(result).toContain('_shared')
    expect(result).toContain('skill-creator')
    expect(result).toContain('obsidian-braindump')

    expect(await fs.pathExists(FIXED_CLAUDE_DEST)).toBe(false)
  })

  it('dryRun: does not include dotfile directories', async () => {
    const result = await installSkillsForCLI('claude', true)
    expect(result).not.toContain('.dotfile')
  })

  it('dryRun: does not include no-skill-dir (no SKILL.md)', async () => {
    const result = await installSkillsForCLI('claude', true)
    expect(result).not.toContain('no-skill-dir')
  })

  it('installs upstream skill without EXTENSION.md (content exact match)', async () => {
    await installSkillsForCLI('claude', false)
    const content = await fs.readFile(path.join(FIXED_CLAUDE_DEST, 'react-19', 'SKILL.md'), 'utf-8')
    expect(content).toBe('# React 19 Skill')
  })

  it('installs upstream skill WITH EXTENSION.md: content = SKILL.md + separator + EXTENSION.md', async () => {
    await installSkillsForCLI('claude', false)
    const content = await fs.readFile(path.join(FIXED_CLAUDE_DEST, 'sdd-explore', 'SKILL.md'), 'utf-8')
    expect(content).toBe('# SDD Explore\n\n---\n\n## Extension: Perspective')
  })

  it('skips dotfile directories', async () => {
    await installSkillsForCLI('claude', false)
    expect(await fs.pathExists(path.join(FIXED_CLAUDE_DEST, '.dotfile'))).toBe(false)
  })

  it('skips _shared in main skill loop (but copies it via dedicated path)', async () => {
    await installSkillsForCLI('claude', false)
    expect(await fs.pathExists(path.join(FIXED_CLAUDE_DEST, '_shared'))).toBe(true)
    expect(await fs.pathExists(path.join(FIXED_CLAUDE_DEST, '_shared', 'persistence-contract.md'))).toBe(true)
  })

  it('copies _shared directory with overwrite', async () => {
    await installSkillsForCLI('claude', false)
    await fs.writeFile(path.join(FIXED_CLAUDE_DEST, '_shared', 'persistence-contract.md'), 'Modified', 'utf-8')
    await installSkillsForCLI('claude', false)
    const content = await fs.readFile(path.join(FIXED_CLAUDE_DEST, '_shared', 'persistence-contract.md'), 'utf-8')
    expect(content).toBe('# Shared')
  })

  it('installs own skills', async () => {
    await installSkillsForCLI('claude', false)
    expect(await fs.pathExists(path.join(FIXED_CLAUDE_DEST, 'skill-creator', 'SKILL.md'))).toBe(true)
    expect(await fs.pathExists(path.join(FIXED_CLAUDE_DEST, 'obsidian-braindump', 'SKILL.md'))).toBe(true)
  })

  it('handles missing own/skills directory gracefully (no error)', async () => {
    await fs.remove(path.join(FIXED_ASSETS_ROOT, 'own', 'skills'))
    await expect(installSkillsForCLI('claude', false)).resolves.toBeDefined()
  })

  it('handles missing upstream/skills directory: readdir throws (documents actual behavior)', async () => {
    await fs.remove(path.join(FIXED_ASSETS_ROOT, 'upstream', 'skills'))
    await expect(installSkillsForCLI('claude', false)).rejects.toThrow()
  })
})
