import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import {
	BACKUP_DIR,
	CLI_OPTIONS,
	MANIFEST_PATH,
	MARKER_END,
	MARKER_START,
} from "../constants.js";
import { readManifest } from "../installer/manifest.js";
import type { CLI } from "../types/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_ROOT = path.resolve(__dirname, "../../");

export interface UninstallItem {
	label: string;
	path: string;
	type: "skills-dir" | "config-section" | "hooks-dir" | "manifest";
	cli?: CLI;
}

export interface UninstallResult {
	removed: string[];
	restored: string[];
	errors: string[];
}

/** Build a list of what will be removed for preview and execution */
export async function buildUninstallPlan(): Promise<{
	clis: CLI[];
	items: UninstallItem[];
}> {
	const manifest = await readManifest();
	const clis: CLI[] = manifest.clis;
	const items: UninstallItem[] = [];

	for (const cli of clis) {
		const opt = CLI_OPTIONS.find((c) => c.id === cli);
		if (!opt) continue;

		// Skills dir
		if (await fs.pathExists(opt.skillsPath)) {
			items.push({
				label: `${opt.skillsPath.replace(process.env["HOME"] ?? "", "~")} (skills)`,
				path: opt.skillsPath,
				type: "skills-dir",
				cli,
			});
		}

		// Config files (only the javi-ai sections / files we created)
		const configSrc = path.join(ASSETS_ROOT, "configs", cli);
		if (await fs.pathExists(configSrc)) {
			const files = (await fs.readdir(configSrc, {
				recursive: true,
			})) as string[];
			for (const file of files) {
				const dest = path.join(opt.configPath, file);
				if (await fs.pathExists(dest)) {
					if (file.endsWith(".md") && file !== "README.md") {
						items.push({
							label: `${dest.replace(process.env["HOME"] ?? "", "~")} (remove javi-ai section)`,
							path: dest,
							type: "config-section",
							cli,
						});
					}
				}
			}
		}

		// Hooks (claude only)
		if (cli === "claude") {
			const hooksDir = path.join(opt.configPath, "hooks");
			if (await fs.pathExists(hooksDir)) {
				items.push({
					label: `${hooksDir.replace(process.env["HOME"] ?? "", "~")} (hooks)`,
					path: hooksDir,
					type: "hooks-dir",
					cli,
				});
			}
		}
	}

	// Manifest itself
	if (await fs.pathExists(MANIFEST_PATH)) {
		items.push({
			label: MANIFEST_PATH.replace(process.env["HOME"] ?? "", "~"),
			path: MANIFEST_PATH,
			type: "manifest",
		});
	}

	return { clis, items };
}

/** Find the most recent backup for a given CLI and file */
async function findLatestBackup(
	cli: string,
	relPath: string,
): Promise<string | null> {
	if (!(await fs.pathExists(BACKUP_DIR))) return null;
	const dirs = (await fs.readdir(BACKUP_DIR)).sort().reverse();
	for (const dir of dirs) {
		const candidate = path.join(BACKUP_DIR, dir, cli, relPath);
		if (await fs.pathExists(candidate)) return candidate;
	}
	return null;
}

/** Execute the uninstall plan */
export async function runUninstall(
	items: UninstallItem[],
): Promise<UninstallResult> {
	const removed: string[] = [];
	const restored: string[] = [];
	const errors: string[] = [];

	for (const item of items) {
		try {
			if (item.type === "manifest") {
				await fs.remove(item.path);
				removed.push(item.label);
				continue;
			}

			if (item.type === "skills-dir") {
				await fs.remove(item.path);
				removed.push(item.label);
				continue;
			}

			if (item.type === "hooks-dir") {
				// Only remove files that javi-ai installed (from own/hooks/claude)
				const hooksSrc = path.join(ASSETS_ROOT, "own", "hooks", "claude");
				if (await fs.pathExists(hooksSrc)) {
					const hookFiles = await fs.readdir(hooksSrc);
					for (const hookFile of hookFiles) {
						const hookPath = path.join(item.path, hookFile);
						if (await fs.pathExists(hookPath)) {
							await fs.remove(hookPath);
							removed.push(
								`${item.path.replace(process.env["HOME"] ?? "", "~")}/${hookFile}`,
							);
						}
					}
				}
				continue;
			}

			if (item.type === "config-section") {
				const cli = item.cli!;
				const opt = CLI_OPTIONS.find((c) => c.id === cli)!;
				const relPath = path.relative(opt.configPath, item.path);

				// Try to restore from backup first
				const backup = await findLatestBackup(cli, relPath);
				if (backup) {
					await fs.copy(backup, item.path, { overwrite: true });
					restored.push(`${item.label} (restored from backup)`);
				} else {
					// Remove only the javi-ai marker section
					const content = await fs.readFile(item.path, "utf-8");
					const startIdx = content.indexOf(MARKER_START);
					const endIdx = content.indexOf(MARKER_END);
					if (startIdx !== -1 && endIdx !== -1) {
						const before = content.substring(0, startIdx).trimEnd();
						const after = content
							.substring(endIdx + MARKER_END.length)
							.trimStart();
						const result = [before, after].filter(Boolean).join("\n\n");
						if (result.trim()) {
							await fs.writeFile(item.path, result + "\n", "utf-8");
							removed.push(`${item.label} (section removed)`);
						} else {
							await fs.remove(item.path);
							removed.push(
								`${item.label} (file removed — was only javi-ai content)`,
							);
						}
					} else {
						// File doesn't have markers — leave it alone
						removed.push(`${item.label} (skipped — no javi-ai markers found)`);
					}
				}
			}
		} catch (e) {
			errors.push(`${item.label}: ${String(e)}`);
		}
	}

	return { removed, restored, errors };
}
