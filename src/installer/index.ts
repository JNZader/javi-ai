import path from 'path'
import fs from 'fs-extra'
import { fileURLToPath } from 'url'
import type { InstallOptions, InstallStep, CLI } from '../types/index.js'
import { CLI_OPTIONS, BACKUP_DIR } from '../constants.js'
import { installSkillsForCLI } from './skills.js'
import { mergeMarkdownFile } from '../merger/markdown.js'
import { mergeJsonFile } from '../merger/json.js'
import { readManifest, writeManifest } from './manifest.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ASSETS_ROOT = path.resolve(__dirname, '../../')

export async function runInstall(
  options: InstallOptions,
  onStep: (step: InstallStep) => void
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(BACKUP_DIR, timestamp)

  for (const cli of options.clis) {
    const cliOption = CLI_OPTIONS.find(c => c.id === cli)
    if (!cliOption) continue

    // Skills
    if (options.features.includes('skills')) {
      onStep({ id: `${cli}-skills`, label: `Installing skills for ${cliOption.label}`, status: 'running' })
      try {
        const installed = await installSkillsForCLI(cli, options.dryRun)
        onStep({ id: `${cli}-skills`, label: `Skills for ${cliOption.label}`, status: 'done', detail: `${installed.length} skills` })
      } catch (e) {
        onStep({ id: `${cli}-skills`, label: `Skills for ${cliOption.label}`, status: 'error', detail: String(e) })
      }
    }

    // Configs
    if (options.features.includes('configs')) {
      onStep({ id: `${cli}-configs`, label: `Installing config for ${cliOption.label}`, status: 'running' })
      try {
        await installConfig(cli, cliOption.configPath, backupDir, options.dryRun)
        onStep({ id: `${cli}-configs`, label: `Config for ${cliOption.label}`, status: 'done' })
      } catch (e) {
        onStep({ id: `${cli}-configs`, label: `Config for ${cliOption.label}`, status: 'error', detail: String(e) })
      }
    }

    // Hooks (claude only for now)
    if (options.features.includes('hooks') && cli === 'claude') {
      onStep({ id: `${cli}-hooks`, label: 'Installing hooks for Claude Code', status: 'running' })
      try {
        await installHooks(cliOption.configPath, options.dryRun)
        onStep({ id: `${cli}-hooks`, label: 'Hooks for Claude Code', status: 'done' })
      } catch (e) {
        onStep({ id: `${cli}-hooks`, label: 'Hooks for Claude Code', status: 'error', detail: String(e) })
      }
    }

    // Orchestrators
    if (options.features.includes('orchestrators')) {
      onStep({ id: `${cli}-orch`, label: `Installing orchestrators for ${cliOption.label}`, status: 'running' })
      try {
        await installOrchestrators(cli, cliOption.configPath, options.dryRun)
        onStep({ id: `${cli}-orch`, label: `Orchestrators for ${cliOption.label}`, status: 'done' })
      } catch (e) {
        onStep({ id: `${cli}-orch`, label: `Orchestrators for ${cliOption.label}`, status: 'error', detail: String(e) })
      }
    }
  }

  // Update manifest
  if (!options.dryRun) {
    const manifest = await readManifest()
    manifest.updatedAt = new Date().toISOString()
    manifest.clis = [...new Set([...manifest.clis, ...options.clis])]
    await writeManifest(manifest)
  }
}

async function installConfig(cli: CLI, configPath: string, backupDir: string, dryRun: boolean): Promise<void> {
  const configSrc = path.join(ASSETS_ROOT, 'configs', cli)
  if (!await fs.pathExists(configSrc)) return

  if (!dryRun) {
    await fs.ensureDir(configPath)
    await fs.ensureDir(backupDir)
  }

  const files = await fs.readdir(configSrc, { recursive: true }) as string[]
  for (const file of files) {
    const src = path.join(configSrc, file)
    const stat = await fs.stat(src)
    if (stat.isDirectory()) continue

    const dest = path.join(configPath, file)
    const backup = path.join(backupDir, cli, file)

    if (dryRun) continue

    await fs.ensureDir(path.dirname(dest))

    if (file.endsWith('.json')) {
      await mergeJsonFile(dest, src, await fs.pathExists(dest) ? backup : undefined)
    } else if (file.endsWith('.md') && file !== 'README.md') {
      await mergeMarkdownFile(dest, src, await fs.pathExists(dest) ? backup : undefined)
    } else {
      // create-if-absent for other files
      if (!await fs.pathExists(dest)) {
        await fs.copy(src, dest)
      }
    }
  }
}

async function installHooks(configPath: string, dryRun: boolean): Promise<void> {
  const hooksSrc = path.join(ASSETS_ROOT, 'own', 'hooks', 'claude')
  const hooksDest = path.join(configPath, 'hooks')
  if (!await fs.pathExists(hooksSrc)) return
  if (dryRun) return
  await fs.ensureDir(hooksDest)
  const files = await fs.readdir(hooksSrc)
  for (const file of files) {
    const dest = path.join(hooksDest, file)
    if (!await fs.pathExists(dest)) {
      await fs.copy(path.join(hooksSrc, file), dest)
      await fs.chmod(dest, 0o755)
    }
  }
}

async function installOrchestrators(cli: CLI, configPath: string, dryRun: boolean): Promise<void> {
  const orchSrc = path.join(ASSETS_ROOT, 'delta', 'orchestrators', cli)
  if (!await fs.pathExists(orchSrc)) return
  if (dryRun) return
  const agentsDest = cli === 'opencode'
    ? path.join(configPath, 'agents')
    : path.join(configPath, 'agents', cli)
  await fs.ensureDir(agentsDest)
  await fs.copy(orchSrc, agentsDest, { overwrite: true })
}
