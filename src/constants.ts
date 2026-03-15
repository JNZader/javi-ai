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
    available: true,
  },
  {
    id: 'opencode',
    label: 'OpenCode',
    configPath: path.join(HOME, '.config', 'opencode'),
    skillsPath: path.join(HOME, '.config', 'opencode', 'skill'),
    available: true,
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    configPath: path.join(HOME, '.gemini'),
    skillsPath: path.join(HOME, '.gemini', 'skills'),
    available: true,
  },
  {
    id: 'qwen',
    label: 'Qwen',
    configPath: path.join(HOME, '.qwen'),
    skillsPath: path.join(HOME, '.qwen', 'skills'),
    available: true,
  },
  {
    id: 'codex',
    label: 'Codex CLI',
    configPath: path.join(HOME, '.codex'),
    skillsPath: path.join(HOME, '.codex', 'skills'),
    available: true,
  },
  {
    id: 'copilot',
    label: 'GitHub Copilot',
    configPath: path.join(HOME, '.copilot'),
    skillsPath: path.join(HOME, '.copilot', 'skills'),
    available: true,
  },
]

export const MANIFEST_PATH = path.join(HOME, '.javi-ai', 'manifest.json')
export const BACKUP_DIR = path.join(HOME, '.javi-ai', 'backups')

export const MARKER_START = '<!-- BEGIN JAVI-AI -->'
export const MARKER_END = '<!-- END JAVI-AI -->'
