import React, { useEffect, useRef } from 'react'
import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import type { InstallStep } from '../types/index.js'
import type { CLI } from '../types/index.js'
import { theme } from './theme.js'

interface Props {
  steps: InstallStep[]
  selectedClis?: CLI[]
  /** Called once when all non-pending steps are finished with no errors */
  onDone?: () => void
}

const STATUS_ICON: Record<string, string> = {
  pending: '○',
  done:    '✓',
  error:   '✗',
  skipped: '–',
}

const STATUS_COLOR: Record<string, string> = {
  pending: theme.muted,
  running: theme.warning,
  done:    theme.success,
  error:   theme.error,
  skipped: theme.muted,
}

export default function Progress({ steps, selectedClis, onDone }: Props) {
  const doneRef = useRef(false)

  const total     = steps.length
  const completed = steps.filter(s => s.status === 'done' || s.status === 'skipped').length
  const hasError  = steps.some(s => s.status === 'error')
  const allFinished = total > 0 && steps.every(
    s => s.status === 'done' || s.status === 'error' || s.status === 'skipped'
  )

  // Auto-advance when all steps finish with no errors
  useEffect(() => {
    if (allFinished && !hasError && !doneRef.current && onDone) {
      doneRef.current = true
      const t = setTimeout(onDone, 600)
      return () => clearTimeout(t)
    }
    return undefined
  }, [allFinished, hasError, onDone])

  // Group steps by CLI (step IDs are like "claude-skills", "opencode-configs")
  const cliList = selectedClis ?? []
  const cliGroups = new Map<CLI, InstallStep[]>()
  const ungrouped: InstallStep[] = []

  for (const step of steps) {
    const matchedCli = cliList.find(cli => step.id.startsWith(cli))
    if (matchedCli) {
      if (!cliGroups.has(matchedCli)) cliGroups.set(matchedCli, [])
      cliGroups.get(matchedCli)!.push(step)
    } else {
      ungrouped.push(step)
    }
  }

  const renderStep = (step: InstallStep) => (
    <Box key={step.id} marginLeft={2}>
      {step.status === 'running' ? (
        <Text color={theme.warning}>
          <Spinner type="dots" />
          {' '}{step.label}
          {step.detail ? <Text color={theme.muted} dimColor>  {step.detail}</Text> : null}
        </Text>
      ) : (
        <Text color={STATUS_COLOR[step.status] as any}>
          {STATUS_ICON[step.status]} {step.label}
          {step.detail ? <Text color={theme.muted} dimColor>  {step.detail}</Text> : null}
        </Text>
      )}
    </Box>
  )

  return (
    <Box flexDirection="column">
      {/* Summary header */}
      <Box marginBottom={1} flexDirection="column">
        {selectedClis && selectedClis.length > 0 && (
          <Text color={theme.muted}>
            {'Installing for: '}
            <Text color={theme.primary}>{selectedClis.join(', ')}</Text>
          </Text>
        )}
        {total > 0 && (
          <Text color={theme.muted}>
            {'Progress: '}
            <Text color={completed === total ? theme.success : theme.warning}>
              {completed}/{total} steps
            </Text>
          </Text>
        )}
      </Box>

      {/* Steps */}
      <Box flexDirection="column">
        {/* Ungrouped steps first */}
        {ungrouped.map(renderStep)}

        {/* Grouped by CLI with visual separator */}
        {[...cliGroups.entries()].map(([cli, cliSteps], idx) => (
          <Box key={cli} flexDirection="column" marginTop={idx > 0 ? 1 : 0}>
            {idx > 0 && (
              <Text color={theme.muted} dimColor>{'  ' + '─'.repeat(28)}</Text>
            )}
            <Text color={theme.accent} bold>  {cli}</Text>
            {cliSteps.map(renderStep)}
          </Box>
        ))}
      </Box>
    </Box>
  )
}
