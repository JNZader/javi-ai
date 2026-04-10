/**
 * Skill packs — bundles of related skills installable as a unit via
 * a registry.yaml manifest. A pack groups skills by domain (e.g.,
 * "frontend", "sdd", "security") and resolves dependencies.
 *
 * Registry format (registry.yaml):
 *   packs:
 *     frontend:
 *       description: "Frontend development skills"
 *       skills: [react-19, nextjs-15, tailwind-4, zustand-5, typescript]
 *     sdd:
 *       description: "Spec-Driven Development pipeline"
 *       skills: [sdd-init, sdd-explore, sdd-propose, sdd-spec, sdd-design, sdd-tasks, sdd-apply, sdd-verify, sdd-archive, sdd-compact]
 */

import fs from "fs";
import path from "path";

// ── Types ──

export interface SkillPack {
	name: string;
	description: string;
	skills: string[];
	tags?: string[];
}

export interface PackRegistry {
	version: string;
	packs: Record<string, SkillPack>;
}

export interface PackResolution {
	pack: string;
	skills: string[];
	missing: string[]; // skills in pack but not found on disk
	available: string[]; // skills found and ready to install
}

// ── Parsing ──

/**
 * Parse a registry.yaml content string into a PackRegistry.
 * Uses a simple line-based YAML parser (no external deps).
 */
export function parseRegistry(content: string): PackRegistry {
	const registry: PackRegistry = { version: "1.0.0", packs: {} };
	const lines = content.split("\n");

	let currentPack: string | null = null;
	let currentField: string | null = null;

	for (const line of lines) {
		const trimmed = line.trimEnd();

		// Top-level: version
		if (trimmed.startsWith("version:")) {
			registry.version = trimmed.split(":")[1]!.trim().replace(/['"]/g, "");
			continue;
		}

		// Pack name (2-space indent)
		const packMatch = trimmed.match(/^ {2}(\w[\w-]*):\s*$/);
		if (packMatch) {
			currentPack = packMatch[1]!;
			registry.packs[currentPack] = {
				name: currentPack,
				description: "",
				skills: [],
			};
			currentField = null;
			continue;
		}

		if (!currentPack) continue;
		const pack = registry.packs[currentPack]!;

		// description field
		const descMatch = trimmed.match(/^\s+description:\s*['"]?(.+?)['"]?\s*$/);
		if (descMatch) {
			pack.description = descMatch[1]!;
			currentField = null;
			continue;
		}

		// skills as inline array: skills: [a, b, c]
		const inlineMatch = trimmed.match(/^\s+skills:\s*\[(.+)\]\s*$/);
		if (inlineMatch) {
			pack.skills = inlineMatch[1]!
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
			currentField = null;
			continue;
		}

		// skills as block array header
		if (trimmed.match(/^\s+skills:\s*$/)) {
			currentField = "skills";
			continue;
		}

		// tags as inline array
		const tagsMatch = trimmed.match(/^\s+tags:\s*\[(.+)\]\s*$/);
		if (tagsMatch) {
			pack.tags = tagsMatch[1]!
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
			currentField = null;
			continue;
		}

		// Block array items
		const itemMatch = trimmed.match(/^\s+-\s+(.+)$/);
		if (itemMatch && currentField === "skills") {
			pack.skills.push(itemMatch[1]!.trim());
		}
	}

	return registry;
}

// ── Resolution ──

export function resolvePack(
	registry: PackRegistry,
	packName: string,
	skillsDir: string,
): PackResolution | null {
	const pack = registry.packs[packName];
	if (!pack) return null;

	const available: string[] = [];
	const missing: string[] = [];

	for (const skill of pack.skills) {
		const skillPath = path.join(skillsDir, skill, "SKILL.md");
		if (fs.existsSync(skillPath)) {
			available.push(skill);
		} else {
			missing.push(skill);
		}
	}

	return {
		pack: packName,
		skills: pack.skills,
		missing,
		available,
	};
}

export function listPacks(registry: PackRegistry): Array<{
	name: string;
	description: string;
	skillCount: number;
}> {
	return Object.values(registry.packs).map((p) => ({
		name: p.name,
		description: p.description,
		skillCount: p.skills.length,
	}));
}

// ── File I/O ──

export function loadRegistry(registryPath: string): PackRegistry | null {
	if (!fs.existsSync(registryPath)) return null;
	try {
		const content = fs.readFileSync(registryPath, "utf-8");
		return parseRegistry(content);
	} catch {
		return null;
	}
}

export function saveRegistry(
	registryPath: string,
	registry: PackRegistry,
): void {
	const lines: string[] = [];
	lines.push(`version: "${registry.version}"`);
	lines.push("packs:");
	for (const [name, pack] of Object.entries(registry.packs)) {
		lines.push(`  ${name}:`);
		lines.push(`    description: "${pack.description}"`);
		lines.push(`    skills: [${pack.skills.join(", ")}]`);
		if (pack.tags?.length) {
			lines.push(`    tags: [${pack.tags.join(", ")}]`);
		}
	}
	fs.writeFileSync(registryPath, lines.join("\n") + "\n");
}

// ── Multi-mode skills ──

export interface SkillMode {
	name: string;
	description: string;
	trigger?: string;
}

export interface MultiModeSkill {
	name: string;
	modes: SkillMode[];
	defaultMode: string;
}

export function parseSkillModes(frontmatterModes: unknown): SkillMode[] {
	if (!Array.isArray(frontmatterModes)) return [];
	return frontmatterModes
		.filter(
			(m): m is Record<string, string> => typeof m === "object" && m !== null,
		)
		.map((m) => ({
			name: m.name ?? "default",
			description: m.description ?? "",
			trigger: m.trigger,
		}));
}

export function resolveMode(
	modes: SkillMode[],
	requested: string,
): SkillMode | null {
	return modes.find((m) => m.name === requested) ?? null;
}
