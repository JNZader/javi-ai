import React from 'react'
import { Box, Text } from 'ink'
import { theme } from './theme.js'

interface Props {
  subtitle?: string
  dryRun?: boolean
}

const TITLE = '✦ javi-ai  AI development layer'

// Fixed inner width (characters between the box walls)
const BOX_WIDTH = 41

function pad(content: string): string {
  const len = [...content].length  // unicode-safe length
  const spaces = BOX_WIDTH - len
  return content + ' '.repeat(Math.max(0, spaces))
}

export default function Header({ subtitle, dryRun }: Props) {
  const top    = '╭' + '─'.repeat(BOX_WIDTH) + '╮'
  const bottom = '╰' + '─'.repeat(BOX_WIDTH) + '╯'
  const titleLine = pad('  ' + TITLE + '  ')
  const subLine   = subtitle ? pad('  ' + subtitle + '  ') : null

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={theme.muted}>{top}</Text>
      <Box>
        <Text color={theme.muted}>│</Text>
        <Text bold color={theme.primary}>{titleLine}</Text>
        <Text color={theme.muted}>│</Text>
      </Box>
      {subLine && (
        <Box>
          <Text color={theme.muted}>│</Text>
          <Text color={theme.muted}>{subLine}</Text>
          <Text color={theme.muted}>│</Text>
        </Box>
      )}
      <Text color={theme.muted}>{bottom}</Text>
      {dryRun && (
        <Text color={theme.warning}> [DRY RUN]</Text>
      )}
    </Box>
  )
}
