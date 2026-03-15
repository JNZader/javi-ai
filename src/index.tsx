#!/usr/bin/env node
import React from 'react'
import { render } from 'ink'
import meow from 'meow'
import App from './ui/App.js'
import Doctor from './ui/Doctor.js'
import Update from './ui/Update.js'
import Uninstall from './ui/Uninstall.js'
import Sync from './ui/Sync.js'
import type { CLI, SyncTarget, SyncMode } from './types/index.js'

const cli = meow(`
  Usage
    $ javi-ai [command] [options]

  Commands
    install     Install AI development layer (default)
    doctor      Show health report of current installation
    update      Re-install configured CLIs with fresh assets
    uninstall   Remove javi-ai managed files
    sync        Compile .ai-config/ into per-CLI config files

  Options
    --dry-run       Preview without making changes
    --cli           Comma-separated list of CLIs (claude,opencode,gemini,qwen,codex,copilot)
    --version       Show version
    --help          Show this help

  Sync Options
    --target        CLI target: claude, opencode, gemini, codex, copilot, all (default: all)
    --mode          Sync mode: overwrite, merge (default: overwrite)
    --project-dir   Project directory to sync (default: .)

  Examples
    $ javi-ai
    $ javi-ai install --dry-run
    $ javi-ai install --cli claude,opencode
    $ javi-ai doctor
    $ javi-ai update
    $ javi-ai uninstall
    $ javi-ai sync
    $ javi-ai sync --target claude
    $ javi-ai sync --mode merge
    $ javi-ai sync --dry-run --project-dir /path/to/project
`, {
  importMeta: import.meta,
  flags: {
    dryRun: { type: 'boolean', default: false },
    cli: { type: 'string', default: '' },
    target: { type: 'string', default: 'all' },
    mode: { type: 'string', default: 'overwrite' },
    projectDir: { type: 'string', default: '.' },
  }
})

const subcommand = cli.input[0] ?? 'install'

switch (subcommand) {
  case 'doctor': {
    render(<Doctor />)
    break
  }

  case 'update': {
    render(<Update dryRun={cli.flags.dryRun} />)
    break
  }

  case 'uninstall': {
    render(<Uninstall />)
    break
  }

  case 'sync': {
    render(
      <Sync
        options={{
          target: cli.flags.target as SyncTarget,
          mode: cli.flags.mode as SyncMode,
          projectDir: cli.flags.projectDir,
          dryRun: cli.flags.dryRun,
        }}
      />
    )
    break
  }

  case 'install':
  default: {
    const preselectedClis = cli.flags.cli
      ? (cli.flags.cli.split(',').map(s => s.trim()) as CLI[])
      : undefined

    render(<App dryRun={cli.flags.dryRun} preselectedClis={preselectedClis} />)
    break
  }
}
