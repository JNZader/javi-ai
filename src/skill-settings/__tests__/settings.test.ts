import fs from "fs-extra";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SettingDefinition } from "../settings.js";
import {
	loadUserSettings,
	parseSettingDefinitions,
	resolveSettings,
	saveUserSettings,
	validateValue,
} from "../settings.js";

let tmpDir: string;

beforeEach(async () => {
	tmpDir = path.join(os.tmpdir(), `skill-settings-test-${Date.now()}`);
	await fs.ensureDir(tmpDir);
});

afterEach(async () => {
	await fs.remove(tmpDir);
});

describe("parseSettingDefinitions", () => {
	it("parses simple number defaults", () => {
		const defs = parseSettingDefinitions({ STRICTNESS: 5, VERBOSITY: 3 });
		expect(defs).toHaveLength(2);
		expect(defs[0].name).toBe("STRICTNESS");
		expect(defs[0].type).toBe("number");
		expect(defs[0].default).toBe(5);
	});

	it("parses simple string defaults", () => {
		const defs = parseSettingDefinitions({ FORMAT: "markdown" });
		expect(defs[0].type).toBe("string");
		expect(defs[0].default).toBe("markdown");
	});

	it("parses boolean defaults", () => {
		const defs = parseSettingDefinitions({ ENABLED: true });
		expect(defs[0].type).toBe("boolean");
		expect(defs[0].default).toBe(true);
	});

	it("parses structured definitions with min/max", () => {
		const defs = parseSettingDefinitions({
			STRICTNESS: { type: "number", default: 5, min: 1, max: 10 },
		});
		expect(defs[0].min).toBe(1);
		expect(defs[0].max).toBe(10);
		expect(defs[0].default).toBe(5);
	});

	it("parses string with options", () => {
		const defs = parseSettingDefinitions({
			FORMAT: {
				type: "string",
				default: "markdown",
				options: ["markdown", "json", "yaml"],
			},
		});
		expect(defs[0].options).toEqual(["markdown", "json", "yaml"]);
	});

	it("parses description", () => {
		const defs = parseSettingDefinitions({
			STRICTNESS: {
				type: "number",
				default: 5,
				description: "How strict the review should be",
			},
		});
		expect(defs[0].description).toBe("How strict the review should be");
	});
});

describe("validateValue", () => {
	const numDef: SettingDefinition = {
		name: "STRICTNESS",
		type: "number",
		default: 5,
		min: 1,
		max: 10,
	};

	const strDef: SettingDefinition = {
		name: "FORMAT",
		type: "string",
		default: "markdown",
		options: ["markdown", "json"],
	};

	const boolDef: SettingDefinition = {
		name: "ENABLED",
		type: "boolean",
		default: true,
	};

	it("validates valid number", () => {
		const result = validateValue(numDef, 7);
		expect(result.valid).toBe(true);
		expect(result.coerced).toBe(7);
	});

	it("clamps number below min", () => {
		const result = validateValue(numDef, 0);
		expect(result.valid).toBe(false);
		expect(result.coerced).toBe(1);
	});

	it("clamps number above max", () => {
		const result = validateValue(numDef, 15);
		expect(result.valid).toBe(false);
		expect(result.coerced).toBe(10);
	});

	it("rejects non-numeric for number type", () => {
		const result = validateValue(numDef, "abc");
		expect(result.valid).toBe(false);
		expect(result.coerced).toBe(5);
	});

	it("validates valid string option", () => {
		const result = validateValue(strDef, "json");
		expect(result.valid).toBe(true);
		expect(result.coerced).toBe("json");
	});

	it("rejects invalid string option", () => {
		const result = validateValue(strDef, "xml");
		expect(result.valid).toBe(false);
		expect(result.coerced).toBe("markdown");
	});

	it("validates boolean", () => {
		expect(validateValue(boolDef, true).coerced).toBe(true);
		expect(validateValue(boolDef, false).coerced).toBe(false);
		expect(validateValue(boolDef, "true").coerced).toBe(true);
		expect(validateValue(boolDef, "false").coerced).toBe(false);
	});

	it("rejects invalid boolean", () => {
		const result = validateValue(boolDef, "maybe");
		expect(result.valid).toBe(false);
	});
});

describe("resolveSettings", () => {
	const defs: SettingDefinition[] = [
		{ name: "STRICTNESS", type: "number", default: 5, min: 1, max: 10 },
		{
			name: "FORMAT",
			type: "string",
			default: "markdown",
			options: ["markdown", "json"],
		},
	];

	it("returns defaults when no overrides", () => {
		const { values } = resolveSettings(defs);
		expect(values.STRICTNESS).toBe(5);
		expect(values.FORMAT).toBe("markdown");
	});

	it("applies valid overrides", () => {
		const { values, warnings } = resolveSettings(defs, {
			STRICTNESS: 8,
			FORMAT: "json",
		});
		expect(values.STRICTNESS).toBe(8);
		expect(values.FORMAT).toBe("json");
		expect(warnings).toHaveLength(0);
	});

	it("clamps invalid overrides with warnings", () => {
		const { values, warnings } = resolveSettings(defs, {
			STRICTNESS: 15,
		});
		expect(values.STRICTNESS).toBe(10);
		expect(warnings).toHaveLength(1);
	});

	it("ignores unknown override keys", () => {
		const { values } = resolveSettings(defs, { UNKNOWN: "value" });
		expect(values.STRICTNESS).toBe(5);
		expect("UNKNOWN" in values).toBe(false);
	});
});

describe("loadUserSettings / saveUserSettings", () => {
	it("returns empty object for non-existent file", async () => {
		const settings = await loadUserSettings(tmpDir);
		expect(settings).toEqual({});
	});

	it("roundtrips settings", async () => {
		const data = {
			"react-19": { STRICTNESS: 8 },
			typescript: { VERBOSITY: 1 },
		};
		await saveUserSettings(tmpDir, data);
		const loaded = await loadUserSettings(tmpDir);
		expect(loaded).toEqual(data);
	});

	it("creates config directory if needed", async () => {
		const nested = path.join(tmpDir, "nested", "config");
		await saveUserSettings(nested, { test: { A: 1 } });
		expect(await fs.pathExists(path.join(nested, "skill-settings.json"))).toBe(
			true,
		);
	});
});
