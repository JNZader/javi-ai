import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { BACKUP_DIR, CLI_OPTIONS } from "../constants.js";
import { mergeJsonFile } from "../merger/json.js";
import { mergeMarkdownFile } from "../merger/markdown.js";
import type { CLI, InstallOptions, InstallStep } from "../types/index.js";
import { readManifest, writeManifest } from "./manifest.js";
import { installPluginsForCLI } from "./plugins.js";
import { installSkillsForCLI } from "./skills.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_ROOT = path.resolve(__dirname, "../../");

const GATE_ONLY_CLIS: readonly CLI[] = ["agy", "grok", "pi"];

function isGateOnlyCli(cli: CLI): boolean {
	return GATE_ONLY_CLIS.includes(cli);
}

const CONFIG_DESTINATION_OVERRIDES: Partial<
	Record<CLI, Record<string, string>>
> = {
	codex: {
		"codex-config.toml": "config.toml",
	},
	gemini: {
		"gemini-settings.json": "settings.json",
	},
	copilot: {
		"base-rules.instructions.md": path.join(
			"instructions",
			"base-rules.instructions.md",
		),
		"sdd-orchestrator.instructions.md": path.join(
			"instructions",
			"sdd-orchestrator.instructions.md",
		),
		"sdd-orchestrator-copilot.md": path.join("agents", "sdd-orchestrator.md"),
	},
};

function resolveConfigDestination(cli: CLI, file: string): string {
	return CONFIG_DESTINATION_OVERRIDES[cli]?.[file] ?? file;
}

export async function runInstall(
	options: InstallOptions,
	onStep: (step: InstallStep) => void,
): Promise<void> {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const backupDir = path.join(BACKUP_DIR, timestamp);

	for (const cli of options.clis) {
		const cliOption = CLI_OPTIONS.find((c) => c.id === cli);
		if (!cliOption) continue;

		const gateOnly = isGateOnlyCli(cli);
		const wantsGate =
			options.features.includes("hooks") ||
			options.features.includes("plugins");

		// Skills
		if (options.features.includes("skills") && !gateOnly) {
			onStep({
				id: `${cli}-skills`,
				label: `Installing skills for ${cliOption.label}`,
				status: "running",
			});
			try {
				const installed = await installSkillsForCLI(
					cli,
					options.dryRun,
					options.skillFilter,
				);
				onStep({
					id: `${cli}-skills`,
					label: `Skills for ${cliOption.label}`,
					status: "done",
					detail: `${installed.length} skills`,
				});
			} catch (e) {
				onStep({
					id: `${cli}-skills`,
					label: `Skills for ${cliOption.label}`,
					status: "error",
					detail: String(e),
				});
			}
		}

		// Configs
		if (options.features.includes("configs") && !gateOnly) {
			onStep({
				id: `${cli}-configs`,
				label: `Installing config for ${cliOption.label}`,
				status: "running",
			});
			try {
				await installConfig(
					cli,
					cliOption.configPath,
					backupDir,
					options.dryRun,
				);
				onStep({
					id: `${cli}-configs`,
					label: `Config for ${cliOption.label}`,
					status: "done",
				});
			} catch (e) {
				onStep({
					id: `${cli}-configs`,
					label: `Config for ${cliOption.label}`,
					status: "error",
					detail: String(e),
				});
			}
		}

		// Hooks (claude) or PreToolUse gate (agy/grok/pi)
		if (
			(cli === "claude" && options.features.includes("hooks")) ||
			(gateOnly && wantsGate)
		) {
			onStep({
				id: `${cli}-hooks`,
				label: `Installing hooks for ${cliOption.label}`,
				status: "running",
			});
			try {
				await installHooks(
					cli,
					cliOption.configPath,
					cliOption.pluginsPath,
					options.dryRun,
				);
				onStep({
					id: `${cli}-hooks`,
					label: `Hooks for ${cliOption.label}`,
					status: "done",
				});
			} catch (e) {
				onStep({
					id: `${cli}-hooks`,
					label: `Hooks for ${cliOption.label}`,
					status: "error",
					detail: String(e),
				});
			}
		}

		// Plugins
		if (options.features.includes("plugins") && !gateOnly) {
			onStep({
				id: `${cli}-plugins`,
				label: `Installing plugins for ${cliOption.label}`,
				status: "running",
			});
			try {
				const installed = await installPluginsForCLI(cli, options.dryRun);
				onStep({
					id: `${cli}-plugins`,
					label: `Plugins for ${cliOption.label}`,
					status: "done",
					detail: `${installed.length} plugins`,
				});
			} catch (e) {
				onStep({
					id: `${cli}-plugins`,
					label: `Plugins for ${cliOption.label}`,
					status: "error",
					detail: String(e),
				});
			}
		}

		// Orchestrators
		if (options.features.includes("orchestrators") && !gateOnly) {
			onStep({
				id: `${cli}-orch`,
				label: `Installing orchestrators for ${cliOption.label}`,
				status: "running",
			});
			try {
				await installOrchestrators(cli, cliOption.configPath, options.dryRun);
				onStep({
					id: `${cli}-orch`,
					label: `Orchestrators for ${cliOption.label}`,
					status: "done",
				});
			} catch (e) {
				onStep({
					id: `${cli}-orch`,
					label: `Orchestrators for ${cliOption.label}`,
					status: "error",
					detail: String(e),
				});
			}
		}
	}

	// Update manifest
	if (!options.dryRun) {
		const manifest = await readManifest();
		manifest.updatedAt = new Date().toISOString();
		manifest.clis = [...new Set([...manifest.clis, ...options.clis])];
		if (options.autonomyLevel) {
			manifest.autonomyLevel = options.autonomyLevel;
		}
		await writeManifest(manifest);
	}
}

