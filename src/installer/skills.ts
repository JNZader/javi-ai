import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { CLI_OPTIONS } from "../constants.js";
import { parseFrontmatter } from "../lib/frontmatter.js";
import type { CLI, SkillManifest } from "../types/index.js";
import {
	CircularDependencyError,
	resolveDependencyOrder,
} from "./dependency-resolver.js";
import { detectFormat } from "./plugins.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_ROOT = path.resolve(__dirname, "../../");

// Layer priority (lowest → highest):
//   upstream/agent-teams-lite → upstream/gentleman-skills → delta/overrides → delta/extensions → own
//
// For each upstream skill:
//   1. Read SKILL.md from upstream source
//   2. If delta/overrides/{skill}/SKILL.md exists → use that instead
//   3. If delta/extensions/{skill}/EXTENSION.md exists → append to final content
// Own skills always win (copy entire directory, overwriting upstream).

/**
 * Read the dependencies field from a SKILL.md file, if present.
 */
async function readSkillDependencies(skillMdPath: string): Promise<string[]> {
	try {
		const raw = await fs.readFile(skillMdPath, "utf-8");
		const fm = parseFrontmatter(raw);
		if (!fm) return [];
		const deps = fm.data.dependencies;
		if (Array.isArray(deps)) return deps;
		return [];
	} catch {
		return [];
	}
}

/**
 * Collect all available skill names and their manifests from all source layers.
 * Used to build the dependency graph before installation.
 */
async function buildAvailableSkillsMap(
	atlSkills: string,
	gsSkills: string,
	deltaOverrides: string,
	ownSkills: string,
): Promise<Map<string, SkillManifest>> {
	const available = new Map<string, SkillManifest>();

	const addFromDir = async (
		dir: string,
		source: "upstream" | "delta" | "own",
	) => {
		if (!(await fs.pathExists(dir))) return;
		const dirs = await fs.readdir(dir);
		for (const skillDir of dirs) {
			if (skillDir.startsWith(".") || skillDir === "_shared") continue;
			const skillPath = path.join(dir, skillDir);
			const stat = await fs.stat(skillPath).catch(() => null);
			if (!stat?.isDirectory()) continue;

			const format = await detectFormat(skillPath);
			if (format === "plugin") continue;

			const skillMd = path.join(skillPath, "SKILL.md");
			const deps = (await fs.pathExists(skillMd))
				? await readSkillDependencies(skillMd)
				: [];

			available.set(skillDir, {
				name: skillDir,
				version: "0",
				source,
				installedAt: new Date().toISOString(),
				dependencies: deps,
			});
		}
	};

	await addFromDir(atlSkills, "upstream");
	await addFromDir(gsSkills, "upstream");
	// delta/overrides may add dependencies on top of upstream
	await addFromDir(deltaOverrides, "delta");
	await addFromDir(ownSkills, "own");

	return available;
}

