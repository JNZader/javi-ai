import React, { useState, useEffect } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import { buildUninstallPlan, runUninstall } from '../commands/uninstall.js'
import type { UninstallItem, UninstallResult } from '../commands/uninstall.js'
import type { CLI } from '../types/index.js'

type Stage = 'loading' | 'confirm' | 'uninstalling' | 'done' | 'no-install'

export default function Uninstall() {
  const { exit } = useApp()
  const [stage, setStage] = useState<Stage>('loading')
  const [clis, setClis] = useState<CLI[]>([])
  const [items, setItems] = useState<UninstallItem[]>([])
  const [result, setResult] = useState<UninstallResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    buildUninstallPlan()
      .then(plan => {
        if (plan.clis.length === 0) {
          setStage('no-install')
        } else {
          setClis(plan.clis)
          setItems(plan.items)
          setStage('confirm')
        }
      })
      .catch(e => {
        setError(String(e))
        setStage('no-install')
      })
  }, [])

  const doUninstall = async () => {
    setStage('uninstalling')
    try {
      const res = await runUninstall(items)
      setResult(res)
      setStage('done')
    } catch (e) {
      setError(String(e))
      setStage('done')
    }
  }

  useInput((input, key) => {
    if (stage === 'confirm') {
      if (input.toLowerCase() === 'y' || key.return) {
        void doUninstall()
      } else if (input.toLowerCase() === 'n' || key.escape) {
        exit()
      }
    }
    if (stage === 'no-install' || stage === 'done') {
      if (key.return || key.escape) exit()
    }
  })

  return (
    <Box flexDirection="column" padding={1}>
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color="cyan">javi-ai</Text>
        <Text color="gray"> — uninstall</Text>
      </Box>

      {stage === 'loading' && (
        <Text color="yellow">◌ Building uninstall plan...</Text>
      )}

      {stage === 'no-install' && (
        <Box flexDirection="column">
          {error
            ? <Text color="red">✗ Error: {error}</Text>
            : <Text color="red">✗ No javi-ai installation found.</Text>
          }
          <Box marginTop={1}>
            <Text color="gray" dimColor>Press Enter to exit</Text>
          </Box>
        </Box>
      )}

      {stage === 'confirm' && (
        <Box flexDirection="column">
          <Text>
            The following will be removed for:{' '}
            <Text bold color="cyan">{clis.join(', ')}</Text>
          </Text>
          <Box marginTop={1} flexDirection="column">
            {items.map((item, i) => (
              <Text key={i} color="red">  ✗ {item.label}</Text>
            ))}
          </Box>
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              Note: Your AI CLIs (claude, opencode, etc.) will NOT be removed.
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text>Continue? </Text>
            <Text bold color="red">[y/N] </Text>
          </Box>
        </Box>
      )}

      {stage === 'uninstalling' && (
        <Text color="yellow">◌ Removing javi-ai managed files...</Text>
      )}

      {stage === 'done' && result && (
        <Box flexDirection="column">
          <Text bold color={result.errors.length > 0 ? 'yellow' : 'green'}>
            Uninstall complete
          </Text>
          <Box marginTop={1} flexDirection="column">
            {result.removed.map((r, i) => (
              <Text key={i} color="green">  ✓ {r}</Text>
            ))}
            {result.restored.map((r, i) => (
              <Text key={`r-${i}`} color="cyan">  ↩ {r}</Text>
            ))}
            {result.errors.map((e, i) => (
              <Text key={`e-${i}`} color="red">  ✗ {e}</Text>
            ))}
          </Box>
          <Box marginTop={1}>
            <Text color="gray" dimColor>Press Enter to exit</Text>
          </Box>
        </Box>
      )}

      {stage === 'done' && error && !result && (
        <Box flexDirection="column">
          <Text color="red">✗ Uninstall failed: {error}</Text>
          <Box marginTop={1}>
            <Text color="gray" dimColor>Press Enter to exit</Text>
          </Box>
        </Box>
      )}
    </Box>
  )
}
