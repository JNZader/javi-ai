import React, { useState, useEffect } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import { runUpdate } from '../commands/update.js'
import Progress from './Progress.js'
import Summary from './Summary.js'
import { readManifest } from '../installer/manifest.js'
import type { CLI, InstallStep } from '../types/index.js'

type Stage = 'loading' | 'confirm' | 'updating' | 'done' | 'no-install'

interface UpdateProps {
  dryRun?: boolean
}

export default function Update({ dryRun = false }: UpdateProps) {
  const { exit } = useApp()
  const [stage, setStage] = useState<Stage>('loading')
  const [installedClis, setInstalledClis] = useState<CLI[]>([])
  const [steps, setSteps] = useState<InstallStep[]>([])

  // Load manifest to know which CLIs are installed
  useEffect(() => {
    readManifest().then(manifest => {
      if (manifest.clis.length === 0) {
        setStage('no-install')
      } else {
        setInstalledClis(manifest.clis)
        setStage('confirm')
      }
    }).catch(() => {
      setStage('no-install')
    })
  }, [])

  const startUpdate = async () => {
    setStage('updating')
    await runUpdate({ dryRun }, (step) => {
      setSteps(prev => {
        const idx = prev.findIndex(s => s.id === step.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = step
          return next
        }
        return [...prev, step]
      })
    })
    setStage('done')
  }

  // Confirm prompt keyboard handler
  useInput((input, key) => {
    if (stage === 'confirm') {
      if (input.toLowerCase() === 'y' || key.return) {
        void startUpdate()
      } else if (input.toLowerCase() === 'n' || key.escape) {
        exit()
      }
    }
    if (stage === 'no-install') {
      if (key.return || key.escape) exit()
    }
  })

  return (
    <Box flexDirection="column" padding={1}>
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color="cyan">javi-ai</Text>
        <Text color="gray"> — update</Text>
        {dryRun && <Text color="yellow"> [DRY RUN]</Text>}
      </Box>

      {stage === 'loading' && (
        <Text color="yellow">◌ Loading manifest...</Text>
      )}

      {stage === 'no-install' && (
        <Box flexDirection="column">
          <Text color="red">✗ No javi-ai installation found.</Text>
          <Text color="gray">Run <Text bold>javi-ai install</Text> first.</Text>
          <Box marginTop={1}>
            <Text color="gray" dimColor>Press Enter to exit</Text>
          </Box>
        </Box>
      )}

      {stage === 'confirm' && (
        <Box flexDirection="column">
          <Text>
            Update will re-install for:{' '}
            <Text bold color="cyan">{installedClis.join(', ')}</Text>
          </Text>
          <Text color="gray" dimColor>A backup will be created before any changes.</Text>
          <Box marginTop={1}>
            <Text>Continue? </Text>
            <Text bold>[Y/n] </Text>
          </Box>
        </Box>
      )}

      {stage === 'updating' && <Progress steps={steps} />}

      {stage === 'done' && (
        <Summary steps={steps} dryRun={dryRun} onExit={() => exit()} />
      )}
    </Box>
  )
}
