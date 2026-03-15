import React, { useEffect } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import type { InstallStep } from '../types/index.js'
import type { CLI } from '../types/index.js'
import { theme } from './theme.js'
import { BACKUP_DIR } from '../constants.js'

interface Props {
  steps: InstallStep[]
  dryRun: boolean
  selectedClis?: CLI[]
  elapsedMs?: number
  /** @deprecated use useApp exit internally */
  onExit?: () => void
}

export default function Summary({ steps, dryRun, selectedClis, elapsedMs, onExit }: Props) {
  const { exit } = useApp()

  const done   = steps.filter(s => s.status === 'done').length
  const errors = steps.filter(s => s.status === 'error')
  const elapsed = elapsedMs != null
    ? `${(elapsedMs / 1000).toFixed(1)}s`
    : null

  // Detect if any backup was likely created (non-dry-run + has done steps)
  const hasBackup = !dryRun && done > 0
  const backupPath = hasBackup ? BACKUP_DIR : null

  const handleExit = () => {
    if (onExit) onExit()
    else exit()
  }

  useInput((_, key) => {
    if (key.return || key.escape) handleExit()
  })

  // Group steps by CLI (step IDs like "claude-skills")
  const cliList = selectedClis ?? []
  const cliStats = cliList.map(cli => {
    const cliSteps = steps.filter(s => s.id.startsWith(cli))
    const okCount  = cliSteps.filter(s => s.status === 'done' || s.status === 'skipped').length
    const errCount = cliSteps.filter(s => s.status === 'error').length
    return { cli, okCount, errCount, total: cliSteps.length }
  }).filter(s => s.total > 0)

  return (
    <Box flexDirection="column">
      {/* Title */}
      <Text bold color={errors.length > 0 ? theme.warning : theme.success}>
        {dryRun ? '○ Dry run complete' : '✓ Installation complete'}
        {elapsed && <Text color={theme.muted}>  Completed in {elapsed}</Text>}
      </Text>

      {/* Dry run note */}
      {dryRun && (
        <Box marginTop={1}>
          <Text color={theme.warning} bold>  No changes were made (dry run)</Text>
        </Box>
      )}

      {/* CLI summary */}
      {cliStats.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text color={theme.muted} bold>  Results by CLI:</Text>
          {cliStats.map(({ cli, okCount, errCount }) => (
            <Box key={cli}>
              <Text color={theme.muted}>    {cli}  </Text>
              <Text color={theme.success}>{okCount} ✓</Text>
              {errCount > 0 && <Text color={theme.error}>  {errCount} ✗</Text>}
            </Box>
          ))}
        </Box>
      )}

      {/* Totals */}
      <Box marginTop={1} flexDirection="column">
        <Text color={theme.success}>  ✓ {done} steps completed</Text>
        {errors.length > 0 && (
          <Box flexDirection="column">
            <Text color={theme.error}>  ✗ {errors.length} errors:</Text>
            {errors.map(e => (
              <Text key={e.id} color={theme.error}>    • {e.label}: {e.detail}</Text>
            ))}
          </Box>
        )}
      </Box>

      {/* Backup location */}
      {backupPath && (
        <Box marginTop={1}>
          <Text color={theme.muted}>  Backup saved to </Text>
          <Text color={theme.primary}>{backupPath}</Text>
        </Box>
      )}

      {/* Exit hint */}
      <Box marginTop={1}>
        <Text color={theme.muted} dimColor>Press Enter to exit</Text>
      </Box>
    </Box>
  )
}
