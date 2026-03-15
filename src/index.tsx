#!/usr/bin/env node
import React from 'react'
import { render } from 'ink'
import meow from 'meow'
import App from './ui/App.js'
import type { CLI } from './types/index.js'

const cli = meow(`
  Usage
    $ javi-ai [options]

  Options
    --dry-run     Preview what would be installed without making changes
    --cli         Comma-separated list of CLIs (claude,opencode,gemini,qwen,codex,copilot)
    --version     Show version
    --help        Show this help

  Examples
    $ javi-ai
    $ javi-ai --dry-run
    $ javi-ai --cli claude,opencode
`, {
  importMeta: import.meta,
  flags: {
    dryRun: { type: 'boolean', default: false },
    cli: { type: 'string', default: '' },
  }
})

const preselectedClis = cli.flags.cli
  ? (cli.flags.cli.split(',').map(s => s.trim()) as CLI[])
  : undefined

render(<App dryRun={cli.flags.dryRun} preselectedClis={preselectedClis} />)
