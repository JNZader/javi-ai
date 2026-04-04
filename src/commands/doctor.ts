import { execFile } from "child_process";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";
import { BACKUP_DIR, CLI_OPTIONS, MANIFEST_PATH } from "../constants.js";
import { readManifest } from "../installer/manifest.js";
import type { CLI } from "../types/index.js";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_ROOT = path.resolve(__dirname, "../../");

export type CheckStatus = "ok" | "fail" | "skip";

export interface DoctorCheck {
	label: string;
	status: CheckStatus;
	detail?: string;
}

export interface DoctorSection {
	title: string;
	checks: DoctorCheck[];
}

export interface DoctorResult {
	sections: DoctorSection[];
}

/** Resolve a binary name to its full path, returns null if not found */
async function which(bin: string): Promise<string | null> {
	try {
		const { stdout } = await execFileAsync("which", [bin]);
		return stdout.trim() || null;
	} catch {
		return null;
	}
}

/** Count skill dirs at a given path (only direct subdirectories with a SKILL.md) */
async function countInstalledSkills(skillsPath: string): Promise<number> {
	if (!(await fs.pathExists(skillsPath))) return 0;
	const entries = await fs.readdir(skillsPath);
	let count = 0;
	for (const entry of entries) {
		const skillMd = path.join(skillsPath, entry, "SKILL.md");
		if (await fs.pathExists(skillMd)) count++;
	}
	return count;
}

/** Count skills that javi-ai would install (upstream + own, deduped) */
async function countExpectedSkills(): Promise<number> {
	const upstreamSrc = path.join(ASSETS_ROOT, "upstream", "skills");
	const ownSrc = path.join(ASSETS_ROOT, "own", "skills");
	const names = new Set<string>();

	if (await fs.pathExists(upstreamSrc)) {
		const dirs = await fs.readdir(upstreamSrc);
		for (const d of dirs) {
			if (d.startsWith(".") || d === "_shared") continue;
			if (await fs.pathExists(path.join(upstreamSrc, d, "SKILL.md"))) {
				names.add(d);
			}
		}
	}

	if (await fs.pathExists(ownSrc)) {
		const dirs = await fs.readdir(ownSrc);
		for (const d of dirs) {
			if (!d.startsWith(".")) names.add(d);
		}
	}

	return names.size;
}

/** Config files that javi-ai manages per CLI */
const CONFIG_FILES: Array<{ cli: CLI; label: string; filePath: string }> = [
	{
		cli: "claude",
		label: "~/.claude/CLAUDE.md",
		filePath: path.join(process.env["HOME"] ?? "~", ".claude", "CLAUDE.md"),
	},
	{
		cli: "opencode",
		label: "~/.config/opencode/opencode.json",
		filePath: path.join(
			process.env["HOME"] ?? "~",
			".config",
			"opencode",
			"opencode.json",
		),
	},
	{
		cli: "gemini",
		label: "~/.gemini/GEMINI.md",
		filePath: path.join(process.env["HOME"] ?? "~", ".gemini", "GEMINI.md"),
	},
	{
		cli: "qwen",
		label: "~/.qwen/QWEN.md",
		filePath: path.join(process.env["HOME"] ?? "~", ".qwen", "QWEN.md"),
	},
	{
		cli: "codex",
		label: "~/.codex/AGENTS.md",
		filePath: path.join(process.env["HOME"] ?? "~", ".codex", "AGENTS.md"),
	},
	{
		cli: "copilot",
		label: "~/.copilot/COPILOT.md",
		filePath: path.join(process.env["HOME"] ?? "~", ".copilot", "COPILOT.md"),
	},
];

