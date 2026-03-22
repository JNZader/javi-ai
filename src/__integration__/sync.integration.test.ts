import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs-extra'
import path from 'path'
import { runSync, findConfigDir } from '../commands/sync.js'
import { MARKER_START, MARKER_END } from '../constants.js'
import { createTempDir, cleanupTempDir, readFile, fileExists, collectSteps } from './helpers.js'

// NO mocks — all real filesystem

let tmpDir: string

describe('runSync() — integration', () => {
  beforeEach(async () => {
    tmpDir = await createTempDir()
  })

  afterEach(async () => {
    await cleanupTempDir(tmpDir)
  })

  async function createAiConfig(agents: Record<string, string> = {}, skills: Record<string, string> = {}) {
    const configDir = path.join(tmpDir, '.ai-config')
    await fs.ensureDir(path.join(configDir, 'agents'))
    await fs.ensureDir(path.join(configDir, 'skills'))

    for (const [name, content] of Object.entries(agents)) {
      const agentDir = path.join(configDir, 'agents')
      await fs.writeFile(path.join(agentDir, `${name}.md`), content, 'utf-8')
    }

    for (const [name, content] of Object.entries(skills)) {
      const skillDir = path.join(configDir, 'skills', name)
      await fs.ensureDir(skillDir)
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), content, 'utf-8')
    }

    return configDir
  }

  it('generates CLAUDE.md with agents and skills from frontmatter', async () => {
    await createAiConfig(
      {
        'reviewer': '---\nname: code-reviewer\ndescription: Reviews code\n---\n# Reviewer\nDoes reviews.',
      },
      {
        'tdd': '---\nname: tdd\ndescription: Test-Driven Development\n---\n# TDD Skill\nRed-Green-Refactor.',
      }
    )

    const { onStep } = collectSteps()
    await runSync({ target: 'claude', mode: 'overwrite', projectDir: tmpDir, dryRun: false }, onStep)

    expect(await fileExists(tmpDir, 'CLAUDE.md')).toBe(true)

    const content = await readFile(tmpDir, 'CLAUDE.md')
    expect(content).toContain(MARKER_START)
    expect(content).toContain(MARKER_END)
    expect(content).toContain('code-reviewer')
    expect(content).toContain('Reviews code')
    expect(content).toContain('tdd')
    expect(content).toContain('Test-Driven Development')
  })

  it('generates AGENTS.md for opencode target', async () => {
    await createAiConfig(
      { 'helper': '---\nname: helper\ndescription: Helps with things\n---\n# Helper' },
      {}
    )

    const { onStep } = collectSteps()
    await runSync({ target: 'opencode', mode: 'overwrite', projectDir: tmpDir, dryRun: false }, onStep)

    expect(await fileExists(tmpDir, 'AGENTS.md')).toBe(true)
    const content = await readFile(tmpDir, 'AGENTS.md')
    expect(content).toContain('helper')
  })

  it('merge mode preserves existing content outside markers', async () => {
    // Pre-existing user content
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# My Rules\n\nNo var allowed.\n', 'utf-8')

    await createAiConfig(
      { 'agent1': '---\nname: agent1\ndescription: First agent\n---\n# Agent 1' },
      {}
    )

    const { onStep } = collectSteps()
    await runSync({ target: 'claude', mode: 'merge', projectDir: tmpDir, dryRun: false }, onStep)

    const content = await readFile(tmpDir, 'CLAUDE.md')
    expect(content).toContain('# My Rules')
    expect(content).toContain('No var allowed.')
    expect(content).toContain(MARKER_START)
    expect(content).toContain('agent1')
    expect(content).toContain(MARKER_END)
  })

  it('merge mode replaces between existing markers (idempotent)', async () => {
    await createAiConfig(
      { 'v1': '---\nname: v1-agent\ndescription: Version 1\n---\n# V1' },
      {}
    )

    const { onStep } = collectSteps()
    // First sync
    await runSync({ target: 'claude', mode: 'merge', projectDir: tmpDir, dryRun: false }, onStep)
    const first = await readFile(tmpDir, 'CLAUDE.md')
    expect(first).toContain('v1-agent')

    // Change agents
    await fs.remove(path.join(tmpDir, '.ai-config', 'agents', 'v1.md'))
    await fs.writeFile(
      path.join(tmpDir, '.ai-config', 'agents', 'v2.md'),
      '---\nname: v2-agent\ndescription: Version 2\n---\n# V2',
      'utf-8'
    )

    // Second sync (merge)
    await runSync({ target: 'claude', mode: 'merge', projectDir: tmpDir, dryRun: false }, onStep)
    const second = await readFile(tmpDir, 'CLAUDE.md')
    expect(second).toContain('v2-agent')
    expect(second).not.toContain('v1-agent')
    // Only one pair of markers
    expect(second.split(MARKER_START).length).toBe(2) // 1 occurrence
  })

  it('dry-run does not create files', async () => {
    await createAiConfig(
      { 'test': '---\nname: test\ndescription: Test agent\n---\n# Test' },
      {}
    )

    const { onStep } = collectSteps()
    await runSync({ target: 'claude', mode: 'overwrite', projectDir: tmpDir, dryRun: true }, onStep)

    expect(await fileExists(tmpDir, 'CLAUDE.md')).toBe(false)
  })

  it('respects .skillignore for global exclusions', async () => {
    await createAiConfig(
      {},
      {
        'keep-this': '---\nname: keep-this\ndescription: Should be included\n---\n# Keep',
        'skip-this': '---\nname: skip-this\ndescription: Should be excluded\n---\n# Skip',
      }
    )

    // Create .skillignore
    await fs.writeFile(
      path.join(tmpDir, '.ai-config', '.skillignore'),
      'skip-this\n',
      'utf-8'
    )

    const { onStep } = collectSteps()
    await runSync({ target: 'claude', mode: 'overwrite', projectDir: tmpDir, dryRun: false }, onStep)

    const content = await readFile(tmpDir, 'CLAUDE.md')
    expect(content).toContain('keep-this')
    expect(content).not.toContain('skip-this')
  })

  it('reports error when .ai-config not found', async () => {
    const emptyDir = await createTempDir()
    const { steps, onStep } = collectSteps()

    await runSync({ target: 'claude', mode: 'overwrite', projectDir: emptyDir, dryRun: false }, onStep)

    const findStep = steps.find(s => s.id === 'find-config')
    expect(findStep?.status).toBe('error')

    await cleanupTempDir(emptyDir)
  })

  it('target=all generates files for all CLIs', async () => {
    await createAiConfig(
      { 'multi': '---\nname: multi-agent\ndescription: Multi-target test\n---\n# Multi' },
      {}
    )

    const { onStep } = collectSteps()
    await runSync({ target: 'all', mode: 'overwrite', projectDir: tmpDir, dryRun: false }, onStep)

    // Should generate for at least claude and opencode
    expect(await fileExists(tmpDir, 'CLAUDE.md')).toBe(true)
    expect(await fileExists(tmpDir, 'AGENTS.md')).toBe(true)
  })
})

describe('findConfigDir() — integration', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await createTempDir()
  })

  afterEach(async () => {
    await cleanupTempDir(tmpDir)
  })

  it('finds .ai-config in current directory', async () => {
    await fs.ensureDir(path.join(tmpDir, '.ai-config'))
    const result = await findConfigDir(tmpDir)
    expect(result).toBe(path.join(tmpDir, '.ai-config'))
  })

  it('walks up to find .ai-config in parent', async () => {
    const child = path.join(tmpDir, 'sub', 'deep')
    await fs.ensureDir(child)
    await fs.ensureDir(path.join(tmpDir, '.ai-config'))

    const result = await findConfigDir(child)
    expect(result).toBe(path.join(tmpDir, '.ai-config'))
  })

  it('returns null when not found', async () => {
    const result = await findConfigDir(tmpDir)
    expect(result).toBeNull()
  })
})
