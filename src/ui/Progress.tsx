import React from 'react'
import { Box, Text } from 'ink'
import type { InstallStep } from '../types/index.js'

interface Props {
  steps: InstallStep[]
}

const STATUS_ICON: Record<string, string> = {
  pending: '○',
  running: '◌',
  done: '✓',
  error: '✗',
  skipped: '–',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'gray',
  running: 'yellow',
  done: 'green',
  error: 'red',
  skipped: 'gray',
}

export default function Progress({ steps }: Props) {
  return (
    <Box flexDirection="column">
      <Text bold>Installing...</Text>
      <Box marginTop={1} flexDirection="column">
        {steps.map(step => (
          <Box key={step.id}>
            <Text color={STATUS_COLOR[step.status] as any}>
              {STATUS_ICON[step.status]} {step.label}
              {step.detail && <Text color="gray" dimColor>  {step.detail}</Text>}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
