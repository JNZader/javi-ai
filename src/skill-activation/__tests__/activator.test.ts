import fs from "fs-extra";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SkillTrigger } from "../activator.js";
import {
	buildTriggerIndex,
	globToRegex,
	matchFiles,
	matchSkills,
} from "../activator.js";

let tmpDir: string;

beforeEach(async () => {
	tmpDir = path.join(os.tmpdir(), `skill-activation-test-${Date.now()}`);
	await fs.ensureDir(tmpDir);
});

afterEach(async () => {
	await fs.remove(tmpDir);
});

const SAMPLE_TRIGGERS: SkillTrigger[] = [
	{
		skillName: "react-19",
		skillPath: "/skills/react-19",
		patterns: ["react", "jsx", "component", "hook"],
		filePatterns: ["*.tsx", "*.jsx"],
		description: "React 19 patterns",
	},
	{
		skillName: "typescript",
		skillPath: "/skills/typescript",
		patterns: ["typescript", "interface", "generic"],
		filePatterns: ["*.ts", "tsconfig.json"],
		description: "TypeScript patterns",
	},
	{
		skillName: "playwright",
		skillPath: "/skills/playwright",
		patterns: ["playwright", "e2e", "browser test"],
		filePatterns: ["playwright.config.*", "*.spec.ts"],
		description: "Playwright E2E testing",
	},
];

describe("matchSkills", () => {
	it("matches keyword in user input", () => {
		const matches = matchSkills(
			"I need to create a React component",
			SAMPLE_TRIGGERS,
		);
		expect(matches.length).toBeGreaterThanOrEqual(1);
		expect(matches[0].skillName).toBe("react-19");
	});

	it("matches case-insensitively", () => {
		const matches = matchSkills(
			"help me with TYPESCRIPT types",
			SAMPLE_TRIGGERS,
		);
		expect(matches.some((m) => m.skillName === "typescript")).toBe(true);
	});

	it("returns multiple matches when applicable", () => {
		const matches = matchSkills(
			"create a React component with TypeScript",
			SAMPLE_TRIGGERS,
		);
		expect(matches.length).toBeGreaterThanOrEqual(2);
		const names = matches.map((m) => m.skillName);
		expect(names).toContain("react-19");
		expect(names).toContain("typescript");
	});

	it("returns empty array for no matches", () => {
		const matches = matchSkills("how is the weather today?", SAMPLE_TRIGGERS);
		expect(matches).toEqual([]);
	});

	it("deduplicates by skill name", () => {
		const matches = matchSkills(
			"react component with jsx hook",
			SAMPLE_TRIGGERS,
		);
		const reactMatches = matches.filter((m) => m.skillName === "react-19");
		expect(reactMatches).toHaveLength(1);
	});

	it("sorts by confidence descending", () => {
		const matches = matchSkills("playwright e2e react test", SAMPLE_TRIGGERS);
		for (let i = 1; i < matches.length; i++) {
			expect(matches[i - 1].confidence).toBeGreaterThanOrEqual(
				matches[i].confidence,
			);
		}
	});

	it("includes match type and pattern", () => {
		const matches = matchSkills("write playwright tests", SAMPLE_TRIGGERS);
		const pw = matches.find((m) => m.skillName === "playwright");
		expect(pw?.matchType).toBe("keyword");
		expect(pw?.matchedPattern).toBe("playwright");
	});
});