async function installConfig(
	cli: CLI,
	configPath: string,
	backupDir: string,
	dryRun: boolean,
): Promise<void> {
	const configSrc = path.join(ASSETS_ROOT, "configs", cli);
	if (!(await fs.pathExists(configSrc))) return;

	if (!dryRun) {
		await fs.ensureDir(configPath);
		await fs.ensureDir(backupDir);
	}

	const files = (await fs.readdir(configSrc, { recursive: true })) as string[];
	for (const file of files) {
		const src = path.join(configSrc, file);
		const stat = await fs.stat(src);
		if (stat.isDirectory()) continue;

		const destinationFile = resolveConfigDestination(cli, file);
		const dest = path.join(configPath, destinationFile);
		const backup = path.join(backupDir, cli, destinationFile);

		if (dryRun) continue;

		await fs.ensureDir(path.dirname(dest));

		if (file.endsWith(".json")) {
			await mergeJsonFile(
				dest,
				src,
				(await fs.pathExists(dest)) ? backup : undefined,
			);
		} else if (file.endsWith(".md") && file !== "README.md") {
			await mergeMarkdownFile(
				dest,
				src,
				(await fs.pathExists(dest)) ? backup : undefined,
			);
		} else {
			// create-if-absent for other files
			if (!(await fs.pathExists(dest))) {
				await fs.copy(src, dest);
			}
		}
	}
}

const OVERWRITE_HOOK_FILES = new Set([
	"security-guard.sh",
	"pretooluse-runtime.mjs",
	"evaluate-pretooluse.mjs",
]);

async function installHooks(
	cli: CLI,
	configPath: string,
	pluginsPath: string,
	dryRun: boolean,
): Promise<void> {
	if (cli === "agy") {
		await copyGateDirectory(
			path.join(ASSETS_ROOT, "own", "agy-plugins", "pretooluse-gate"),
			path.join(pluginsPath, "pretooluse-gate"),
			dryRun,
		);
		return;
	}
	if (cli === "grok") {
		await copyGateDirectory(
			path.join(ASSETS_ROOT, "own", "grok-plugins", "pretooluse-gate"),
			path.join(pluginsPath, "pretooluse-gate"),
			dryRun,
		);
		return;
	}
	if (cli === "pi") {
		await installPiGate(pluginsPath, dryRun);
		return;
	}
	if (cli !== "claude") return;

	const hooksSrc = path.join(ASSETS_ROOT, "own", "hooks", "claude");
	const hooksDest = path.join(configPath, "hooks");
	if (!(await fs.pathExists(hooksSrc))) return;
	if (dryRun) return;
	await fs.ensureDir(hooksDest);
	const files = await fs.readdir(hooksSrc);
	for (const file of files) {
		const dest = path.join(hooksDest, file);
		const shouldOverwrite = OVERWRITE_HOOK_FILES.has(file);
		if (shouldOverwrite || !(await fs.pathExists(dest))) {
			await fs.copy(path.join(hooksSrc, file), dest);
			await fs.chmod(dest, 0o755);
		}
	}
}

async function copyGateDirectory(
	src: string,
	dest: string,
	dryRun: boolean,
): Promise<void> {
	if (!(await fs.pathExists(src))) return;
	if (dryRun) return;
	await fs.copy(src, dest, { overwrite: true });
}

async function installPiGate(
	pluginsPath: string,
	dryRun: boolean,
): Promise<void> {
	const srcDir = path.join(ASSETS_ROOT, "own", "pi-extensions");
	if (!(await fs.pathExists(srcDir))) return;
	if (dryRun) return;
	await fs.ensureDir(pluginsPath);
	for (const file of ["pretooluse-gate.ts", "evaluate-pretooluse.mjs"]) {
		const src = path.join(srcDir, file);
		if (!(await fs.pathExists(src))) continue;
		await fs.copy(src, path.join(pluginsPath, file), { overwrite: true });
	}
}

async function installOrchestrators(
	cli: CLI,
	configPath: string,
	dryRun: boolean,
): Promise<void> {
	const orchSrc = path.join(ASSETS_ROOT, "delta", "orchestrators", cli);
	if (!(await fs.pathExists(orchSrc))) return;
	if (dryRun) return;
	const agentsDest =
		cli === "opencode"
			? path.join(configPath, "agents")
			: path.join(configPath, "agents", cli);
	await fs.ensureDir(agentsDest);
	await fs.copy(orchSrc, agentsDest, { overwrite: true });
}
