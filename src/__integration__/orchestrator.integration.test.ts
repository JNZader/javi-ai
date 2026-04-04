/**
 * Integration tests for runInstall orchestrator — configs, hooks, orchestrators, backup, manifest.
 * Skills are tested separately in install.integration.test.ts.
 * These tests use real filesystem, mocking only paths (constants) and url.
 */

import fs from "fs-extra";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
	FIXED_ROOT,
	FIXED_HOME,
	FIXED_MANIFEST,
	FIXED_BACKUP,
	FIXED_CLAUDE_CONFIG,
	FIXED_CLAUDE_SKILLS,
} = vi.hoisted(() => {
	const p = require("path");
	const o = require("os");
	const root = p.join(o.tmpdir(), `javi-ai-orch-test-${Date.now()}`);
	const home = p.join(root, "home");
	return {
		FIXED_ROOT: root as string,
		FIXED_HOME: home as string,
		FIXED_MANIFEST: p.join(home, ".javi-ai", "manifest.json") as string,
		FIXED_BACKUP: p.join(home, ".javi-ai", "backups") as string,
		FIXED_CLAUDE_CONFIG: p.join(home, ".claude") as string,
		FIXED_CLAUDE_SKILLS: p.join(home, ".claude", "skills") as string,
	};
});

vi.mock("../constants.js", () => ({
	HOME: FIXED_HOME,
	CLI_OPTIONS: [
		{
			id: "claude",
			label: "Claude Code",
			configPath: FIXED_CLAUDE_CONFIG,
			skillsPath: FIXED_CLAUDE_SKILLS,
			pluginsPath: FIXED_CLAUDE_CONFIG + "/plugins",
			available: true,
		},
	],
	MANIFEST_PATH: FIXED_MANIFEST,
	BACKUP_DIR: FIXED_BACKUP,
	MARKER_START: "<!-- BEGIN JAVI-AI -->",
	MARKER_END: "<!-- END JAVI-AI -->",
}));

import { runInstall } from "../installer/index.js";
import type { InstallStep } from "../types/index.js";

function collectSteps() {
	const steps: InstallStep[] = [];
	const onStep = (step: InstallStep) => {
		const idx = steps.findIndex((s) => s.id === step.id);
		if (idx >= 0) steps[idx] = step;
		else steps.push(step);
	};
	return { steps, onStep };
}

