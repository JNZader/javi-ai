import React from 'react'
import { Box, Text, useInput } from 'ink'
import type { InstallStep } from '../types/index.js'

interface Props {
  steps: InstallStep[]
  dryRun: boolean
  onExit: () => void
}

export default function Summary({ steps, dryRun, onExit }: Props) {
  const done = steps.filter(s => s.status === 'done').length
  const errors = steps.filter(s => s.status === 'error')

  useInput((_, key) => {
    if (key.return || key.escape) onExit()
  })

  return (
    <Box flexDirection="column">
      <Text bold color={errors.length > 0 ? 'yellow' : 'green'}>
        {dryRun ? 'Dry run complete' : 'Installation complete'}
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text>  ✓ {done} steps completed</Text>
        {errors.length > 0 && (
          <Box flexDirection="column">
            <Text color="red">  ✗ {errors.length} errors:</Text>
            {errors.map(e => (
              <Text key={e.id} color="red">    • {e.label}: {e.detail}</Text>
            ))}
          </Box>
        )}
      </Box>
      <Box marginTop={1}>
        <Text color="gray">Press Enter to exit</Text>
      </Box>
    </Box>
  )
}
