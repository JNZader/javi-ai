import type { FrontmatterResult } from "../types/index.js";

/**
 * Parse simple YAML frontmatter from a markdown string.
 * Supports key: value pairs (single-line values) and array fields.
 * Array formats supported:
 *   dependencies: [skill-a, skill-b]       # inline array
 *   dependencies:                           # block array
 *     - skill-a
 *     - skill-b
 */
export function parseFrontmatter(raw: string): FrontmatterResult | null {
	const trimmed = raw.trimStart();
	if (!trimmed.startsWith("---")) return null;

	const endIdx = trimmed.indexOf("---", 3);
	if (endIdx === -1) return null;

	const yamlBlock = trimmed.slice(3, endIdx).trim();
	const content = trimmed.slice(endIdx + 3).trim();

	const data: Record<string, string | string[]> = {};
	const lines = yamlBlock.split("\n");
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];
		const colonIdx = line.indexOf(":");
		if (colonIdx === -1) {
			i++;
			continue;
		}

		const key = line.slice(0, colonIdx).trim();
		const rest = line.slice(colonIdx + 1).trim();

		if (!key) {
			i++;
			continue;
		}

		// Inline array: key: [a, b, c]
		if (rest.startsWith("[") && rest.endsWith("]")) {
			const inner = rest.slice(1, -1);
			const items = inner
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
			data[key] = items;
			i++;
			continue;
		}

		// Block array: key: (empty) followed by "  - item" lines
		if (rest === "") {
			const items: string[] = [];
			i++;
			while (i < lines.length) {
				const nextLine = lines[i];
				const itemMatch = nextLine.match(/^\s+-\s+(.*)/);
				if (itemMatch) {
					items.push(itemMatch[1].trim());
					i++;
				} else {
					break;
				}
			}

			if (items.length > 0) {
				data[key] = items;
			}
			// If no items, it was just an empty value — skip (don't set key)
			continue;
		}

		// Scalar value
		let value = rest;

		// Strip surrounding quotes
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}

		data[key] = value;
		i++;
	}

	if (Object.keys(data).length === 0) return null;
	return { data, content };
}