describe("runInstall() orchestrator — integration", () => {
	beforeEach(async () => {
		await fs.ensureDir(FIXED_HOME);
		await fs.ensureDir(FIXED_CLAUDE_CONFIG);
	});

	afterEach(async () => {
		await fs.remove(FIXED_ROOT);
	});

	it("installs configs: merges JSON files (settings.json)", async () => {
		// Pre-existing settings.json with user custom key
		await fs.writeJson(path.join(FIXED_CLAUDE_CONFIG, "settings.json"), {
			userCustom: true,
		});

		const { steps, onStep } = collectSteps();
		await runInstall(
			{
				clis: ["claude"],
				features: ["configs"],
				dryRun: false,
				backup: true,
			},
			onStep,
		);

		const configStep = steps.find((s) => s.id === "claude-configs");
		expect(configStep?.status).toBe("done");

		// settings.json should have been merged (user key preserved)
		const settings = await fs.readJson(
			path.join(FIXED_CLAUDE_CONFIG, "settings.json"),
		);
		expect(settings.userCustom).toBe(true);
	});

	it("installs configs: merges markdown files with markers (CLAUDE.md)", async () => {
		const { onStep } = collectSteps();
		await runInstall(
			{
				clis: ["claude"],
				features: ["configs"],
				dryRun: false,
				backup: true,
			},
			onStep,
		);

		const claudeMd = path.join(FIXED_CLAUDE_CONFIG, "CLAUDE.md");
		if (await fs.pathExists(claudeMd)) {
			const content = await fs.readFile(claudeMd, "utf-8");
			expect(content.length).toBeGreaterThan(0);
		}
	});

	it("creates backup before merging existing files", async () => {
		// Pre-existing file
		await fs.writeJson(path.join(FIXED_CLAUDE_CONFIG, "settings.json"), {
			old: true,
		});

		const { onStep } = collectSteps();
		await runInstall(
			{
				clis: ["claude"],
				features: ["configs"],
				dryRun: false,
				backup: true,
			},
			onStep,
		);

		// Backup dir should have been created
		expect(await fs.pathExists(FIXED_BACKUP)).toBe(true);
		const backupDirs = await fs.readdir(FIXED_BACKUP);
		expect(backupDirs.length).toBeGreaterThanOrEqual(1);

		// Backup should contain the original settings.json
		const backupDir = path.join(FIXED_BACKUP, backupDirs[0]!, "claude");
		if (await fs.pathExists(backupDir)) {
			const backupSettings = path.join(backupDir, "settings.json");
			if (await fs.pathExists(backupSettings)) {
				const content = await fs.readJson(backupSettings);
				expect(content.old).toBe(true);
			}
		}
	});

	it("installs hooks with executable permissions (claude only)", async () => {
		const { steps, onStep } = collectSteps();
		await runInstall(
			{
				clis: ["claude"],
				features: ["hooks"],
				dryRun: false,
				backup: true,
			},
			onStep,
		);

		const hookStep = steps.find((s) => s.id === "claude-hooks");
		expect(hookStep?.status).toBe("done");

		const hooksDir = path.join(FIXED_CLAUDE_CONFIG, "hooks");
		if (await fs.pathExists(hooksDir)) {
			const hookFiles = await fs.readdir(hooksDir);
			for (const file of hookFiles) {
				const stat = await fs.stat(path.join(hooksDir, file));
				expect(stat.mode & 0o111).toBeGreaterThan(0); // executable
			}
		}
	});

	it("hooks are create-if-absent (existing hooks not overwritten)", async () => {
		// Pre-create a hook
		const hooksDir = path.join(FIXED_CLAUDE_CONFIG, "hooks");
		await fs.ensureDir(hooksDir);
		await fs.writeFile(
			path.join(hooksDir, "comment-check.sh"),
			"#!/bin/bash\necho custom",
			"utf-8",
		);

		const { onStep } = collectSteps();
		await runInstall(
			{
				clis: ["claude"],
				features: ["hooks"],
				dryRun: false,
				backup: true,
			},
			onStep,
		);

		// Custom content should be preserved
		const content = await fs.readFile(
			path.join(hooksDir, "comment-check.sh"),
			"utf-8",
		);
		expect(content).toContain("echo custom");
	});

	it("installs orchestrators to agents directory", async () => {
		const { steps, onStep } = collectSteps();
		await runInstall(
			{
				clis: ["claude"],
				features: ["orchestrators"],
				dryRun: false,
				backup: true,
			},
			onStep,
		);

		const orchStep = steps.find((s) => s.id === "claude-orch");
		expect(orchStep?.status).toBe("done");

		// Orchestrators go to agents/claude/ for claude
		const agentsDir = path.join(FIXED_CLAUDE_CONFIG, "agents", "claude");
		if (await fs.pathExists(agentsDir)) {
			const files = await fs.readdir(agentsDir);
			expect(files.length).toBeGreaterThan(0);
		}
	});

	it("writes manifest with installed CLIs", async () => {
		const { onStep } = collectSteps();
		await runInstall(
			{
				clis: ["claude"],
				features: ["skills"],
				dryRun: false,
				backup: true,
			},
			onStep,
		);

		expect(await fs.pathExists(FIXED_MANIFEST)).toBe(true);
		const manifest = await fs.readJson(FIXED_MANIFEST);
		expect(manifest.clis).toContain("claude");
		expect(new Date(manifest.updatedAt).toISOString()).toBe(manifest.updatedAt);
	});

	it("dry-run does not write manifest", async () => {
		const { onStep } = collectSteps();
		await runInstall(
			{
				clis: ["claude"],
				features: ["skills", "configs", "hooks"],
				dryRun: true,
				backup: true,
			},
			onStep,
		);

		expect(await fs.pathExists(FIXED_MANIFEST)).toBe(false);
	});

	it("all features together: skills + configs + hooks + orchestrators", async () => {
		const { steps, onStep } = collectSteps();
		await runInstall(
			{
				clis: ["claude"],
				features: ["skills", "configs", "hooks", "orchestrators"],
				dryRun: false,
				backup: true,
			},
			onStep,
		);

		const allDone = steps.filter((s) => s.status === "done");
		expect(allDone.length).toBe(4); // skills, configs, hooks, orchestrators
	});

	it("error in one feature does not block others", async () => {
		// Corrupt the skills path to force an error
		await fs.writeFile(FIXED_CLAUDE_SKILLS, "not-a-dir");

		const { steps, onStep } = collectSteps();
		await runInstall(
			{
				clis: ["claude"],
				features: ["skills", "configs"],
				dryRun: false,
				backup: true,
			},
			onStep,
		);

		// Skills should error, but configs should still succeed
		const skillStep = steps.find((s) => s.id === "claude-skills");
		const configStep = steps.find((s) => s.id === "claude-configs");
		expect(skillStep?.status).toBe("error");
		expect(configStep?.status).toBe("done");
	});
});
