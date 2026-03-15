import React, { useState, useEffect } from 'react'
import { Box, useApp } from 'ink'
import CLISelector from './CLISelector.js'
import FeatureSelector from './FeatureSelector.js'
import Progress from './Progress.js'
import Summary from './Summary.js'
import Welcome from './Welcome.js'
import Header from './Header.js'
import { runInstall } from '../installer/index.js'
import type { CLI, Feature, InstallStep } from '../types/index.js'

type Stage = 'welcome' | 'select-cli' | 'select-features' | 'installing' | 'done'

const DEFAULT_FEATURES: Feature[] = ['skills', 'orchestrators', 'configs', 'hooks']

interface AppProps {
  dryRun?: boolean
  preselectedClis?: CLI[]
  autoConfirm?: boolean
}

export default function App({ dryRun = false, preselectedClis, autoConfirm = false }: AppProps) {
  const { exit } = useApp()
  const [stage, setStage] = useState<Stage>(
    autoConfirm && preselectedClis ? 'installing' :
    preselectedClis ? 'select-features' : 'welcome'
  )
  const [selectedClis, setSelectedClis] = useState<CLI[]>(preselectedClis ?? [])
  const [selectedFeatures, setSelectedFeatures] = useState<Feature[]>(DEFAULT_FEATURES)
  const [steps, setSteps] = useState<InstallStep[]>([])
  const [startTime] = useState<number>(Date.now())

  // Auto-confirm: run install immediately when entering 'installing' stage
  useEffect(() => {
    if (stage === 'installing' && autoConfirm) {
      void doInstall(DEFAULT_FEATURES)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doInstall = async (features: Feature[]) => {
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
    if (autoConfirm) exit()
  }

  const handleCLIConfirm = (clis: CLI[]) => {
    setSelectedClis(clis)
    setStage('select-features')
  }

  const handleFeatureConfirm = async (features: Feature[]) => {
    await doInstall(features)
  }

  const subtitle =
    stage === 'installing' ? 'installing...' :
    stage === 'done'       ? 'complete'      :
    undefined

  return (
    <Box flexDirection="column" padding={1}>
      {stage !== 'welcome' && <Header subtitle={subtitle} dryRun={dryRun} />}

      {stage === 'welcome' && (
        <Welcome onDone={() => setStage('select-cli')} />
      )}
      {stage === 'select-cli' && (
        <CLISelector onConfirm={handleCLIConfirm} />
      )}
      {stage === 'select-features' && (
        <FeatureSelector selectedClis={selectedClis} onConfirm={handleFeatureConfirm} />
      )}
      {stage === 'installing' && (
        <Progress steps={steps} selectedClis={selectedClis} onDone={() => setStage('done')} />
      )}
      {stage === 'done' && (
        <Summary
          steps={steps}
          dryRun={dryRun}
          selectedClis={selectedClis}
          elapsedMs={Date.now() - startTime}
        />
      )}
    </Box>
  )
}
