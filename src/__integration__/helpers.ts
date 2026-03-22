import fs from 'fs-extra'
import os from 'os'
import path from 'path'

export async function createTempDir(prefix = 'javi-ai-test-'): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix))
}

export async function cleanupTempDir(dir: string): Promise<void> {
  await fs.remove(dir)
}

export async function readFile(dir: string, ...segments: string[]): Promise<string> {
  return fs.readFile(path.join(dir, ...segments), 'utf-8')
}

export async function fileExists(dir: string, ...segments: string[]): Promise<boolean> {
  return fs.pathExists(path.join(dir, ...segments))
}

export function collectSteps() {
  const steps: Array<{ id: string; label: string; status: string; detail?: string }> = []
  const onStep = (step: { id: string; label: string; status: string; detail?: string }) => {
    const idx = steps.findIndex(s => s.id === step.id)
    if (idx >= 0) steps[idx] = step
    else steps.push(step)
  }
  return { steps, onStep }
}
