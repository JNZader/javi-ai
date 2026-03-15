import { describe, it, expect, afterEach } from 'vitest'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import crypto from 'crypto'

// deepMerge is not exported — we test it through mergeJsonFile for integration
// but we need a way to unit-test it. Since it's local, we import the whole module
// and access its internals via a re-export shim or test through mergeJsonFile.
// The spec says: "import directly from merger/json.ts — it's a named export"
// But looking at the source, deepMerge is NOT exported. We'll test it via mergeJsonFile
// for the integration tests, and create a local re-export for unit tests.

// We use the module's internals by dynamic import trick. Since vitest supports
// module mocking and we're in ESM, we'll just test deepMerge via a thin wrapper.
// Actually, the instruction says "it's a named export" — let's add the export first.
// But we can't modify source files in test. We'll import it and if not exported,
// test through integration. Let's try importing it — if it fails, we test via files.

import { mergeJsonFile } from './json.js'

// ─── Helper to create a unique temp dir ───────────────────────────────────────
function makeTempDir(): string {
  return path.join(os.tmpdir(), `javi-ai-test-${crypto.randomUUID()}`)
}

// ─── Unit tests for deepMerge via a re-exported thin wrapper ─────────────────
// We test deepMerge by calling mergeJsonFile with temp files and inspecting output.
// This covers the merge logic as pure unit tests.

async function runMerge(target: object, source: object): Promise<object> {
  const tmpDir = makeTempDir()
  await fs.ensureDir(tmpDir)
  const srcFile = path.join(tmpDir, 'source.json')
  const tgtFile = path.join(tmpDir, 'target.json')
  await fs.writeFile(srcFile, JSON.stringify(source), 'utf-8')
  await fs.writeFile(tgtFile, JSON.stringify(target), 'utf-8')
  await mergeJsonFile(tgtFile, srcFile)
  const result = JSON.parse(await fs.readFile(tgtFile, 'utf-8'))
  await fs.remove(tmpDir)
  return result
}

describe('deepMerge (via mergeJsonFile)', () => {
  it('merges disjoint keys from both objects', async () => {
    const result = await runMerge({ a: 1 }, { b: 2 })
    expect(result).toEqual({ a: 1, b: 2 })
  })

  it('source scalar overwrites target scalar', async () => {
    const result = await runMerge({ x: 'old' }, { x: 'new' })
    expect(result).toEqual({ x: 'new' })
  })

  it('source scalar overwrites target object (non-null check)', async () => {
    const result = await runMerge({ x: { nested: true } }, { x: 'flat' })
    expect(result).toEqual({ x: 'flat' })
  })

  it('source object + null target → source wins (not recursed)', async () => {
    const result = await runMerge({ x: null }, { x: { nested: true } })
    expect(result).toEqual({ x: { nested: true } })
  })

  it('null source value + object target → null wins (not recursed)', async () => {
    const result = await runMerge({ x: { nested: true } }, { x: null })
    expect(result).toEqual({ x: null })
  })

  it('recursively merges nested objects (2 levels)', async () => {
    const result = await runMerge(
      { obj: { a: 1, b: 2 } },
      { obj: { b: 99, c: 3 } }
    )
    expect(result).toEqual({ obj: { a: 1, b: 99, c: 3 } })
  })

  it('deeply nested objects 3+ levels', async () => {
    const result = await runMerge(
      { a: { b: { c: { d: 1 } } } },
      { a: { b: { c: { e: 2 } } } }
    )
    expect(result).toEqual({ a: { b: { c: { d: 1, e: 2 } } } })
  })

  it('array deduplication: primitive string values', async () => {
    const result = await runMerge({ arr: ['a', 'b'] }, { arr: ['b', 'c'] }) as { arr: string[] }
    expect(result.arr).toContain('a')
    expect(result.arr).toContain('b')
    expect(result.arr).toContain('c')
    // b appears only once
    expect(result.arr.filter(x => x === 'b').length).toBe(1)
  })

  it('array deduplication: primitive number values', async () => {
    const result = await runMerge({ arr: [1, 2] }, { arr: [2, 3] }) as { arr: number[] }
    expect(result.arr).toEqual(expect.arrayContaining([1, 2, 3]))
    expect(result.arr.filter(x => x === 2).length).toBe(1)
  })

  it('array deduplication: object values by JSON equality (same content = same)', async () => {
    const result = await runMerge(
      { arr: [{ id: 1 }] },
      { arr: [{ id: 1 }] }
    ) as { arr: object[] }
    expect(result.arr.length).toBe(1)
  })

  it('array deduplication: object values by reference (different content = both kept)', async () => {
    const result = await runMerge(
      { arr: [{ id: 1 }] },
      { arr: [{ id: 2 }] }
    ) as { arr: object[] }
    expect(result.arr.length).toBe(2)
  })

  it('array union: target items come first', async () => {
    const result = await runMerge({ arr: ['a'] }, { arr: ['b'] }) as { arr: string[] }
    expect(result.arr[0]).toBe('a')
    expect(result.arr[1]).toBe('b')
  })

  it('source array + target scalar → source wins (falls to else)', async () => {
    const result = await runMerge({ x: 'scalar' }, { x: [1, 2, 3] })
    expect(result).toEqual({ x: [1, 2, 3] })
  })

  it('source scalar + target array → source wins (falls to else)', async () => {
    const result = await runMerge({ x: [1, 2, 3] }, { x: 'scalar' })
    expect(result).toEqual({ x: 'scalar' })
  })

  it('empty source → returns copy of target', async () => {
    const result = await runMerge({ a: 1, b: 2 }, {})
    expect(result).toEqual({ a: 1, b: 2 })
  })

  it('empty target → returns copy of source', async () => {
    const result = await runMerge({}, { a: 1, b: 2 })
    expect(result).toEqual({ a: 1, b: 2 })
  })

  it('both empty → returns empty object', async () => {
    const result = await runMerge({}, {})
    expect(result).toEqual({})
  })

  it('boolean false source value is preserved (not treated as falsy)', async () => {
    const result = await runMerge({ flag: true }, { flag: false })
    expect(result).toEqual({ flag: false })
  })

  it('number 0 source value is preserved', async () => {
    const result = await runMerge({ count: 5 }, { count: 0 })
    expect(result).toEqual({ count: 0 })
  })

  it('empty string source value is preserved', async () => {
    const result = await runMerge({ name: 'hello' }, { name: '' })
    expect(result).toEqual({ name: '' })
  })
})

