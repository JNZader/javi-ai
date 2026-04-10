import { describe, expect, it } from "vitest";
import { lintSkill } from "../rules.js";
import { generateSkillMd, generateSocraticWrapper } from "../skillify.js";

// ── generateSkillMd ──

describe("generateSkillMd", () => {
	it("generates valid frontmatter", () => {
		const md = generateSkillMd({
			name: "test-skill",
			description: "A test skill",
		});
		expect(md).toContain("---");
		expect(md).toContain("name: test-skill");
		expect(md).toContain("description: A test skill");
	});

	it("includes version when provided", () => {
		const md = generateSkillMd({
			name: "test",
			description: "test",
			version: "2.0.0",
		});
		expect(md).toContain("version: 2.0.0");
	});

	it("includes phase when provided", () => {
		const md = generateSkillMd({
			name: "test",
			description: "test",
			phase: "build",
		});
		expect(md).toContain("phase: build");
	});

	it("includes triggers as block array", () => {
		const md = generateSkillMd({
			name: "test",
			description: "test",
			triggers: ["When user says build", "When editing .ts files"],
		});
		expect(md).toContain("triggers:");
		expect(md).toContain("  - When user says build");
	});

	it("generates title from kebab-case name", () => {
		const md = generateSkillMd({
			name: "my-cool-skill",
			description: "test",
		});
		expect(md).toContain("# My Cool Skill");
	});

	it("includes constraints section before steps", () => {
		const md = generateSkillMd({
			name: "test",
			description: "test",
			constraints: ["Never skip validation", "Always test first"],
			steps: ["Setup", "Execute"],
		});
		const constraintsIdx = md.indexOf("## Constraints");
		const stepsIdx = md.indexOf("## Execution Steps");
		expect(constraintsIdx).toBeGreaterThan(-1);
		expect(stepsIdx).toBeGreaterThan(-1);
		expect(constraintsIdx).toBeLessThan(stepsIdx);
	});

	it("numbers constraints", () => {
		const md = generateSkillMd({
			name: "test",
			description: "test",
			constraints: ["Rule one", "Rule two"],
		});
		expect(md).toContain("1. Rule one");
		expect(md).toContain("2. Rule two");
	});

	it("generates step headings", () => {
		const md = generateSkillMd({
			name: "test",
			description: "test",
			steps: ["Initialize", "Process", "Finalize"],
		});
		expect(md).toContain("### Step 1 — Initialize");
		expect(md).toContain("### Step 2 — Process");
		expect(md).toContain("### Step 3 — Finalize");
	});

	it("includes critical rules with bold", () => {
		const md = generateSkillMd({
			name: "test",
			description: "test",
			criticalRules: ["Never skip tests", "Always validate"],
		});
		expect(md).toContain("1. **Never skip tests**");
		expect(md).toContain("2. **Always validate**");
	});

	it("includes rationalizations with excuse/rebuttal", () => {
		const md = generateSkillMd({
			name: "test",
			description: "test",
			rationalizations: [
				{ excuse: "Too slow", rebuttal: "Speed is not an excuse" },
			],
		});
		expect(md).toContain('**Excuse**: "Too slow"');
		expect(md).toContain("**Rebuttal**: Speed is not an excuse");
	});

	it("generated skill passes linter with high score", () => {
		const md = generateSkillMd({
			name: "complete-skill",
			description: "A fully specified skill for testing",
			version: "1.0.0",
			phase: "build",
			constraints: ["Always validate input"],
			steps: ["Parse input", "Process", "Output"],
			criticalRules: ["Never skip validation"],
			rationalizations: [
				{ excuse: "Input is trusted", rebuttal: "Never trust input" },
			],
		});

		const result = lintSkill(md);
		expect(result.score).toBeGreaterThanOrEqual(90);
		expect(result.hasFrontmatter).toBe(true);
		expect(result.phase).toBe("build");
		expect(result.hasRationalizations).toBe(true);
		expect(result.hasConstraints).toBe(true);
	});
});

// ── generateSocraticWrapper ──

describe("generateSocraticWrapper", () => {
	it("generates a valid skill", () => {
		const md = generateSocraticWrapper("react-19");
		expect(md).toContain("name: socratic-react-19");
		expect(md).toContain("phase: learn");
	});

	it("includes socratic constraints", () => {
		const md = generateSocraticWrapper("typescript");
		expect(md).toContain("NEVER give the direct answer first");
		expect(md).toContain("guiding question");
	});

	it("includes anti-drift rationalizations", () => {
		const md = generateSocraticWrapper("test");
		expect(md).toContain("## Rationalizations");
		expect(md).toContain("Excuse");
		expect(md).toContain("Rebuttal");
	});

	it("passes linter with high score", () => {
		const md = generateSocraticWrapper("react-19");
		const result = lintSkill(md);
		expect(result.score).toBeGreaterThanOrEqual(90);
		expect(result.hasRationalizations).toBe(true);
		expect(result.hasConstraints).toBe(true);
	});

	it("includes critical rules", () => {
		const md = generateSocraticWrapper("test");
		expect(md).toContain("## Critical Rules");
		expect(md).toContain("Questions FIRST");
	});
});
