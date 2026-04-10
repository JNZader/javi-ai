import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	concatPublish,
	detectTargets,
	directoryPublish,
	type PublishResult,
	type PublishTarget,
	publishSkill,
	publishToAll,
} from "../publisher.js";

let tmpDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "publish-test-"));
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

const SAMPLE_SKILL = `---
name: test-skill
description: A test skill
---

# Test Skill

## Purpose

Testing the publisher.

## Critical Rules

1. **Always test first**
`;

// ── directoryPublish ──

describe("directoryPublish", () => {
	it("copies SKILL.md to target directory", () => {
		const target: PublishTarget = {
			platform: "claude",
			strategy: "directory",
			skillsPath: path.join(tmpDir, "skills"),
		};
		const result = directoryPublish("test-skill", SAMPLE_SKILL, target);
		expect(result.success).toBe(true);
		const written = path.join(tmpDir, "skills", "test-skill", "SKILL.md");
		expect(fs.existsSync(written)).toBe(true);
		expect(fs.readFileSync(written, "utf-8")).toBe(SAMPLE_SKILL);
	});

	it("overwrites existing skill", () => {
		const skillDir = path.join(tmpDir, "skills", "test-skill");
		fs.mkdirSync(skillDir, { recursive: true });
		fs.writeFileSync(path.join(skillDir, "SKILL.md"), "old content");

		const target: PublishTarget = {
			platform: "claude",
			strategy: "directory",
			skillsPath: path.join(tmpDir, "skills"),
		};
		directoryPublish("test-skill", SAMPLE_SKILL, target);
		expect(fs.readFileSync(path.join(skillDir, "SKILL.md"), "utf-8")).toBe(
			SAMPLE_SKILL,
		);
	});
});

// ── concatPublish ──

describe("concatPublish", () => {
	it("creates file with markers", () => {
		const target: PublishTarget = {
			platform: "windsurf",
			strategy: "concatenated",
			skillsPath: path.join(tmpDir, ".windsurfrules"),
		};
		const result = concatPublish("test-skill", SAMPLE_SKILL, target);
		expect(result.success).toBe(true);
		const content = fs.readFileSync(target.skillsPath, "utf-8");
		expect(content).toContain("<!-- BEGIN JAVI-AI:test-skill -->");
		expect(content).toContain("<!-- END JAVI-AI:test-skill -->");
		expect(content).toContain("# Test Skill");
	});

	it("preserves existing content outside markers", () => {
		const existingFile = path.join(tmpDir, ".windsurfrules");
		fs.writeFileSync(
			existingFile,
			"# My custom rules\n\nDo not delete this.\n",
		);

		const target: PublishTarget = {
			platform: "windsurf",
			strategy: "concatenated",
			skillsPath: existingFile,
		};
		concatPublish("test-skill", SAMPLE_SKILL, target);
		const content = fs.readFileSync(existingFile, "utf-8");
		expect(content).toContain("My custom rules");
		expect(content).toContain("Do not delete this");
		expect(content).toContain("JAVI-AI:test-skill");
	});

	it("updates existing skill block", () => {
		const existingFile = path.join(tmpDir, ".windsurfrules");
		fs.writeFileSync(
			existingFile,
			"before\n<!-- BEGIN JAVI-AI:test-skill -->\nold content\n<!-- END JAVI-AI:test-skill -->\nafter\n",
		);

		const target: PublishTarget = {
			platform: "windsurf",
			strategy: "concatenated",
			skillsPath: existingFile,
		};
		concatPublish("test-skill", "new content", target);
		const content = fs.readFileSync(existingFile, "utf-8");
		expect(content).toContain("new content");
		expect(content).not.toContain("old content");
		expect(content).toContain("before");
		expect(content).toContain("after");
	});
});

// ── publishSkill ──

describe("publishSkill", () => {
	it("uses directory strategy for claude", () => {
		const target: PublishTarget = {
			platform: "claude",
			strategy: "directory",
			skillsPath: path.join(tmpDir, "skills"),
		};
		const result = publishSkill("test-skill", SAMPLE_SKILL, target);
		expect(result.success).toBe(true);
		expect(result.platform).toBe("claude");
	});

	it("uses concatenated strategy for windsurf", () => {
		const target: PublishTarget = {
			platform: "windsurf",
			strategy: "concatenated",
			skillsPath: path.join(tmpDir, ".windsurfrules"),
		};
		const result = publishSkill("test-skill", SAMPLE_SKILL, target);
		expect(result.success).toBe(true);
	});
});

// ── publishToAll ──

describe("publishToAll", () => {
	it("publishes to multiple targets", () => {
		const targets: PublishTarget[] = [
			{
				platform: "claude",
				strategy: "directory",
				skillsPath: path.join(tmpDir, "claude-skills"),
			},
			{
				platform: "windsurf",
				strategy: "concatenated",
				skillsPath: path.join(tmpDir, ".windsurfrules"),
			},
		];
		const results = publishToAll("test-skill", SAMPLE_SKILL, targets);
		expect(results).toHaveLength(2);
		expect(results.every((r) => r.success)).toBe(true);
	});

	it("continues on failure", () => {
		const targets: PublishTarget[] = [
			{
				platform: "claude",
				strategy: "directory",
				skillsPath: path.join(tmpDir, "ok-skills"),
			},
			{
				platform: "bad",
				strategy: "directory",
				skillsPath: "/root/no-access/skills",
			},
		];
		const results = publishToAll("test-skill", SAMPLE_SKILL, targets);
		expect(results).toHaveLength(2);
		expect(results[0]!.success).toBe(true);
		// Second may fail due to permissions, but shouldn't crash
	});

	it("filters by compatible platforms", () => {
		const skillWithCompat = `---
name: react-only
compatible_platforms: [claude, cursor]
---

# React Only
`;
		const targets: PublishTarget[] = [
			{
				platform: "claude",
				strategy: "directory",
				skillsPath: path.join(tmpDir, "claude"),
			},
			{
				platform: "windsurf",
				strategy: "concatenated",
				skillsPath: path.join(tmpDir, ".windsurfrules"),
			},
		];
		const results = publishToAll("react-only", skillWithCompat, targets);
		const published = results.filter((r) => r.success);
		const skipped = results.filter(
			(r) => !r.success && r.error?.includes("incompatible"),
		);
		expect(published.length).toBe(1);
		expect(skipped.length).toBe(1);
	});
});

// ── detectTargets ──

describe("detectTargets", () => {
	it("detects claude from ~/.claude/skills", () => {
		const claudeDir = path.join(tmpDir, ".claude", "skills");
		fs.mkdirSync(claudeDir, { recursive: true });

		const targets = detectTargets(tmpDir);
		expect(targets.some((t) => t.platform === "claude")).toBe(true);
	});

	it("returns empty for bare directory", () => {
		const targets = detectTargets(tmpDir);
		expect(targets).toHaveLength(0);
	});
});
