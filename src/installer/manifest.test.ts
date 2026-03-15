import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'

// Use require() inside mock factory to avoid import hoisting TDZ
vi.mock('../constants.js', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodePath = require('path') as typeof import('path')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodeOs = require('os') as typeof import('os')
  const tmpBase = nodePath.join(nodeOs.tmpdir(), 'javi-ai-manifest-test-fixed')
  return {
    MANIFEST_PATH: nodePath.join(tmpBase, 'manifest.json'),
    BACKUP_DIR: nodePath.join(nodeOs.tmpdir(), 'javi-ai-manifest-backups'),
    MARKER_START: '<!-- BEGIN JAVI-AI -->',
    MARKER_END: '<!-- END JAVI-AI -->',
    HOME: nodeOs.homedir(),
    CLI_OPTIONS: [],
  }
})

import { readManifest, writeManifest } from './manifest.js'
import type { Manifest } from '../types/index.js'

const MOCK_TMPBASE = path.join(os.tmpdir(), 'javi-ai-manifest-test-fixed')
const MOCK_MANIFEST_PATH = path.join(MOCK_TMPBASE, 'manifest.json')

const DEFAULT_MANIFEST_SHAPE = {
  version: expect.any(String),
  installedAt: expect.any(String),
  updatedAt: expect.any(String),
  clis: expect.any(Array),
  skills: expect.any(Object),
}

describe('readManifest', () => {
  beforeEach(async () => {
    await fs.ensureDir(MOCK_TMPBASE)
    await fs.remove(MOCK_MANIFEST_PATH)
  })

  afterEach(async () => {
    await fs.remove(MOCK_MANIFEST_PATH)
  })

  it('returns DEFAULT_MANIFEST when file does not exist', async () => {
    const result = await readManifest()
    expect(result).toMatchObject(DEFAULT_MANIFEST_SHAPE)
    expect(result.clis).toEqual([])
    expect(result.skills).toEqual({})
  })

  it('returns DEFAULT_MANIFEST when file has invalid JSON', async () => {
    await fs.writeFile(MOCK_MANIFEST_PATH, 'NOT VALID JSON', 'utf-8')
    const result = await readManifest()
    expect(result).toMatchObject(DEFAULT_MANIFEST_SHAPE)
    expect(result.clis).toEqual([])
  })

  it('returns parsed manifest when file is valid', async () => {
    const manifest: Manifest = {
      version: '1.0.0',
      installedAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-06-01T00:00:00.000Z',
      clis: ['claude', 'gemini'],
      skills: {
        'react-19': {
          name: 'react-19',
          version: '1.0',
          source: 'upstream',
          installedAt: '2024-01-01T00:00:00.000Z',
        },
      },
    }
    await fs.writeFile(MOCK_MANIFEST_PATH, JSON.stringify(manifest), 'utf-8')

    const result = await readManifest()
    expect(result).toEqual(manifest)
  })
})

describe('writeManifest', () => {
  beforeEach(async () => {
    await fs.remove(MOCK_MANIFEST_PATH)
    await fs.remove(MOCK_TMPBASE)
  })

  afterEach(async () => {
    await fs.remove(MOCK_TMPBASE)
  })

  it('creates directory if it does not exist', async () => {
    const manifest: Manifest = {
      version: '0.1.0',
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clis: [],
      skills: {},
    }

    await writeManifest(manifest)

    expect(await fs.pathExists(MOCK_MANIFEST_PATH)).toBe(true)
  })

  it('writes pretty-printed JSON (2 spaces)', async () => {
    const manifest: Manifest = {
      version: '0.1.0',
      installedAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      clis: ['claude'],
      skills: {},
    }

    await writeManifest(manifest)

    const raw = await fs.readFile(MOCK_MANIFEST_PATH, 'utf-8')
    expect(raw).toBe(JSON.stringify(manifest, null, 2))
  })

  it('content is correctly serialized', async () => {
    const manifest: Manifest = {
      version: '2.0.0',
      installedAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-06-01T00:00:00.000Z',
      clis: ['opencode', 'gemini'],
      skills: {
        typescript: {
          name: 'typescript',
          version: '2.0',
          source: 'own',
          installedAt: '2025-01-01T00:00:00.000Z',
          checksum: 'abc123',
        },
      },
    }

    await writeManifest(manifest)

    const read = JSON.parse(await fs.readFile(MOCK_MANIFEST_PATH, 'utf-8'))
    expect(read).toEqual(manifest)
  })
})

describe('readManifest — fresh copy (surviving mutant: DEFAULT_MANIFEST spread)', () => {
  beforeEach(async () => {
    await fs.remove(MOCK_MANIFEST_PATH)
    await fs.remove(MOCK_TMPBASE)
    await fs.ensureDir(MOCK_TMPBASE)
  })

  afterEach(async () => {
    await fs.remove(MOCK_MANIFEST_PATH)
  })

  it('returns a fresh copy each time — mutating result does not affect subsequent call', async () => {
    // First call: get the default manifest
    const first = await readManifest()
    // Mutate it
    first.clis.push('claude' as import('../types/index.js').CLI)
    first.version = 'MUTATED'

    // Second call should return a fresh default (unaffected)
    const second = await readManifest()
    expect(second.clis).toEqual([])
    expect(second.version).not.toBe('MUTATED')
  })

  it('two calls return structurally equal but distinct objects', async () => {
    const a = await readManifest()
    const b = await readManifest()
    expect(a).toEqual(b)
    expect(a).not.toBe(b) // different references
    expect(a.clis).not.toBe(b.clis) // arrays are also distinct
  })

  it('default manifest has empty skills object — mutating it does not leak to next call', async () => {
    const first = await readManifest()
    first.skills['hack'] = {
      name: 'hack',
      version: '0',
      source: 'own',
      installedAt: new Date().toISOString(),
    }

    const second = await readManifest()
    expect(second.skills).toEqual({})
    expect('hack' in second.skills).toBe(false)
  })
})
