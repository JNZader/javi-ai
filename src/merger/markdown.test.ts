import { describe, it, expect, afterEach } from 'vitest'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import crypto from 'crypto'

import { mergeMarkdownFile } from './markdown.js'
import { MARKER_START, MARKER_END } from '../constants.js'

function makeTempDir(): string {
  return path.join(os.tmpdir(), `javi-ai-md-test-${crypto.randomUUID()}`)
}

describe('mergeMarkdownFile (integration)', () => {
  let tmpDir: string

  afterEach(async () => {
    if (tmpDir) await fs.remove(tmpDir)
  })

  function setup(): { srcFile: string; tgtFile: string; backupFile: string } {
    tmpDir = makeTempDir()
    return {
      srcFile: path.join(tmpDir, 'source.md'),
      tgtFile: path.join(tmpDir, 'target.md'),
      backupFile: path.join(tmpDir, 'backup.md'),
    }
  }

  it('target absent: creates file with MARKER_START + content + MARKER_END', async () => {
    const { srcFile, tgtFile } = setup()
    await fs.ensureDir(tmpDir)
    const content = '## My Section\nSome content here.'
    await fs.writeFile(srcFile, content, 'utf-8')

    await mergeMarkdownFile(tgtFile, srcFile)

    const result = await fs.readFile(tgtFile, 'utf-8')
    expect(result).toContain(MARKER_START)
    expect(result).toContain(content)
    expect(result).toContain(MARKER_END)
    // Verify order
    const startIdx = result.indexOf(MARKER_START)
    const endIdx = result.indexOf(MARKER_END)
    const contentIdx = result.indexOf(content)
    expect(startIdx).toBeLessThan(contentIdx)
    expect(contentIdx).toBeLessThan(endIdx)
  })

  it('target present, both markers: replaces ONLY section between markers, preserves before and after', async () => {
    const { srcFile, tgtFile } = setup()
    await fs.ensureDir(tmpDir)

    const before = '# Original Header\n\nSome existing content.\n\n'
    const after = '\n\n## Trailing Section\nKeep this.\n'
    const oldInner = 'Old managed content'
    const existingTarget = `${before}${MARKER_START}\n${oldInner}\n${MARKER_END}${after}`
    await fs.writeFile(tgtFile, existingTarget, 'utf-8')

    const newContent = 'Brand new managed content'
    await fs.writeFile(srcFile, newContent, 'utf-8')

    await mergeMarkdownFile(tgtFile, srcFile)

    const result = await fs.readFile(tgtFile, 'utf-8')

    // Before is preserved
    expect(result).toContain('Original Header')
    expect(result).toContain('Some existing content.')

    // After is preserved
    expect(result).toContain('Trailing Section')
    expect(result).toContain('Keep this.')

    // New content is present
    expect(result).toContain('Brand new managed content')

    // Old content is gone
    expect(result).not.toContain(oldInner)

    // Markers appear exactly once
    expect(result.split(MARKER_START).length - 1).toBe(1)
    expect(result.split(MARKER_END).length - 1).toBe(1)
  })

  it('target present, no markers: appends block at end, original content intact', async () => {
    const { srcFile, tgtFile } = setup()
    await fs.ensureDir(tmpDir)

    const original = '# Existing File\nSome user content.'
    await fs.writeFile(tgtFile, original, 'utf-8')
    await fs.writeFile(srcFile, 'Appended managed content', 'utf-8')

    await mergeMarkdownFile(tgtFile, srcFile)

    const result = await fs.readFile(tgtFile, 'utf-8')
    expect(result).toContain('Existing File')
    expect(result).toContain('Some user content.')
    expect(result).toContain(MARKER_START)
    expect(result).toContain('Appended managed content')
    expect(result).toContain(MARKER_END)

    // Original comes before the markers
    const origIdx = result.indexOf('Existing File')
    const markerIdx = result.indexOf(MARKER_START)
    expect(origIdx).toBeLessThan(markerIdx)
  })

  it('target present, only start marker (no end): treats as no-markers, appends', async () => {
    const { srcFile, tgtFile } = setup()
    await fs.ensureDir(tmpDir)

    // Only MARKER_START, no MARKER_END
    const original = `# File\n${MARKER_START}\nOrphan content`
    await fs.writeFile(tgtFile, original, 'utf-8')
    await fs.writeFile(srcFile, 'New managed', 'utf-8')

    await mergeMarkdownFile(tgtFile, srcFile)

    const result = await fs.readFile(tgtFile, 'utf-8')
    // Appended, not replaced
    expect(result).toContain('Orphan content')
    expect(result).toContain('New managed')
    // The appended block adds another MARKER_START
    expect(result.split(MARKER_START).length - 1).toBeGreaterThanOrEqual(1)
  })

  it('backup created before any modification (verify backup file matches original)', async () => {
    const { srcFile, tgtFile, backupFile } = setup()
    await fs.ensureDir(tmpDir)

    const original = '# Original Content\nDo not lose this.'
    await fs.writeFile(tgtFile, original, 'utf-8')
    await fs.writeFile(srcFile, 'New content', 'utf-8')

    await mergeMarkdownFile(tgtFile, srcFile, backupFile)

    const backup = await fs.readFile(backupFile, 'utf-8')
    expect(backup).toBe(original)
  })

  it('content before markers is preserved character-for-character', async () => {
    const { srcFile, tgtFile } = setup()
    await fs.ensureDir(tmpDir)

    const before = '# Exact Header\n\nLine 1.\nLine 2.\n\n'
    const existing = `${before}${MARKER_START}\nold\n${MARKER_END}`
    await fs.writeFile(tgtFile, existing, 'utf-8')
    await fs.writeFile(srcFile, 'new content', 'utf-8')

    await mergeMarkdownFile(tgtFile, srcFile)

    const result = await fs.readFile(tgtFile, 'utf-8')
    expect(result.startsWith(before)).toBe(true)
  })

  it('content after markers is preserved character-for-character', async () => {
    const { srcFile, tgtFile } = setup()
    await fs.ensureDir(tmpDir)

    const after = '\n\n# After Section\n\nTrailing text.\n'
    const existing = `${MARKER_START}\nold\n${MARKER_END}${after}`
    await fs.writeFile(tgtFile, existing, 'utf-8')
    await fs.writeFile(srcFile, 'new content', 'utf-8')

    await mergeMarkdownFile(tgtFile, srcFile)

    const result = await fs.readFile(tgtFile, 'utf-8')
    const endMarkerIdx = result.indexOf(MARKER_END)
    const afterMarker = result.substring(endMarkerIdx + MARKER_END.length)
    expect(afterMarker).toBe(after)
  })

  it('running twice: second run replaces first run section (idempotent)', async () => {
    const { srcFile, tgtFile } = setup()
    await fs.ensureDir(tmpDir)

    const original = '# Header\n\n'
    await fs.writeFile(tgtFile, original, 'utf-8')
    await fs.writeFile(srcFile, 'Managed content', 'utf-8')

    // First run (appends since no markers)
    await mergeMarkdownFile(tgtFile, srcFile)

    // Second run (should replace the section)
    await mergeMarkdownFile(tgtFile, srcFile)

    const result = await fs.readFile(tgtFile, 'utf-8')

    // Markers appear exactly once each
    expect(result.split(MARKER_START).length - 1).toBe(1)
    expect(result.split(MARKER_END).length - 1).toBe(1)

    // Content appears exactly once
    expect(result.split('Managed content').length - 1).toBe(1)
  })

  it('MARKER_START and MARKER_END themselves are not duplicated on double-run', async () => {
    const { srcFile, tgtFile } = setup()
    await fs.ensureDir(tmpDir)

    const original = '# Doc\n\nUser text.\n'
    await fs.writeFile(tgtFile, original, 'utf-8')
    await fs.writeFile(srcFile, 'Auto content', 'utf-8')

    await mergeMarkdownFile(tgtFile, srcFile)
    await mergeMarkdownFile(tgtFile, srcFile)

    const result = await fs.readFile(tgtFile, 'utf-8')
    expect(result.split(MARKER_START).length - 1).toBe(1)
    expect(result.split(MARKER_END).length - 1).toBe(1)
  })
})
