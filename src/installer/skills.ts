import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import type { CLI } from '../types/index.js'
import { CLI_OPTIONS } from '../constants.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ASSETS_ROOT = path.resolve(__dirname, '../../')

// Layer priority (lowest → highest):
//   upstream/agent-teams-lite → upstream/gentleman-skills → delta/overrides → delta/extensions → own
//
// For each upstream skill:
//   1. Read SKILL.md from upstream source
//   2. If delta/overrides/{skill}/SKILL.md exists → use that instead
//   3. If delta/extensions/{skill}/EXTENSION.md exists → append to final content
// Own skills always win (copy entire directory, overwriting upstream).

async function installSkillsForCLI(cli: CLI, dryRun: boolean): Promise<string[]> {
  const cliOption = CLI_OPTIONS.find(c => c.id === cli)
  if (!cliOption) return []

  const installed: string[] = []
  const dest = cliOption.skillsPath

  // Source directories
  const atlSkills = path.join(ASSETS_ROOT, 'upstream', 'agent-teams-lite', 'skills')
  const gsSkills = path.join(ASSETS_ROOT, 'upstream', 'gentleman-skills', 'curated')
  const deltaOverrides = path.join(ASSETS_ROOT, 'delta', 'overrides')
  const deltaExtensions = path.join(ASSETS_ROOT, 'delta', 'extensions')
  const ownSkills = path.join(ASSETS_ROOT, 'own', 'skills')

  if (!dryRun) {
    await fs.ensureDir(dest)
  }

  // ── Helper: install a single upstream skill with delta layers ──────────
  async function installUpstreamSkill(skillDir: string, skillPath: string): Promise<void> {
    const skillMd = path.join(skillPath, 'SKILL.md')
    const hasSkillMd = await fs.pathExists(skillMd)

    const destDir = path.join(dest, skillDir)
    if (!dryRun) {
      const destStat = await fs.lstat(destDir).catch(() => null)
      if (destStat?.isSymbolicLink()) await fs.remove(destDir)

      if (hasSkillMd) {
        // Single SKILL.md skill — apply delta layers
        const overrideMd = path.join(deltaOverrides, skillDir, 'SKILL.md')
        const hasOverride = await fs.pathExists(overrideMd)
        const extensionMd = path.join(deltaExtensions, skillDir, 'EXTENSION.md')
        const hasExtension = await fs.pathExists(extensionMd)

        await fs.ensureDir(destDir)
        let content = await fs.readFile(hasOverride ? overrideMd : skillMd, 'utf-8')
        if (hasExtension) {
          const ext = await fs.readFile(extensionMd, 'utf-8')
          content = `${content}\n\n---\n\n${ext}`
        }
        await fs.writeFile(path.join(destDir, 'SKILL.md'), content, 'utf-8')

        // Copy references/ subdirectory if present (deep context files loaded on-demand)
        const refsDir = path.join(skillPath, 'references')
        if (await fs.pathExists(refsDir)) {
          await fs.copy(refsDir, path.join(destDir, 'references'), { overwrite: true })
        }
      } else {
        // Multi-file skill (e.g. angular/) — copy entire directory
        await fs.copy(skillPath, destDir, { overwrite: true })
      }
    }
    installed.push(skillDir)
  }

  // ── Layer 1: agent-teams-lite skills ───────────────────────────────────
  if (await fs.pathExists(atlSkills)) {
    const dirs = await fs.readdir(atlSkills)
    for (const skillDir of dirs) {
      if (skillDir.startsWith('.') || skillDir === '_shared') continue
      const skillPath = path.join(atlSkills, skillDir)
      const stat = await fs.stat(skillPath)
      if (!stat.isDirectory()) continue
      await installUpstreamSkill(skillDir, skillPath)
    }
  }

  // ── Layer 2: gentleman-skills curated ──────────────────────────────────
  if (await fs.pathExists(gsSkills)) {
    const dirs = await fs.readdir(gsSkills)
    for (const skillDir of dirs) {
      if (skillDir.startsWith('.')) continue
      const skillPath = path.join(gsSkills, skillDir)
      const stat = await fs.stat(skillPath)
      if (!stat.isDirectory()) continue
      await installUpstreamSkill(skillDir, skillPath)
    }
  }

  // ── Layer 3: _shared conventions (from ATL) ────────────────────────────
  const sharedSrc = path.join(atlSkills, '_shared')
  if (await fs.pathExists(sharedSrc)) {
    const sharedDest = path.join(dest, '_shared')
    if (!dryRun) {
      await fs.ensureDir(sharedDest)
      await fs.copy(sharedSrc, sharedDest, { overwrite: true })
    }
    installed.push('_shared')
  }

  // ── Layer 4: own skills (highest priority, full directory copy) ────────
  if (await fs.pathExists(ownSkills)) {
    const dirs = await fs.readdir(ownSkills)
    for (const skillDir of dirs) {
      if (skillDir.startsWith('.')) continue
      const skillPath = path.join(ownSkills, skillDir)
      const destDir = path.join(dest, skillDir)
      if (!dryRun) {
        const destStat = await fs.lstat(destDir).catch(() => null)
        if (destStat?.isSymbolicLink()) await fs.remove(destDir)
        await fs.copy(skillPath, destDir, { overwrite: true })
      }
      installed.push(skillDir)
    }
  }

  return installed
}

export { installSkillsForCLI }
