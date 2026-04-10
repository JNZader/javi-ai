import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	analyzeSkillDir,
	analyzeSkillsDirectory,
	estimateTokens,
	formatBreakdown,
} from "../analyzer.js";

let tmpDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ctx-test-"));
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("estimateTokens", () => {
	it("estimates ~4 chars per token", () => {
		expect(estimateTokens("a".repeat(400))).toBe(100);
	});

	it("returns 1 for empty string", () => {
		expect(estimateTokens("")).toBe(1);
	});
});

describe("analyzeSkillDir", () => {
	it("returns null when no SKILL.md", () => {
		fs.mkdirSync(path.join(tmpDir, "empty-skill"));
		expect(analyzeSkillDir(path.join(tmpDir, "empty-skill"))).toBeNull();
	});

	it("counts SKILL.md tokens", () => {
		const skillDir = path.join(tmpDir, "test-skill");
		fs.mkdirSync(skillDir);
		fs.writeFileSync(path.join(skillDir, "SKILL.md"), "a".repeat(400));

		const report = analyzeSkillDir(skillDir);
		expect(report).not.toBeNull();
		expect(report!.name).toBe("test-skill");
		expect(report!.charCount).toBe(400);
		expect(report!.tokenEstimate).toBe(100);
	});

	it("includes references/ directory", () => {
		const skillDir = path.join(tmpDir, "ref-skill");
		fs.mkdirSync(skillDir);
		fs.writeFileSync(path.join(skillDir, "SKILL.md"), "a".repeat(200));
		fs.mkdirSync(path.join(skillDir, "references"));
		fs.writeFileSync(
			path.join(skillDir, "references", "guide.md"),
			"b".repeat(800),
		);

		const report = analyzeSkillDir(skillDir);
		expect(report!.charCount).toBe(1000);
		expect(report!.tokenEstimate).toBe(250);
	});
});

describe("analyzeSkillsDirectory", () => {
	it("analyzes multiple skills", () => {
		for (const name of ["alpha", "beta", "gamma"]) {
			const dir = path.join(tmpDir, name);
			fs.mkdirSync(dir);
			fs.writeFileSync(path.join(dir, "SKILL.md"), "x".repeat(400));
		}

		const breakdown = analyzeSkillsDirectory(tmpDir);
		expect(breakdown.totalSkills).toBe(3);
		expect(breakdown.totalTokens).toBe(300);
		expect(breakdown.skills).toHaveLength(3);
	});

	it("skips _shared directory", () => {
		fs.mkdirSync(path.join(tmpDir, "_shared"));
		fs.writeFileSync(path.join(tmpDir, "_shared", "SKILL.md"), "content");
		fs.mkdirSync(path.join(tmpDir, "real-skill"));
		fs.writeFileSync(path.join(tmpDir, "real-skill", "SKILL.md"), "content");

		const breakdown = analyzeSkillsDirectory(tmpDir);
		expect(breakdown.totalSkills).toBe(1);
	});

	it("sorts by tokens descending", () => {
		const small = path.join(tmpDir, "small");
		const large = path.join(tmpDir, "large");
		fs.mkdirSync(small);
		fs.mkdirSync(large);
		fs.writeFileSync(path.join(small, "SKILL.md"), "a".repeat(100));
		fs.writeFileSync(path.join(large, "SKILL.md"), "a".repeat(1000));

		const breakdown = analyzeSkillsDirectory(tmpDir);
		expect(breakdown.skills[0]!.name).toBe("large");
		expect(breakdown.heaviest).toBe("large");
	});

	it("calculates percentages", () => {
		const a = path.join(tmpDir, "a");
		const b = path.join(tmpDir, "b");
		fs.mkdirSync(a);
		fs.mkdirSync(b);
		fs.writeFileSync(path.join(a, "SKILL.md"), "x".repeat(400)); // 100 tokens
		fs.writeFileSync(path.join(b, "SKILL.md"), "x".repeat(400)); // 100 tokens

		const breakdown = analyzeSkillsDirectory(tmpDir);
		expect(breakdown.skills[0]!.percentage).toBe(50);
	});

	it("returns topConsumers (max 5)", () => {
		for (let i = 0; i < 8; i++) {
			const dir = path.join(tmpDir, `skill-${i}`);
			fs.mkdirSync(dir);
			fs.writeFileSync(path.join(dir, "SKILL.md"), "x".repeat(100));
		}

		const breakdown = analyzeSkillsDirectory(tmpDir);
		expect(breakdown.topConsumers).toHaveLength(5);
	});

	it("handles empty directory", () => {
		const breakdown = analyzeSkillsDirectory(tmpDir);
		expect(breakdown.totalSkills).toBe(0);
		expect(breakdown.heaviest).toBeNull();
	});

	it("handles nonexistent directory", () => {
		const breakdown = analyzeSkillsDirectory("/nonexistent");
		expect(breakdown.totalSkills).toBe(0);
	});
});

describe("formatBreakdown", () => {
	it("shows header with totals", () => {
		const dir = path.join(tmpDir, "skill-x");
		fs.mkdirSync(dir);
		fs.writeFileSync(path.join(dir, "SKILL.md"), "x".repeat(4000));

		const breakdown = analyzeSkillsDirectory(tmpDir);
		const output = formatBreakdown(breakdown);
		expect(output).toContain("1 skills");
		expect(output).toContain("1.0K tokens");
	});

	it("returns message for empty", () => {
		const breakdown = analyzeSkillsDirectory(tmpDir);
		expect(formatBreakdown(breakdown)).toContain("No skills found");
	});
});
