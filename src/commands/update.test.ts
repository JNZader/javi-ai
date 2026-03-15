import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock runInstall before importing update
vi.mock('../installer/index.js', () => ({
  runInstall: vi.fn(),
}))

// Mock readManifest
vi.mock('../installer/manifest.js', () => ({
  readManifest: vi.fn(),
  writeManifest: vi.fn(),
}))

import { runUpdate } from './update.js'
import { runInstall } from '../installer/index.js'
import { readManifest } from '../installer/manifest.js'
import type { InstallStep } from '../types/index.js'

const mockRunInstall = vi.mocked(runInstall)
const mockReadManifest = vi.mocked(readManifest)

describe('runUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns early result when manifest has no CLIs', async () => {
    mockReadManifest.mockResolvedValue({
      version: '0.1.0',
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clis: [],
      skills: {},
    })

    const onStep = vi.fn()
    const result = await runUpdate({}, onStep)

    expect(result).toEqual({ clis: [], steps: [] })
    expect(mockRunInstall).not.toHaveBeenCalled()
    expect(onStep).not.toHaveBeenCalled()
  })

  it('calls runInstall with manifest CLIs and all 4 features', async () => {
    mockReadManifest.mockResolvedValue({
      version: '0.1.0',
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clis: ['claude', 'gemini'],
      skills: {},
    })
    mockRunInstall.mockResolvedValue(undefined)

    const onStep = vi.fn()
    await runUpdate({ dryRun: false }, onStep)

    expect(mockRunInstall).toHaveBeenCalledWith(
      expect.objectContaining({
        clis: ['claude', 'gemini'],
        features: ['skills', 'orchestrators', 'configs', 'hooks'],
        dryRun: false,
        backup: true,
      }),
      expect.any(Function)
    )
  })

  it('passes dryRun: true when option is set', async () => {
    mockReadManifest.mockResolvedValue({
      version: '0.1.0',
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clis: ['claude'],
      skills: {},
    })
    mockRunInstall.mockResolvedValue(undefined)

    await runUpdate({ dryRun: true }, vi.fn())

    expect(mockRunInstall).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: true }),
      expect.any(Function)
    )
  })

  it('trackStep: first step is pushed to steps array', async () => {
    mockReadManifest.mockResolvedValue({
      version: '0.1.0',
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clis: ['claude'],
      skills: {},
    })

    // Capture the trackStep function passed to runInstall
    let capturedTrackStep: ((step: InstallStep) => void) | undefined
    mockRunInstall.mockImplementation(async (_, trackStep) => {
      capturedTrackStep = trackStep
      trackStep({ id: 'step-1', label: 'First step', status: 'running' })
    })

    const result = await runUpdate({}, vi.fn())

    expect(result.steps).toHaveLength(1)
    expect(result.steps[0]).toEqual({ id: 'step-1', label: 'First step', status: 'running' })
  })

  it('trackStep: second call with same id replaces first (upsert by id)', async () => {
    mockReadManifest.mockResolvedValue({
      version: '0.1.0',
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clis: ['claude'],
      skills: {},
    })

    mockRunInstall.mockImplementation(async (_, trackStep) => {
      trackStep({ id: 'step-1', label: 'Step', status: 'running' })
      trackStep({ id: 'step-1', label: 'Step', status: 'done' })
    })

    const result = await runUpdate({}, vi.fn())

    expect(result.steps).toHaveLength(1)
    expect(result.steps[0]!.status).toBe('done')
  })

  it('trackStep: step with new id is appended', async () => {
    mockReadManifest.mockResolvedValue({
      version: '0.1.0',
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clis: ['claude'],
      skills: {},
    })

    mockRunInstall.mockImplementation(async (_, trackStep) => {
      trackStep({ id: 'step-1', label: 'First', status: 'done' })
      trackStep({ id: 'step-2', label: 'Second', status: 'done' })
    })

    const result = await runUpdate({}, vi.fn())

    expect(result.steps).toHaveLength(2)
    expect(result.steps[0]!.id).toBe('step-1')
    expect(result.steps[1]!.id).toBe('step-2')
  })

  it('onStep is called for every step update', async () => {
    mockReadManifest.mockResolvedValue({
      version: '0.1.0',
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clis: ['claude'],
      skills: {},
    })

    mockRunInstall.mockImplementation(async (_, trackStep) => {
      trackStep({ id: 'a', label: 'A', status: 'running' })
      trackStep({ id: 'a', label: 'A', status: 'done' })
      trackStep({ id: 'b', label: 'B', status: 'running' })
    })

    const onStep = vi.fn()
    await runUpdate({}, onStep)

    // onStep should be called 3 times (once per trackStep call)
    expect(onStep).toHaveBeenCalledTimes(3)
  })

  it('returns { clis, steps } with correct shape', async () => {
    mockReadManifest.mockResolvedValue({
      version: '0.1.0',
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clis: ['claude', 'opencode'],
      skills: {},
    })

    mockRunInstall.mockImplementation(async (_, trackStep) => {
      trackStep({ id: 'claude-skills', label: 'Skills', status: 'done' })
    })

    const result = await runUpdate({}, vi.fn())

    expect(result).toHaveProperty('clis')
    expect(result).toHaveProperty('steps')
    expect(result.clis).toEqual(['claude', 'opencode'])
    expect(Array.isArray(result.steps)).toBe(true)
  })

  it('defaults dryRun to false when not specified', async () => {
    mockReadManifest.mockResolvedValue({
      version: '0.1.0',
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clis: ['claude'],
      skills: {},
    })
    mockRunInstall.mockResolvedValue(undefined)

    await runUpdate({}, vi.fn())

    expect(mockRunInstall).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: false }),
      expect.any(Function)
    )
  })
})
