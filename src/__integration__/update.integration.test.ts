/**
 * Integration tests for runUpdate — re-installs from manifest.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs-extra'
import path from 'path'

const { FIXED_ROOT, FIXED_HOME, FIXED_MANIFEST, FIXED_BACKUP, FIXED_CLAUDE_CONFIG, FIXED_CLAUDE_SKILLS } = vi.hoisted(() => {
  const p = require('path')
  const o = require('os')
  const root = p.join(o.tmpdir(), `javi-ai-update-test-${Date.now()}`)
  const home = p.join(root, 'home')
  return {
    FIXED_ROOT: root as string,
    FIXED_HOME: home as string,
    FIXED_MANIFEST: p.join(home, '.javi-ai', 'manifest.json') as string,
    FIXED_BACKUP: p.join(home, '.javi-ai', 'backups') as string,
    FIXED_CLAUDE_CONFIG: p.join(home, '.claude') as string,
    FIXED_CLAUDE_SKILLS: p.join(home, '.claude', 'skills') as string,
  }
})

vi.mock('../constants.js', () => ({
  HOME: FIXED_HOME,
  CLI_OPTIONS: [{
    id: 'claude', label: 'Claude Code',
    configPath: FIXED_CLAUDE_CONFIG, skillsPath: FIXED_CLAUDE_SKILLS, available: true,
  }],
  MANIFEST_PATH: FIXED_MANIFEST,
  BACKUP_DIR: FIXED_BACKUP,
  MARKER_START: '<!-- BEGIN JAVI-AI -->',
  MARKER_END: '<!-- END JAVI-AI -->',
}))

import { runUpdate } from '../commands/update.js'
import type { InstallStep } from '../types/index.js'

describe('runUpdate() — integration', () => {
  beforeEach(async () => {
    await fs.ensureDir(FIXED_HOME)
  })

  afterEach(async () => {
    await fs.remove(FIXED_ROOT)
  })

  it('returns empty when no manifest/no CLIs installed', async () => {
    const steps: InstallStep[] = []
    const result = await runUpdate({}, (s) => { steps.push(s) })

    expect(result.clis).toEqual([])
    expect(result.steps).toEqual([])
  })

  it('re-installs for CLIs from manifest', async () => {
    // Create manifest with claude
    await fs.ensureDir(path.dirname(FIXED_MANIFEST))
    await fs.writeJson(FIXED_MANIFEST, {
      version: '1.0.0',
      clis: ['claude'],
      installedAt: '2026-03-20T00:00:00Z',
      updatedAt: '2026-03-20T00:00:00Z',
      skills: {},
    })

    const steps: InstallStep[] = []
    const result = await runUpdate({}, (s) => {
      const idx = steps.findIndex(x => x.id === s.id)
      if (idx >= 0) steps[idx] = s
      else steps.push(s)
    })

    expect(result.clis).toContain('claude')
    // Should have attempted skills, configs, hooks, orchestrators
    const doneSteps = steps.filter(s => s.status === 'done')
    expect(doneSteps.length).toBeGreaterThanOrEqual(2)
  })

  it('updates manifest timestamp after update', async () => {
    await fs.ensureDir(path.dirname(FIXED_MANIFEST))
    const oldDate = '2026-03-20T00:00:00Z'
    await fs.writeJson(FIXED_MANIFEST, {
      version: '1.0.0',
      clis: ['claude'],
      installedAt: oldDate,
      updatedAt: oldDate,
      skills: {},
    })

    await runUpdate({}, () => {})

    const manifest = await fs.readJson(FIXED_MANIFEST)
    expect(manifest.updatedAt).not.toBe(oldDate)
  })

  it('dry-run does not modify manifest', async () => {
    await fs.ensureDir(path.dirname(FIXED_MANIFEST))
    const oldDate = '2026-03-20T00:00:00Z'
    await fs.writeJson(FIXED_MANIFEST, {
      version: '1.0.0',
      clis: ['claude'],
      installedAt: oldDate,
      updatedAt: oldDate,
      skills: {},
    })

    await runUpdate({ dryRun: true }, () => {})

    const manifest = await fs.readJson(FIXED_MANIFEST)
    expect(manifest.updatedAt).toBe(oldDate)
  })
})
