import fs from 'fs-extra'
import { MARKER_START, MARKER_END } from '../constants.js'

export async function mergeMarkdownFile(
  targetPath: string,
  sourcePath: string,
  backupPath?: string
): Promise<void> {
  const sourceContent = await fs.readFile(sourcePath, 'utf-8')
  const generated = `${MARKER_START}\n${sourceContent}\n${MARKER_END}`

  if (await fs.pathExists(targetPath)) {
    if (backupPath) {
      await fs.copy(targetPath, backupPath)
    }
    const targetContent = await fs.readFile(targetPath, 'utf-8')
    const startIdx = targetContent.indexOf(MARKER_START)
    const endIdx = targetContent.indexOf(MARKER_END)

    if (startIdx !== -1 && endIdx !== -1) {
      // replace between markers
      const before = targetContent.substring(0, startIdx)
      const after = targetContent.substring(endIdx + MARKER_END.length)
      await fs.writeFile(targetPath, `${before}${generated}${after}`, 'utf-8')
    } else {
      // append at end
      await fs.writeFile(targetPath, `${targetContent}\n\n${generated}\n`, 'utf-8')
    }
  } else {
    await fs.ensureDir(targetPath.substring(0, targetPath.lastIndexOf('/')))
    await fs.writeFile(targetPath, `${generated}\n`, 'utf-8')
  }
}
