/**
 * E2E test helpers — runs the REAL compiled CLI as a subprocess
 * against a temporary sandbox HOME directory.
 */
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import crypto from 'crypto'

const execFileAsync = promisify(execFile)

export const CLI_PATH = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../../dist/index.js',
)

export interface CLIResult {
  stdout: string
  stderr: string
  exitCode: number
}

/**
 * Create an isolated sandbox directory that acts as a fake HOME.
 * Returns the absolute path to the sandbox.
 */
export async function createSandbox(): Promise<string> {
  const dir = path.join(os.tmpdir(), `javi-ai-e2e-${crypto.randomUUID()}`)
  await fs.ensureDir(dir)
  return dir
}

/**
 * Remove a sandbox directory (cleanup).
 */
export async function removeSandbox(dir: string): Promise<void> {
  await fs.remove(dir)
}

/**
 * Run the compiled CLI as a child process with a custom HOME.
 */
export async function runCLI(
  args: string[],
  home: string,
  timeout = 30_000,
): Promise<CLIResult> {
  try {
    const { stdout, stderr } = await execFileAsync('node', [CLI_PATH, ...args], {
      timeout,
      env: {
        ...process.env,
        HOME: home,
        FORCE_COLOR: '0',
        CI: '1',
        // Prevent ink from using alternate screen
        TERM: 'dumb',
      },
    })
    return { stdout, stderr, exitCode: 0 }
  } catch (e: any) {
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
      exitCode: e.code ?? 1,
    }
  }
}

/**
 * Count files matching a pattern recursively in a directory.
 */
export async function countFiles(dir: string, filename: string): Promise<number> {
  if (!await fs.pathExists(dir)) return 0
  let count = 0
  const walk = async (d: string) => {
    const entries = await fs.readdir(d, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(d, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
      } else if (entry.name === filename) {
        count++
      }
    }
  }
  await walk(dir)
  return count
}

/**
 * List all subdirectories in a directory (1 level deep).
 */
export async function listDirs(dir: string): Promise<string[]> {
  if (!await fs.pathExists(dir)) return []
  const entries = await fs.readdir(dir, { withFileTypes: true })
  return entries.filter(e => e.isDirectory()).map(e => e.name)
}