// ─── Integration tests for mergeJsonFile ─────────────────────────────────────

describe('mergeJsonFile (integration)', () => {
  let tmpDir: string

  afterEach(async () => {
    if (tmpDir) await fs.remove(tmpDir)
  })

  function setup(): { srcFile: string; tgtFile: string; backupFile: string } {
    tmpDir = makeTempDir()
    return {
      srcFile: path.join(tmpDir, 'source.json'),
      tgtFile: path.join(tmpDir, 'target.json'),
      backupFile: path.join(tmpDir, 'backup.json'),
    }
  }

  it('target absent: copies source as-is', async () => {
    const { srcFile, tgtFile } = setup()
    await fs.ensureDir(tmpDir)
    const src = { hello: 'world', num: 42 }
    await fs.writeFile(srcFile, JSON.stringify(src), 'utf-8')

    await mergeJsonFile(tgtFile, srcFile)

    const result = JSON.parse(await fs.readFile(tgtFile, 'utf-8'))
    expect(result).toEqual(src)
  })

  it('target present, no backup: merges and writes', async () => {
    const { srcFile, tgtFile } = setup()
    await fs.ensureDir(tmpDir)
    await fs.writeFile(tgtFile, JSON.stringify({ a: 1 }), 'utf-8')
    await fs.writeFile(srcFile, JSON.stringify({ b: 2 }), 'utf-8')

    await mergeJsonFile(tgtFile, srcFile)

    const result = JSON.parse(await fs.readFile(tgtFile, 'utf-8'))
    expect(result).toEqual({ a: 1, b: 2 })
  })

  it('target present, backup requested: backup created before merge, merge correct', async () => {
    const { srcFile, tgtFile, backupFile } = setup()
    await fs.ensureDir(tmpDir)
    const original = { x: 'original' }
    await fs.writeFile(tgtFile, JSON.stringify(original), 'utf-8')
    await fs.writeFile(srcFile, JSON.stringify({ y: 'new' }), 'utf-8')

    await mergeJsonFile(tgtFile, srcFile, backupFile)

    // backup should be the original target
    const backup = JSON.parse(await fs.readFile(backupFile, 'utf-8'))
    expect(backup).toEqual(original)

    // target should be merged
    const result = JSON.parse(await fs.readFile(tgtFile, 'utf-8'))
    expect(result).toEqual({ x: 'original', y: 'new' })
  })

  it('nested merge correctness', async () => {
    const { srcFile, tgtFile } = setup()
    await fs.ensureDir(tmpDir)
    await fs.writeFile(tgtFile, JSON.stringify({ settings: { theme: 'dark', lang: 'en' } }), 'utf-8')
    await fs.writeFile(srcFile, JSON.stringify({ settings: { lang: 'es', extra: true } }), 'utf-8')

    await mergeJsonFile(tgtFile, srcFile)

    const result = JSON.parse(await fs.readFile(tgtFile, 'utf-8'))
    expect(result).toEqual({ settings: { theme: 'dark', lang: 'es', extra: true } })
  })

  it('array dedup correctness end-to-end', async () => {
    const { srcFile, tgtFile } = setup()
    await fs.ensureDir(tmpDir)
    await fs.writeFile(tgtFile, JSON.stringify({ tags: ['a', 'b', 'c'] }), 'utf-8')
    await fs.writeFile(srcFile, JSON.stringify({ tags: ['b', 'd'] }), 'utf-8')

    await mergeJsonFile(tgtFile, srcFile)

    const result = JSON.parse(await fs.readFile(tgtFile, 'utf-8')) as { tags: string[] }
    expect(result.tags).toHaveLength(4)
    expect(result.tags).toContain('a')
    expect(result.tags).toContain('b')
    expect(result.tags).toContain('c')
    expect(result.tags).toContain('d')
    expect(result.tags.filter(x => x === 'b').length).toBe(1)
  })

  it('throws on invalid JSON in source', async () => {
    const { srcFile, tgtFile } = setup()
    await fs.ensureDir(tmpDir)
    await fs.writeFile(srcFile, 'NOT VALID JSON', 'utf-8')

    await expect(mergeJsonFile(tgtFile, srcFile)).rejects.toThrow()
  })

  it('throws on invalid JSON in target', async () => {
    const { srcFile, tgtFile } = setup()
    await fs.ensureDir(tmpDir)
    await fs.writeFile(tgtFile, 'BROKEN JSON', 'utf-8')
    await fs.writeFile(srcFile, JSON.stringify({ ok: true }), 'utf-8')

    await expect(mergeJsonFile(tgtFile, srcFile)).rejects.toThrow()
  })
})