export async function runDoctor(): Promise<DoctorResult> {
	const manifest = await readManifest();
	const installedClis = new Set<CLI>(manifest.clis);
	const expectedSkills = await countExpectedSkills();
	const sections: DoctorSection[] = [];

	// ── 1. Installation ────────────────────────────────────────────────────────
	const installChecks: DoctorCheck[] = [];

	if (installedClis.size > 0) {
		installChecks.push({
			label: `Installed on ${manifest.installedAt.split("T")[0]}  (last updated: ${manifest.updatedAt.split("T")[0]})`,
			status: "ok",
		});
		installChecks.push({
			label: `CLIs configured: ${[...installedClis].join(", ")}`,
			status: "ok",
		});
	} else {
		installChecks.push({
			label: "No installation found",
			status: "fail",
			detail: "Run javi-ai to install",
		});
	}

	sections.push({ title: "Installation", checks: installChecks });

	// ── 2. CLI Detection ───────────────────────────────────────────────────────
	const cliChecks: DoctorCheck[] = [];
	for (const opt of CLI_OPTIONS) {
		const bin = await which(opt.id);
		if (!installedClis.has(opt.id)) {
			cliChecks.push({
				label: opt.id.padEnd(12),
				status: "skip",
				detail: "not installed via javi-ai",
			});
		} else if (bin) {
			cliChecks.push({
				label: opt.id.padEnd(12),
				status: "ok",
				detail: `found at ${bin}`,
			});
		} else {
			cliChecks.push({
				label: opt.id.padEnd(12),
				status: "fail",
				detail: "not found in PATH",
			});
		}
	}
	sections.push({ title: "CLI Detection", checks: cliChecks });

	// ── 3. Skills ──────────────────────────────────────────────────────────────
	const skillChecks: DoctorCheck[] = [];
	for (const cli of installedClis) {
		const opt = CLI_OPTIONS.find((c) => c.id === cli);
		if (!opt) continue;
		const present = await countInstalledSkills(opt.skillsPath);
		const ok = present >= expectedSkills;
		skillChecks.push({
			label: cli.padEnd(12),
			status: ok ? "ok" : "fail",
			detail: `${present}/${expectedSkills} skills present`,
		});
	}
	if (skillChecks.length === 0) {
		skillChecks.push({ label: "No CLIs installed", status: "skip" });
	}
	sections.push({ title: "Skills", checks: skillChecks });

	// ── 4. Config Files ────────────────────────────────────────────────────────
	const configChecks: DoctorCheck[] = [];
	for (const { cli, label, filePath } of CONFIG_FILES) {
		if (!installedClis.has(cli)) {
			configChecks.push({ label, status: "skip", detail: "not installed" });
		} else {
			const exists = await fs.pathExists(filePath);
			configChecks.push({
				label,
				status: exists ? "ok" : "fail",
				detail: exists ? "present" : "missing",
			});
		}
	}
	sections.push({ title: "Config Files", checks: configChecks });

	// ── 5. Hooks ───────────────────────────────────────────────────────────────
	const hookChecks: DoctorCheck[] = [];
	const hooksDir = path.join(process.env["HOME"] ?? "~", ".claude", "hooks");
	const hooksSrc = path.join(ASSETS_ROOT, "own", "hooks", "claude");

	if (installedClis.has("claude") && (await fs.pathExists(hooksSrc))) {
		const hookFiles = await fs.readdir(hooksSrc);
		for (const hookFile of hookFiles) {
			const hookPath = path.join(hooksDir, hookFile);
			if (!(await fs.pathExists(hookPath))) {
				hookChecks.push({
					label: hookFile,
					status: "fail",
					detail: "not found",
				});
			} else {
				try {
					await fs.access(hookPath, fs.constants.X_OK);
					hookChecks.push({
						label: hookFile,
						status: "ok",
						detail: "executable",
					});
				} catch {
					hookChecks.push({
						label: hookFile,
						status: "fail",
						detail: "not executable",
					});
				}
			}
		}
	}
	if (hookChecks.length === 0) {
		hookChecks.push({ label: "No hooks installed", status: "skip" });
	}
	sections.push({ title: "Hooks", checks: hookChecks });

	// ── 6. Backups ─────────────────────────────────────────────────────────────
	const backupChecks: DoctorCheck[] = [];
	if (await fs.pathExists(BACKUP_DIR)) {
		const backupDirs = (await fs.readdir(BACKUP_DIR)).sort().reverse();
		if (backupDirs.length === 0) {
			backupChecks.push({ label: "No backups found", status: "skip" });
		} else {
			for (const backup of backupDirs.slice(0, 5)) {
				const backupPath = path.join(BACKUP_DIR, backup);
				const files = await fs.readdir(backupPath, { recursive: true });
				const fileCount = (
					await Promise.all(
						files.map(async (f) => {
							const stat = await fs.stat(path.join(backupPath, String(f)));
							return stat.isFile() ? 1 : 0;
						}),
					)
				).reduce((a: number, b: number) => a + b, 0);
				backupChecks.push({
					label: backup
						.replace(/T(\d{2})-(\d{2})-(\d{2})/, "T$1:$2:$3")
						.slice(0, 19),
					status: "ok",
					detail: `${fileCount} files`,
				});
			}
			if (backupDirs.length > 5) {
				backupChecks.push({
					label: `... and ${backupDirs.length - 5} more`,
					status: "skip",
				});
			}
		}
	} else {
		backupChecks.push({ label: "No backup directory", status: "skip" });
	}
	sections.push({ title: "Backups", checks: backupChecks });

	return { sections };
}
