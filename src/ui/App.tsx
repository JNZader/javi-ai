import React, { useState } from 'react'
import { Box, Text, useApp } from 'ink'
import CLISelector from './CLISelector.js'
import FeatureSelector from './FeatureSelector.js'
import Progress from './Progress.js'
import Summary from './Summary.js'
import { runInstall } from '../installer/index.js'
import type { CLI, Feature, InstallStep } from '../types/index.js'

type Stage = 'select-cli' | 'select-features' | 'installing' | 'done'

interface AppProps {
  dryRun?: boolean
  preselectedClis?: CLI[]
}

export default function App({ dryRun = false, preselectedClis }: AppProps) {
  const { exit } = useApp()
  const [stage, setStage] = useState<Stage>(preselectedClis ? 'select-features' : 'select-cli')
  const [selectedClis, setSelectedClis] = useState<CLI[]>(preselectedClis ?? [])
  const [selectedFeatures, setSelectedFeatures] = useState<Feature[]>(['skills', 'orchestrators', 'configs', 'hooks'])
  const [steps, setSteps] = useState<InstallStep[]>([])

  const handleCLIConfirm = (clis: CLI[]) => {
    setSelectedClis(clis)
    setStage('select-features')
  }

  const handleFeatureConfirm = async (features: Feature[]) => {
    setSelectedFeatures(features)
    setStage('installing')

    await runInstall(
      { clis: selectedClis, features, dryRun, backup: true },
      (step) => setSteps(prev => {
        const idx = prev.findIndex(s => s.id === step.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = step
          return next
        }
        return [...prev, step]
      })
    )

    setStage('done')
  }

  const handleDone = () => exit()

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">javi-ai</Text>
        <Text color="gray"> — AI development layer installer</Text>
        {dryRun && <Text color="yellow"> [DRY RUN]</Text>}
      </Box>

      {stage === 'select-cli' && (
        <CLISelector onConfirm={handleCLIConfirm} />
      )}
      {stage === 'select-features' && (
        <FeatureSelector selectedClis={selectedClis} onConfirm={handleFeatureConfirm} />
      )}
      {stage === 'installing' && (
        <Progress steps={steps} />
      )}
      {stage === 'done' && (
        <Summary steps={steps} dryRun={dryRun} onExit={handleDone} />
      )}
    </Box>
  )
}
