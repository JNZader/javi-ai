import os from 'os'
import path from 'path'
import type { CLIOption } from './types/index.js'

export const HOME = os.homedir()

export const CLI_OPTIONS: CLIOption[] = [
  {
    id: 'claude',
    label: 'Claude Code',
    configPath: path.join(HOME, '.claude'),
    skillsPath: path.join(HOME, '.claude', 'skills'),
    pluginsPath: path.join(HOME, '.claude', 'plugins'),
    available: true,
  },
  {
    id: 'opencode',
    label: 'OpenCode',
    configPath: path.join(HOME, '.config', 'opencode'),
    skillsPath: path.join(HOME, '.config', 'opencode', 'skill'),
    pluginsPath: path.join(HOME, '.config', 'opencode', 'plugins'),
    available: true,
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    configPath: path.join(HOME, '.gemini'),
    skillsPath: path.join(HOME, '.gemini', 'skills'),
    pluginsPath: path.join(HOME, '.gemini', 'plugins'),
    available: true,
  },
  {
    id: 'qwen',
    label: 'Qwen',
    configPath: path.join(HOME, '.qwen'),
    skillsPath: path.join(HOME, '.qwen', 'skills'),
    pluginsPath: path.join(HOME, '.qwen', 'plugins'),
    available: true,
  },
  {
    id: 'codex',
    label: 'Codex CLI',
    configPath: path.join(HOME, '.codex'),
    skillsPath: path.join(HOME, '.codex', 'skills'),
    pluginsPath: path.join(HOME, '.codex', 'plugins'),
    available: true,
  },
  {
    id: 'copilot',
    label: 'GitHub Copilot',
    configPath: path.join(HOME, '.copilot'),
    skillsPath: path.join(HOME, '.copilot', 'skills'),
    pluginsPath: path.join(HOME, '.copilot', 'plugins'),
    available: true,
  },
]

export const MANIFEST_PATH = path.join(HOME, '.javi-ai', 'manifest.json')
export const BACKUP_DIR = path.join(HOME, '.javi-ai', 'backups')

export const MARKER_START = '<!-- BEGIN JAVI-AI -->'
export const MARKER_END = '<!-- END JAVI-AI -->'

// --- Sync constants ---

export const AI_CONFIG_DIR_NAME = '.ai-config'

export const AI_CLI_CONFIG_FILES: Record<string, string> = {
  claude:   'CLAUDE.md',
  opencode: 'AGENTS.md',
  gemini:   'GEMINI.md',
  codex:    'CODEX.md',
  copilot:  '.github/copilot-instructions.md',
}

export const SYNC_TARGETS = ['claude', 'opencode', 'gemini', 'codex', 'copilot'] as const