async function installSkillsForCLI(
	cli: CLI,
	dryRun: boolean,
): Promise<string[]> {
	const cliOption = CLI_OPTIONS.find((c) => c.id === cli);
	if (!cliOption) return [];

	const installed: string[] = [];
	const dest = cliOption.skillsPath;

	// Source directories
	const atlSkills = path.join(
		ASSETS_ROOT,
		"upstream",
		"agent-teams-lite",
		"skills",
	);
	const gsSkills = path.join(
		ASSETS_ROOT,
		"upstream",
		"gentleman-skills",
		"curated",
	);
	const deltaOverrides = path.join(ASSETS_ROOT, "delta", "overrides");
	const deltaExtensions = path.join(ASSETS_ROOT, "delta", "extensions");
	const ownSkills = path.join(ASSETS_ROOT, "own", "skills");

	if (!dryRun) {
		await fs.ensureDir(dest);
	}

	// ── Resolve dependency order ───────────────────────────────────────────
	const availableSkills = await buildAvailableSkillsMap(
		atlSkills,
		gsSkills,
		deltaOverrides,
		ownSkills,
	);
	const allSkillNames = [...availableSkills.keys()];

	let orderedSkills: string[];
	try {
		const result = resolveDependencyOrder(allSkillNames, availableSkills);
		if (result.missing.length > 0) {
			for (const missing of result.missing) {
				console.warn(
					`[javi-ai] Warning: dependency "${missing}" not found — skipping`,
				);
			}
		}
		orderedSkills = result.ordered;
	} catch (err) {
		if (err instanceof CircularDependencyError) {
			console.error(`[javi-ai] Error: ${err.message}`);
			console.error(
				"[javi-ai] Aborting skill installation due to circular dependency.",
			);
			return [];
		}
		throw err;
	}

	// ── Helper: install a single upstream skill with delta layers ──────────
	async function installUpstreamSkill(
		skillDir: string,
		skillPath: string,
	): Promise<void> {
		// Skip plugin-format directories — they're handled by installPluginsForCLI
		const format = await detectFormat(skillPath);
		if (format === "plugin") return;

		const skillMd = path.join(skillPath, "SKILL.md");
		const hasSkillMd = await fs.pathExists(skillMd);

		const destDir = path.join(dest, skillDir);
		if (!dryRun) {
			const destStat = await fs.lstat(destDir).catch(() => null);
			if (destStat?.isSymbolicLink()) await fs.remove(destDir);

			if (hasSkillMd) {
				// Single SKILL.md skill — apply delta layers
				const overrideMd = path.join(deltaOverrides, skillDir, "SKILL.md");
				const hasOverride = await fs.pathExists(overrideMd);
				const extensionMd = path.join(
					deltaExtensions,
					skillDir,
					"EXTENSION.md",
				);
				const hasExtension = await fs.pathExists(extensionMd);

				await fs.ensureDir(destDir);
				let content = await fs.readFile(
					hasOverride ? overrideMd : skillMd,
					"utf-8",
				);
				if (hasExtension) {
					const ext = await fs.readFile(extensionMd, "utf-8");
					content = `${content}\n\n---\n\n${ext}`;
				}
				await fs.writeFile(path.join(destDir, "SKILL.md"), content, "utf-8");

				// Copy references/ subdirectory if present (deep context files loaded on-demand)
				const refsDir = path.join(skillPath, "references");
				if (await fs.pathExists(refsDir)) {
					await fs.copy(refsDir, path.join(destDir, "references"), {
						overwrite: true,
					});
				}
			} else {
				// Multi-file skill (e.g. angular/) — copy entire directory
				await fs.copy(skillPath, destDir, { overwrite: true });
			}
		}
		installed.push(skillDir);
	}

	// ── Build lookup maps for each layer ──────────────────────────────────
	const atlSkillPaths = new Map<string, string>();
	if (await fs.pathExists(atlSkills)) {
		const dirs = await fs.readdir(atlSkills);
		for (const skillDir of dirs) {
			if (skillDir.startsWith(".") || skillDir === "_shared") continue;
			const skillPath = path.join(atlSkills, skillDir);
			const stat = await fs.stat(skillPath).catch(() => null);
			if (stat?.isDirectory()) atlSkillPaths.set(skillDir, skillPath);
		}
	}

	const gsSkillPaths = new Map<string, string>();
	if (await fs.pathExists(gsSkills)) {
		const dirs = await fs.readdir(gsSkills);
		for (const skillDir of dirs) {
			if (skillDir.startsWith(".")) continue;
			const skillPath = path.join(gsSkills, skillDir);
			const stat = await fs.stat(skillPath).catch(() => null);
			if (stat?.isDirectory()) gsSkillPaths.set(skillDir, skillPath);
		}
	}

	const ownSkillPaths = new Map<string, string>();
	if (await fs.pathExists(ownSkills)) {
		const dirs = await fs.readdir(ownSkills);
		for (const skillDir of dirs) {
			if (skillDir.startsWith(".")) continue;
			const skillPath = path.join(ownSkills, skillDir);
			const format = await detectFormat(skillPath);
			if (format !== "plugin") ownSkillPaths.set(skillDir, skillPath);
		}
	}

	// ── Install in dependency-resolved order ──────────────────────────────
	const ownInstalled = new Set<string>();

	for (const skillDir of orderedSkills) {
		// own skills take highest priority
		if (ownSkillPaths.has(skillDir)) {
			const skillPath = ownSkillPaths.get(skillDir)!;
			const destDir = path.join(dest, skillDir);
			if (!dryRun) {
				const destStat = await fs.lstat(destDir).catch(() => null);
				if (destStat?.isSymbolicLink()) await fs.remove(destDir);
				await fs.copy(skillPath, destDir, { overwrite: true });
			}
			installed.push(skillDir);
			ownInstalled.add(skillDir);
			continue;
		}

		// upstream skills (ATL takes priority over GS — GS overwrites ATL in original code,
		// so GS wins; replicate: install ATL then GS for same skill)
		if (atlSkillPaths.has(skillDir)) {
			await installUpstreamSkill(skillDir, atlSkillPaths.get(skillDir)!);
		}
		if (gsSkillPaths.has(skillDir)) {
			await installUpstreamSkill(skillDir, gsSkillPaths.get(skillDir)!);
		}
	}

	// ── Layer 3: _shared conventions (from ATL) ────────────────────────────
	const sharedSrc = path.join(atlSkills, "_shared");
	if (await fs.pathExists(sharedSrc)) {
		const sharedDest = path.join(dest, "_shared");
		if (!dryRun) {
			await fs.ensureDir(sharedDest);
			await fs.copy(sharedSrc, sharedDest, { overwrite: true });
		}
		installed.push("_shared");
	}

	return installed;
}

export { installSkillsForCLI };
