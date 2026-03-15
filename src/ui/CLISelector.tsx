import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import { CLI_OPTIONS } from '../constants.js'
import type { CLI } from '../types/index.js'
import { theme } from './theme.js'

interface Props {
  onConfirm: (clis: CLI[]) => void
}

export default function CLISelector({ onConfirm }: Props) {
  const [cursor, setCursor] = useState(0)
  const [selected, setSelected] = useState<Set<CLI>>(new Set(['claude']))

  useInput((input, key) => {
    if (key.upArrow)   setCursor(c => Math.max(0, c - 1))
    if (key.downArrow) setCursor(c => Math.min(CLI_OPTIONS.length - 1, c + 1))
    if (input === ' ') {
      const cli = CLI_OPTIONS[cursor].id
      setSelected(prev => {
        const next = new Set(prev)
        next.has(cli) ? next.delete(cli) : next.add(cli)
        return next
      })
    }
    if (key.return && selected.size > 0) {
      onConfirm([...selected])
    }
  })

  return (
    <Box flexDirection="column">
      <Text bold>Select AI CLIs to configure:</Text>

      {/* Left-bordered list */}
      <Box
        marginTop={1}
        flexDirection="column"
        borderStyle="single"
        borderLeft
        borderRight={false}
        borderTop={false}
        borderBottom={false}
        borderColor={theme.muted}
        paddingLeft={1}
      >
        {CLI_OPTIONS.map((cli, i) => (
          <Box key={cli.id}>
            <Text color={i === cursor ? theme.primary : 'white'}>
              {i === cursor ? '▶ ' : '  '}
              {selected.has(cli.id) ? '◉' : '○'} {cli.label}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Count + hints */}
      <Box marginTop={1} gap={2}>
        <Text color={selected.size > 0 ? theme.accent : theme.muted}>
          {selected.size} selected
        </Text>
        <Text color={theme.muted} dimColor>
          ↑↓ navigate  Space select  Enter confirm
        </Text>
      </Box>
    </Box>
  )
}
