import { readManifest } from '../installer/manifest.js'
import { runInstall } from '../installer/index.js'
import type { CLI, InstallStep } from '../types/index.js'

export interface UpdateOptions {
  dryRun?: boolean
}

export interface UpdateResult {
  clis: CLI[]
  steps: InstallStep[]
}

export async function runUpdate(
  options: UpdateOptions,
  onStep: (step: InstallStep) => void
): Promise<UpdateResult> {
  const manifest = await readManifest()
  const clis: CLI[] = manifest.clis

  if (clis.length === 0) {
    return { clis: [], steps: [] }
  }

  const steps: InstallStep[] = []
  const trackStep = (step: InstallStep) => {
    const idx = steps.findIndex(s => s.id === step.id)
    if (idx >= 0) {
      steps[idx] = step
    } else {
      steps.push(step)
    }
    onStep(step)
  }

  await runInstall(
    {
      clis,
      features: ['skills', 'orchestrators', 'configs', 'hooks'],
      dryRun: options.dryRun ?? false,
      backup: true,
    },
    trackStep
  )

  return { clis, steps }
}
