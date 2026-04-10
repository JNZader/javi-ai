import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	listPacks,
	loadRegistry,
	parseRegistry,
	parseSkillModes,
	resolveMode,
	resolvePack,
	saveRegistry,
} from "../registry.js";

let tmpDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pack-test-"));
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

const SAMPLE_REGISTRY = `
version: "1.0.0"
packs:
  frontend:
    description: "Frontend development skills"
    skills: [react-19, nextjs-15, tailwind-4, typescript]
  sdd:
    description: "Spec-Driven Development pipeline"
    skills:
      - sdd-init
      - sdd-explore
      - sdd-apply
      - sdd-verify
  testing:
    description: "Testing skills"
    skills: [playwright, pytest, agent-testing]
    tags: [quality, ci]
`;

// ── parseRegistry ──

describe("parseRegistry", () => {
	it("parses inline skill arrays", () => {
		const reg = parseRegistry(SAMPLE_REGISTRY);
		expect(reg.packs.frontend).toBeDefined();
		expect(reg.packs.frontend!.skills).toEqual([
			"react-19",
			"nextjs-15",
			"tailwind-4",
			"typescript",
		]);
	});

	it("parses block skill arrays", () => {
		const reg = parseRegistry(SAMPLE_REGISTRY);
		expect(reg.packs.sdd!.skills).toEqual([
			"sdd-init",
			"sdd-explore",
			"sdd-apply",
			"sdd-verify",
		]);
	});

	it("parses descriptions", () => {
		const reg = parseRegistry(SAMPLE_REGISTRY);
		expect(reg.packs.frontend!.description).toBe("Frontend development skills");
	});

	it("parses tags", () => {
		const reg = parseRegistry(SAMPLE_REGISTRY);
		expect(reg.packs.testing!.tags).toEqual(["quality", "ci"]);
	});

	it("parses version", () => {
		const reg = parseRegistry(SAMPLE_REGISTRY);
		expect(reg.version).toBe("1.0.0");
	});

	it("handles empty content", () => {
		const reg = parseRegistry("");
		expect(Object.keys(reg.packs)).toHaveLength(0);
	});

	it("parses multiple packs", () => {
		const reg = parseRegistry(SAMPLE_REGISTRY);
		expect(Object.keys(reg.packs)).toHaveLength(3);
	});
});

// ── resolvePack ──

describe("resolvePack", () => {
	it("identifies available vs missing skills", () => {
		const reg = parseRegistry(SAMPLE_REGISTRY);

		// Create some skill dirs
		for (const skill of ["react-19", "typescript"]) {
			const dir = path.join(tmpDir, skill);
			fs.mkdirSync(dir);
			fs.writeFileSync(path.join(dir, "SKILL.md"), "---\nname: test\n---");
		}

		const result = resolvePack(reg, "frontend", tmpDir);
		expect(result).not.toBeNull();
		expect(result!.available).toEqual(["react-19", "typescript"]);
		expect(result!.missing).toEqual(["nextjs-15", "tailwind-4"]);
	});

	it("returns null for unknown pack", () => {
		const reg = parseRegistry(SAMPLE_REGISTRY);
		expect(resolvePack(reg, "nonexistent", tmpDir)).toBeNull();
	});

	it("all missing when dir empty", () => {
		const reg = parseRegistry(SAMPLE_REGISTRY);
		const result = resolvePack(reg, "frontend", tmpDir);
		expect(result!.missing).toHaveLength(4);
		expect(result!.available).toHaveLength(0);
	});
});

// ── listPacks ──

describe("listPacks", () => {
	it("returns pack summaries", () => {
		const reg = parseRegistry(SAMPLE_REGISTRY);
		const packs = listPacks(reg);
		expect(packs).toHaveLength(3);
		expect(packs[0]!.name).toBe("frontend");
		expect(packs[0]!.skillCount).toBe(4);
	});
});

// ── File I/O ──

describe("save and load", () => {
	it("roundtrips through file", () => {
		const reg = parseRegistry(SAMPLE_REGISTRY);
		const filePath = path.join(tmpDir, "registry.yaml");
		saveRegistry(filePath, reg);

		const loaded = loadRegistry(filePath);
		expect(loaded).not.toBeNull();
		expect(loaded!.packs.frontend!.skills).toEqual(reg.packs.frontend!.skills);
		expect(loaded!.packs.sdd!.skills).toEqual(reg.packs.sdd!.skills);
	});

	it("returns null for nonexistent file", () => {
		expect(loadRegistry("/nonexistent/file.yaml")).toBeNull();
	});
});

// ── Multi-mode skills ──

describe("parseSkillModes", () => {
	it("parses mode array", () => {
		const modes = parseSkillModes([
			{ name: "analyze", description: "Run analysis" },
			{
				name: "fix",
				description: "Apply fixes",
				trigger: "When user says fix",
			},
		]);
		expect(modes).toHaveLength(2);
		expect(modes[0]!.name).toBe("analyze");
		expect(modes[1]!.trigger).toBe("When user says fix");
	});

	it("returns empty for non-array", () => {
		expect(parseSkillModes("not-an-array")).toEqual([]);
		expect(parseSkillModes(null)).toEqual([]);
		expect(parseSkillModes(undefined)).toEqual([]);
	});

	it("defaults name to 'default'", () => {
		const modes = parseSkillModes([{ description: "default mode" }]);
		expect(modes[0]!.name).toBe("default");
	});
});

describe("resolveMode", () => {
	const modes = [
		{ name: "analyze", description: "Analysis mode" },
		{ name: "fix", description: "Fix mode" },
	];

	it("finds requested mode", () => {
		expect(resolveMode(modes, "fix")?.name).toBe("fix");
	});

	it("returns null for unknown mode", () => {
		expect(resolveMode(modes, "nope")).toBeNull();
	});
});
