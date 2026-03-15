import React, { useEffect, useState } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import { runDoctor } from '../commands/doctor.js'
import type { DoctorResult, CheckStatus } from '../commands/doctor.js'

const STATUS_ICON: Record<CheckStatus, string> = {
  ok:   '✓',
  fail: '✗',
  skip: '–',
}

const STATUS_COLOR: Record<CheckStatus, string> = {
  ok:   'green',
  fail: 'red',
  skip: 'gray',
}

export default function Doctor() {
  const { exit } = useApp()
  const [result, setResult] = useState<DoctorResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    runDoctor()
      .then(setResult)
      .catch(e => setError(String(e)))
  }, [])

  useInput((_, key) => {
    if (result !== null || error !== null) {
      if (key.return || key.escape || key.ctrl && _.toLowerCase() === 'c') {
        exit()
      }
    }
  })

  return (
    <Box flexDirection="column" padding={1}>
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color="cyan">javi-ai</Text>
        <Text color="gray"> — doctor</Text>
      </Box>

      {!result && !error && (
        <Text color="yellow">◌ Running checks...</Text>
      )}

      {error && (
        <Text color="red">✗ Error: {error}</Text>
      )}

      {result && result.sections.map((section, si) => (
        <Box key={si} flexDirection="column" marginBottom={1}>
          <Text bold color="white">  {section.title}</Text>
          {section.checks.map((check, ci) => (
            <Box key={ci}>
              <Text color={STATUS_COLOR[check.status] as any}>
                {'  '}
                {STATUS_ICON[check.status]}
                {' '}
                {check.label}
                {check.detail
                  ? <Text color="gray" dimColor>{'  '}{check.detail}</Text>
                  : null}
              </Text>
            </Box>
          ))}
        </Box>
      ))}

      {(result || error) && (
        <Box marginTop={1}>
          <Text color="gray" dimColor>Press Enter to exit</Text>
        </Box>
      )}
    </Box>
  )
}
