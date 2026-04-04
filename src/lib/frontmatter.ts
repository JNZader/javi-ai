import type { FrontmatterResult } from "../types/index.js";

/**
 * Parse simple YAML frontmatter from a markdown string.
 * Supports key: value pairs (single-line values only).
 * No external YAML dependency needed.
 */
export function parseFrontmatter(raw: string): FrontmatterResult | null {
	const trimmed = raw.trimStart();
	if (!trimmed.startsWith("---")) return null;

	const endIdx = trimmed.indexOf("---", 3);
	if (endIdx === -1) return null;

	const yamlBlock = trimmed.slice(3, endIdx).trim();
	const content = trimmed.slice(endIdx + 3).trim();

	const data: Record<string, string> = {};
	for (const line of yamlBlock.split("\n")) {
		const colonIdx = line.indexOf(":");
		if (colonIdx === -1) continue;

		const key = line.slice(0, colonIdx).trim();
		let value = line.slice(colonIdx + 1).trim();

		// Strip surrounding quotes
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}

		if (key) data[key] = value;
	}

	if (Object.keys(data).length === 0) return null;
	return { data, content };
}
