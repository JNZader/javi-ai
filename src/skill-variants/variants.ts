import fs from "fs-extra";
import path from "path";
import { parseFrontmatter } from "../lib/frontmatter.js";

export interface SkillVariantInfo {
	name: string;
	description: string;
	isDefault: boolean;
	filePath: string;
}

export interface VariantResolution {
	skillName: string;
	variant: string;
	content: string;
	source: string;
}

/**
 * List all available variants for a skill directory.
 *
 * Variants are stored in `{skillDir}/variants/{name}.md`.
 * The main SKILL.md is always the "default" variant.
 * Frontmatter in variant files can include `description`.
 */
export async function listVariants(
	skillDir: string,
): Promise<SkillVariantInfo[]> {
	const variants: SkillVariantInfo[] = [];
	const skillMd = path.join(skillDir, "SKILL.md");

	if (await fs.pathExists(skillMd)) {
		const raw = await fs.readFile(skillMd, "utf-8");
		const fm = parseFrontmatter(raw);
		variants.push({
			name: "default",
			description: fm?.data.description
				? String(fm.data.description)
				: "Default variant",
			isDefault: true,
			filePath: skillMd,
		});
	}

	const variantsDir = path.join(skillDir, "variants");
	if (!(await fs.pathExists(variantsDir))) return variants;

	const files = await fs.readdir(variantsDir);
	for (const file of files) {
		if (!file.endsWith(".md")) continue;
		const variantName = path.basename(file, ".md");
		const filePath = path.join(variantsDir, file);
		const raw = await fs.readFile(filePath, "utf-8");
		const fm = parseFrontmatter(raw);

		variants.push({
			name: variantName,
			description: fm?.data.description
				? String(fm.data.description)
				: `${variantName} variant`,
			isDefault: false,
			filePath,
		});
	}

	return variants;
}

/**
 * Resolve which variant to use.
 *
 * If the requested variant exists in `variants/{name}.md`, use that.
 * If "default" or not specified, use SKILL.md.
 * Returns null if the requested variant doesn't exist.
 */
export async function resolveVariant(
	skillDir: string,
	requested?: string,
): Promise<VariantResolution | null> {
	const skillName = path.basename(skillDir);

	if (!requested || requested === "default") {
		const skillMd = path.join(skillDir, "SKILL.md");
		if (!(await fs.pathExists(skillMd))) return null;
		const content = await fs.readFile(skillMd, "utf-8");
		return {
			skillName,
			variant: "default",
			content,
			source: skillMd,
		};
	}

	const variantFile = path.join(skillDir, "variants", `${requested}.md`);
	if (await fs.pathExists(variantFile)) {
		const content = await fs.readFile(variantFile, "utf-8");
		return {
			skillName,
			variant: requested,
			content,
			source: variantFile,
		};
	}

	return null;
}

/**
 * Load the content of a specific variant, merging with the base SKILL.md
 * frontmatter if the variant doesn't have its own.
 */
export async function loadVariantContent(
	skillDir: string,
	variantName: string,
): Promise<string | null> {
	const resolution = await resolveVariant(skillDir, variantName);
	if (!resolution) return null;

	if (variantName === "default" || !variantName) return resolution.content;

	// If variant has its own frontmatter, use it as-is
	const fm = parseFrontmatter(resolution.content);
	if (fm?.data.name) return resolution.content;

	// Otherwise, inherit the base SKILL.md frontmatter
	const baseMd = path.join(skillDir, "SKILL.md");
	if (!(await fs.pathExists(baseMd))) return resolution.content;

	const baseRaw = await fs.readFile(baseMd, "utf-8");
	const baseFm = parseFrontmatter(baseRaw);
	if (!baseFm) return resolution.content;

	// Reconstruct with base frontmatter + variant name + variant body
	const fmLines = Object.entries(baseFm.data).map(([k, v]) => {
		if (k === "variant") return `variant: ${variantName}`;
		if (Array.isArray(v)) return `${k}: [${v.join(", ")}]`;
		return `${k}: ${v}`;
	});
	if (!baseFm.data.variant) {
		fmLines.push(`variant: ${variantName}`);
	}

	return `---\n${fmLines.join("\n")}\n---\n\n${resolution.content}`;
}
