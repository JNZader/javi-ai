import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import type { CLI } from '../types/index.js'
import { CLI_OPTIONS } from '../constants.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ASSETS_ROOT = path.resolve(__dirname, '../../')

// Priority order: psf (lowest) → upstream → own → delta-extensions (highest)
// Skills in upstream/ with EXTENSION.md get the extension appended
async function installSkillsForCLI(cli: CLI, dryRun: boolean): Promise<string[]> {
  const cliOption = CLI_OPTIONS.find(c => c.id === cli)
  if (!cliOption) return []

  const installed: string[] = []
  const skillsSource = path.join(ASSETS_ROOT, 'upstream', 'skills')
  const ownSkillsSource = path.join(ASSETS_ROOT, 'own', 'skills')
  const dest = cliOption.skillsPath

  if (!dryRun) {
    await fs.ensureDir(dest)
  }

  // Install upstream skills (+ append EXTENSION.md if exists)
  const skillDirs = await fs.readdir(skillsSource)
  for (const skillDir of skillDirs) {
    if (skillDir.startsWith('.') || skillDir === '_shared') continue
    const skillPath = path.join(skillsSource, skillDir)
    const stat = await fs.stat(skillPath)
    if (!stat.isDirectory()) continue

    const skillMd = path.join(skillPath, 'SKILL.md')
    const extensionMd = path.join(skillPath, 'EXTENSION.md')

    if (!await fs.pathExists(skillMd)) continue

    const destDir = path.join(dest, skillDir)
    if (!dryRun) {
      await fs.ensureDir(destDir)
      let content = await fs.readFile(skillMd, 'utf-8')
      // Append extension if exists
      if (await fs.pathExists(extensionMd)) {
        const ext = await fs.readFile(extensionMd, 'utf-8')
        content = `${content}\n\n---\n\n${ext}`
      }
      await fs.writeFile(path.join(destDir, 'SKILL.md'), content, 'utf-8')
    }
    installed.push(skillDir)
  }

  // Install _shared conventions
  const sharedSrc = path.join(skillsSource, '_shared')
  if (await fs.pathExists(sharedSrc)) {
    const sharedDest = path.join(dest, '_shared')
    if (!dryRun) {
      await fs.ensureDir(sharedDest)
      await fs.copy(sharedSrc, sharedDest, { overwrite: true })
    }
    installed.push('_shared')
  }

  // Install own skills
  if (await fs.pathExists(ownSkillsSource)) {
    const ownDirs = await fs.readdir(ownSkillsSource)
    for (const skillDir of ownDirs) {
      if (skillDir.startsWith('.')) continue
      const skillPath = path.join(ownSkillsSource, skillDir)
      const destDir = path.join(dest, skillDir)
      if (!dryRun) {
        await fs.copy(skillPath, destDir, { overwrite: true })
      }
      installed.push(skillDir)
    }
  }

  return installed
}

export { installSkillsForCLI }
