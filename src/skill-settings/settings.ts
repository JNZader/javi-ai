/**
 * Parameterized skill settings — tunable dials per skill.
 *
 * Skills can declare configurable parameters in their frontmatter:
 *   settings:
 *     STRICTNESS: { type: number, default: 5, min: 1, max: 10 }
 *     VERBOSITY: { type: number, default: 3, min: 1, max: 5 }
 *     FORMAT: { type: string, default: "markdown", options: ["markdown", "json"] }
 *
 * Users override via ~/.javi-ai/skill-settings.json:
 *   { "react-19": { "STRICTNESS": 8 }, "typescript": { "VERBOSITY": 1 } }
 */

import fs from "fs-extra";
import path from "path";
import { parseFrontmatter } from "../lib/frontmatter.js";

// ── Types ──

export interface SettingDefinition {
	name: string;
	type: "number" | "string" | "boolean";
	default: number | string | boolean;
	min?: number;
	max?: number;
	options?: string[];
	description?: string;
}

export interface SkillSettings {
	skillName: string;
	definitions: SettingDefinition[];
	values: Record<string, number | string | boolean>;
}

// ── Parsing ──

/**
 * Parse setting definitions from a SKILL.md frontmatter 'settings' field.
 * Supports simplified inline format: STRICTNESS: 5 (defaults to number)
 * and structured format with type/default/min/max/options.
 */
export function parseSettingDefinitions(
	raw: Record<string, unknown>,
): SettingDefinition[] {
	const defs: SettingDefinition[] = [];

	for (const [name, value] of Object.entries(raw)) {
		if (typeof value === "number") {
			defs.push({ name, type: "number", default: value });
		} else if (typeof value === "string") {
			defs.push({ name, type: "string", default: value });
		} else if (typeof value === "boolean") {
			defs.push({ name, type: "boolean", default: value });
		} else if (typeof value === "object" && value !== null) {
			const obj = value as Record<string, unknown>;
			const type = (obj.type as string) ?? "string";
			const def: SettingDefinition = {
				name,
				type: type as SettingDefinition["type"],
				default: (obj.default as number | string | boolean) ?? "",
				description: obj.description as string | undefined,
			};
			if (typeof obj.min === "number") def.min = obj.min;
			if (typeof obj.max === "number") def.max = obj.max;
			if (Array.isArray(obj.options)) def.options = obj.options as string[];
			defs.push(def);
		}
	}

	return defs;
}

// ── Validation ──

export function validateValue(
	def: SettingDefinition,
	value: unknown,
): { valid: boolean; error?: string; coerced: number | string | boolean } {
	if (def.type === "number") {
		const num = Number(value);
		if (Number.isNaN(num)) {
			return {
				valid: false,
				error: `${def.name}: expected number, got ${typeof value}`,
				coerced: def.default,
			};
		}
		if (def.min !== undefined && num < def.min) {
			return {
				valid: false,
				error: `${def.name}: ${num} < min ${def.min}`,
				coerced: def.min,
			};
		}
		if (def.max !== undefined && num > def.max) {
			return {
				valid: false,
				error: `${def.name}: ${num} > max ${def.max}`,
				coerced: def.max,
			};
		}
		return { valid: true, coerced: num };
	}

	if (def.type === "boolean") {
		if (typeof value === "boolean") return { valid: true, coerced: value };
		if (value === "true") return { valid: true, coerced: true };
		if (value === "false") return { valid: true, coerced: false };
		return {
			valid: false,
			error: `${def.name}: expected boolean`,
			coerced: def.default,
		};
	}

	// string
	const str = String(value);
	if (def.options && !def.options.includes(str)) {
		return {
			valid: false,
			error: `${def.name}: "${str}" not in [${def.options.join(", ")}]`,
			coerced: def.default,
		};
	}
	return { valid: true, coerced: str };
}

// ── Resolution ──

/**
 * Resolve settings for a skill: defaults ← user overrides, with validation.
 */
export function resolveSettings(
	definitions: SettingDefinition[],
	overrides: Record<string, unknown> = {},
): { values: Record<string, number | string | boolean>; warnings: string[] } {
	const values: Record<string, number | string | boolean> = {};
	const warnings: string[] = [];

	for (const def of definitions) {
		if (def.name in overrides) {
			const result = validateValue(def, overrides[def.name]);
			values[def.name] = result.coerced;
			if (!result.valid && result.error) {
				warnings.push(result.error);
			}
		} else {
			values[def.name] = def.default;
		}
	}

	return { values, warnings };
}

// ── File I/O ──

const SETTINGS_FILE = "skill-settings.json";

export async function loadUserSettings(
	configDir: string,
): Promise<Record<string, Record<string, unknown>>> {
	const filePath = path.join(configDir, SETTINGS_FILE);
	if (!(await fs.pathExists(filePath))) return {};
	try {
		return await fs.readJson(filePath);
	} catch {
		return {};
	}
}

export async function saveUserSettings(
	configDir: string,
	settings: Record<string, Record<string, unknown>>,
): Promise<void> {
	await fs.ensureDir(configDir);
	const filePath = path.join(configDir, SETTINGS_FILE);
	await fs.writeJson(filePath, settings, { spaces: 2 });
}

/**
 * Load skill settings from SKILL.md frontmatter + user overrides.
 */
export async function loadSkillSettings(
	skillDir: string,
	configDir: string,
): Promise<SkillSettings> {
	const skillName = path.basename(skillDir);
	const skillMd = path.join(skillDir, "SKILL.md");

	let definitions: SettingDefinition[] = [];

	if (await fs.pathExists(skillMd)) {
		const raw = await fs.readFile(skillMd, "utf-8");
		const fm = parseFrontmatter(raw);
		if (fm?.data.settings && typeof fm.data.settings === "object") {
			definitions = parseSettingDefinitions(
				fm.data.settings as Record<string, unknown>,
			);
		}
	}

	const userSettings = await loadUserSettings(configDir);
	const overrides = userSettings[skillName] ?? {};
	const { values } = resolveSettings(definitions, overrides);

	return { skillName, definitions, values };
}