describe("matchFiles", () => {
	it("matches tsx files to react skill", () => {
		const matches = matchFiles(["src/App.tsx"], SAMPLE_TRIGGERS);
		expect(matches.some((m) => m.skillName === "react-19")).toBe(true);
	});

	it("matches ts files to typescript skill", () => {
		const matches = matchFiles(["src/index.ts"], SAMPLE_TRIGGERS);
		expect(matches.some((m) => m.skillName === "typescript")).toBe(true);
	});

	it("matches spec files to playwright skill", () => {
		const matches = matchFiles(["tests/login.spec.ts"], SAMPLE_TRIGGERS);
		expect(matches.some((m) => m.skillName === "playwright")).toBe(true);
	});

	it("matches tsconfig.json to typescript", () => {
		const matches = matchFiles(["tsconfig.json"], SAMPLE_TRIGGERS);
		expect(matches.some((m) => m.skillName === "typescript")).toBe(true);
	});

	it("returns empty for non-matching files", () => {
		const matches = matchFiles(["README.md", "package.json"], SAMPLE_TRIGGERS);
		expect(matches).toEqual([]);
	});

	it("deduplicates by skill name", () => {
		const matches = matchFiles(
			["src/App.tsx", "src/Button.tsx"],
			SAMPLE_TRIGGERS,
		);
		const reactMatches = matches.filter((m) => m.skillName === "react-19");
		expect(reactMatches).toHaveLength(1);
	});

	it("sets matchType to file", () => {
		const matches = matchFiles(["src/App.tsx"], SAMPLE_TRIGGERS);
		expect(matches[0].matchType).toBe("file");
	});
});

describe("globToRegex", () => {
	it("converts simple wildcard", () => {
		const re = globToRegex("*.tsx");
		expect(re.test("App.tsx")).toBe(true);
		expect(re.test("App.ts")).toBe(false);
	});

	it("converts double wildcard", () => {
		const re = globToRegex("app/**/page.tsx");
		expect(re.test("app/dashboard/page.tsx")).toBe(true);
		expect(re.test("app/page.tsx")).toBe(true);
	});

	it("matches literal filenames", () => {
		const re = globToRegex("tsconfig.json");
		expect(re.test("tsconfig.json")).toBe(true);
		expect(re.test("tsconfig.yaml")).toBe(false);
	});

	it("handles dots in patterns", () => {
		const re = globToRegex("playwright.config.*");
		expect(re.test("playwright.config.ts")).toBe(true);
		expect(re.test("playwright.config.js")).toBe(true);
	});

	it("is case insensitive", () => {
		const re = globToRegex("*.TSX");
		expect(re.test("App.tsx")).toBe(true);
	});
});

describe("buildTriggerIndex", () => {
	it("builds index from skills directory", async () => {
		// Create a fake skill with frontmatter triggers
		const skillDir = path.join(tmpDir, "test-skill");
		await fs.ensureDir(skillDir);
		await fs.writeFile(
			path.join(skillDir, "SKILL.md"),
			`---
name: test-skill
description: A test skill
triggers: [testing, vitest, jest]
---

# Test Skill
`,
		);

		const triggers = await buildTriggerIndex(tmpDir);
		expect(triggers).toHaveLength(1);
		expect(triggers[0].skillName).toBe("test-skill");
		expect(triggers[0].patterns).toEqual(["testing", "vitest", "jest"]);
	});

	it("uses default triggers for known skills", async () => {
		const skillDir = path.join(tmpDir, "react-19");
		await fs.ensureDir(skillDir);
		await fs.writeFile(
			path.join(skillDir, "SKILL.md"),
			`---
name: react-19
description: React 19 patterns
---

# React 19
`,
		);

		const triggers = await buildTriggerIndex(tmpDir);
		expect(triggers).toHaveLength(1);
		expect(triggers[0].patterns).toContain("react");
		expect(triggers[0].filePatterns).toContain("*.tsx");
	});

	it("returns empty for non-existent directory", async () => {
		const triggers = await buildTriggerIndex("/nonexistent");
		expect(triggers).toEqual([]);
	});

	it("skips _shared and hidden directories", async () => {
		await fs.ensureDir(path.join(tmpDir, "_shared"));
		await fs.writeFile(
			path.join(tmpDir, "_shared", "SKILL.md"),
			"---\nname: shared\n---",
		);
		await fs.ensureDir(path.join(tmpDir, ".hidden"));
		await fs.writeFile(
			path.join(tmpDir, ".hidden", "SKILL.md"),
			"---\nname: hidden\n---",
		);

		const triggers = await buildTriggerIndex(tmpDir);
		expect(triggers).toEqual([]);
	});

	it("skips skills without SKILL.md", async () => {
		await fs.ensureDir(path.join(tmpDir, "no-skill"));
		await fs.writeFile(path.join(tmpDir, "no-skill", "README.md"), "# Nope");

		const triggers = await buildTriggerIndex(tmpDir);
		expect(triggers).toEqual([]);
	});
});
