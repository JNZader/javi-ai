import path from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import fs from "fs-extra";
import { buildAvailableSkillsMap } from "../installer/skills.js";
import type { SkillManifest } from "../types/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_ROOT = path.resolve(__dirname, "../../");

/**
 * List all available skills grouped by source layer.
 * Reuses buildAvailableSkillsMap from the installer pipeline.
 */
export async function runList(): Promise<void> {
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
	const ownSkills = path.join(ASSETS_ROOT, "own", "skills");

	const available = await buildAvailableSkillsMap(
		atlSkills,
		gsSkills,
		deltaOverrides,
		ownSkills,
	);

	if (available.size === 0) {
		console.log(chalk.gray("No skills found."));
		return;
	}

	// Group by source
	const groups: Record<string, SkillManifest[]> = {
		upstream: [],
		delta: [],
		own: [],
	};

	for (const manifest of available.values()) {
		const group = groups[manifest.source];
		if (group) {
			group.push(manifest);
		}
	}

	console.log(chalk.bold(`\nAvailable skills (${available.size}):\n`));

	for (const [source, skills] of Object.entries(groups)) {
		if (skills.length === 0) continue;

		const label =
			source === "upstream"
				? "Upstream"
				: source === "delta"
					? "Delta (overrides)"
					: "Own";

		console.log(chalk.underline(`${label} (${skills.length}):`));

		for (const skill of skills.sort((a, b) => a.name.localeCompare(b.name))) {
			const deps =
				skill.dependencies && skill.dependencies.length > 0
					? chalk.gray(` [deps: ${skill.dependencies.join(", ")}]`)
					: "";
			console.log(`  ${chalk.cyan(skill.name)}${deps}`);
		}
		console.log();
	}
}
