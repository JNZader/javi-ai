import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { CLI_OPTIONS } from "../constants.js";
import type { CLI, PluginFormat, PluginManifest } from "../types/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_ROOT = path.resolve(__dirname, "../../");

/**
 * Detect whether a skill directory is a plugin (has manifest.json) or a legacy skill.
 */
export function detectFormat(dirPath: string): Promise<PluginFormat> {
	return fs
		.pathExists(path.join(dirPath, "manifest.json"))
		.then((exists) => (exists ? "plugin" : "legacy-skill"));
}

/**
 * Read and parse a plugin's manifest.json. Returns null if invalid or missing.
 */
export async function readPluginManifest(
	dirPath: string,
): Promise<PluginManifest | null> {
	const manifestPath = path.join(dirPath, "manifest.json");
	try {
		const raw = await fs.readFile(manifestPath, "utf-8");
		const parsed = JSON.parse(raw) as PluginManifest;
		if (!parsed.name || !parsed.version) return null;
		return parsed;
	} catch {
		return null;
	}
}

/**
 * Validate a plugin manifest has required fields.
 */
export function validatePluginManifest(manifest: PluginManifest): string[] {
	const errors: string[] = [];
	if (!manifest.name) errors.push("missing required field: name");
	if (!manifest.version) errors.push("missing required field: version");
	if (!manifest.description) errors.push("missing required field: description");
	if (manifest.dependencies && !Array.isArray(manifest.dependencies)) {
		errors.push("dependencies must be an array");
	}
	if (manifest.compatible_tools && !Array.isArray(manifest.compatible_tools)) {
		errors.push("compatible_tools must be an array");
	}
	if (manifest.triggers && !Array.isArray(manifest.triggers)) {
		errors.push("triggers must be an array");
	}
	return errors;
}

/**
 * Install a single plugin directory to the target plugins path.
 * Plugin structure:
 *   manifest.json  (required)
 *   SKILL.md       (instructions — required)
 *   commands/      (slash commands — optional)
 *   connectors/    (MCP tool defs — optional)
 *   references/    (deep context — optional)
 */
async function installPlugin(
	pluginSrcDir: string,
	destDir: string,
	pluginName: string,
	dryRun: boolean,
): Promise<boolean> {
	const manifest = await readPluginManifest(pluginSrcDir);
	if (!manifest) return false;

	const errors = validatePluginManifest(manifest);
	if (errors.length > 0) return false;

	if (!dryRun) {
		const pluginDest = path.join(destDir, pluginName);
		// Remove symlinks before copying
		const destStat = await fs.lstat(pluginDest).catch(() => null);
		if (destStat?.isSymbolicLink()) await fs.remove(pluginDest);
		await fs.copy(pluginSrcDir, pluginDest, { overwrite: true });
	}

	return true;
}

/**
 * Install all plugins for a given CLI from own/plugins source directory.
 * Returns list of installed plugin names.
 */
export async function installPluginsForCLI(
	cli: CLI,
	dryRun: boolean,
): Promise<string[]> {
	const cliOption = CLI_OPTIONS.find((c) => c.id === cli);
	if (!cliOption) return [];

	const installed: string[] = [];
	const dest = cliOption.pluginsPath;

	// Source directories for plugins
	const ownPlugins = path.join(ASSETS_ROOT, "own", "plugins");

	if (!dryRun) {
		await fs.ensureDir(dest);
	}

	// ── Own plugins (highest priority) ────────────────────────────────────
	if (await fs.pathExists(ownPlugins)) {
		const dirs = await fs.readdir(ownPlugins);
		for (const pluginDir of dirs) {
			if (pluginDir.startsWith(".")) continue;
			const pluginPath = path.join(ownPlugins, pluginDir);
			const stat = await fs.stat(pluginPath);
			if (!stat.isDirectory()) continue;

			const format = await detectFormat(pluginPath);
			if (format !== "plugin") continue;

			// Check CLI compatibility
			const manifest = await readPluginManifest(pluginPath);
			if (manifest?.compatible_tools && manifest.compatible_tools.length > 0) {
				if (!manifest.compatible_tools.includes(cli)) continue;
			}

			const success = await installPlugin(pluginPath, dest, pluginDir, dryRun);
			if (success) installed.push(pluginDir);
		}
	}

	return installed;
}

export { installPlugin };
