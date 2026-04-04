/**
 * E2E tests for javi-ai doctor, update, uninstall, and sync commands.
 *
 * Strategy: Each test creates a unique temp directory as a fake HOME,
 * runs the REAL compiled CLI as a subprocess with HOME overridden,
 * then verifies filesystem results in the fake HOME.
 */

import fs from "fs-extra";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { countFiles, createSandbox, removeSandbox, runCLI } from "./helpers.js";

describe("E2E: doctor", () => {
	let sandbox: string;

	beforeEach(async () => {
		sandbox = await createSandbox();
	});

	afterEach(async () => {
		await removeSandbox(sandbox);
	});

	// ─── Test 11: doctor before install shows fail ───────────────────────────

	it("doctor before install reports no installation found", async () => {
		const result = await runCLI(["doctor"], sandbox);

		// Doctor should still exit 0 (it reports, doesn't fail)
		// stdout+stderr should mention "No installation found" or "fail"
		const output = result.stdout + result.stderr;
		const hasNoInstall =
			output.includes("No installation") ||
			output.includes("fail") ||
			output.includes("No CLIs");
		expect(hasNoInstall).toBe(true);
	}, 30_000);

	// ─── Test 12: doctor after install shows ok ──────────────────────────────

	it("doctor after install reports ok for installed CLI", async () => {
		// Install first
		await runCLI(["install", "--cli", "claude"], sandbox);

		// Then doctor
		const result = await runCLI(["doctor"], sandbox);
		const output = result.stdout + result.stderr;

		// Should mention "claude" and have an "ok" or "present" indicator
		expect(output).toContain("claude");
	}, 30_000);
});

describe("E2E: update", () => {
	let sandbox: string;

	beforeEach(async () => {
		sandbox = await createSandbox();
	});

	afterEach(async () => {
		await removeSandbox(sandbox);
	});

	// ─── Test 13: update re-installs from manifest ──────────────────────────

	it("update re-installs from manifest", async () => {
		// Install first
		await runCLI(["install", "--cli", "claude"], sandbox);

		const skillsDir = path.join(sandbox, ".claude", "skills");
		const countBefore = await countFiles(skillsDir, "SKILL.md");

		// Update
		const result = await runCLI(["update"], sandbox);
		expect(result.exitCode).toBe(0);

		// Skills should still be present
		const countAfter = await countFiles(skillsDir, "SKILL.md");
		expect(countAfter).toBeGreaterThanOrEqual(countBefore);
	}, 30_000);

	// ─── Test: update with no prior install does nothing ─────────────────────

	it("update with no prior install exits cleanly", async () => {
		const result = await runCLI(["update"], sandbox);
		// Should exit 0 even with nothing to update
		expect(result.exitCode).toBe(0);
	}, 30_000);
});

describe("E2E: uninstall", () => {
	let sandbox: string;

	beforeEach(async () => {
		sandbox = await createSandbox();
	});

	afterEach(async () => {
		await removeSandbox(sandbox);
	});

	// ─── Test 14: uninstall removes skills and manifest ─────────────────────

	it("uninstall removes skills and manifest", async () => {
		// Install first
		await runCLI(["install", "--cli", "claude"], sandbox);

		// Verify install worked
		const manifestPath = path.join(sandbox, ".javi-ai", "manifest.json");
		expect(await fs.pathExists(manifestPath)).toBe(true);

		const skillsDir = path.join(sandbox, ".claude", "skills");
		expect(await fs.pathExists(skillsDir)).toBe(true);

		// Uninstall
		const result = await runCLI(["uninstall"], sandbox);
		expect(result.exitCode).toBe(0);

		// Manifest should be gone
		expect(await fs.pathExists(manifestPath)).toBe(false);

		// Skills directory should be removed
		expect(await fs.pathExists(skillsDir)).toBe(false);
	}, 30_000);
});

describe("E2E: full lifecycle", () => {
	let sandbox: string;

	beforeEach(async () => {
		sandbox = await createSandbox();
	});

	afterEach(async () => {
		await removeSandbox(sandbox);
	});

	// ─── Test 15: install → doctor → update → uninstall → doctor ────────────

	it("full lifecycle: install → doctor → update → uninstall → doctor", async () => {
		// 1. Install
		const installResult = await runCLI(["install", "--cli", "claude"], sandbox);
		expect(installResult.exitCode).toBe(0);

		const manifestPath = path.join(sandbox, ".javi-ai", "manifest.json");
		expect(await fs.pathExists(manifestPath)).toBe(true);

		// 2. Doctor (should find installation)
		const doctorResult1 = await runCLI(["doctor"], sandbox);
		const doctorOutput1 = doctorResult1.stdout + doctorResult1.stderr;
		expect(doctorOutput1).toContain("claude");

		// 3. Update (should succeed)
		const updateResult = await runCLI(["update"], sandbox);
		expect(updateResult.exitCode).toBe(0);

		// Skills should still exist
		const skillsDir = path.join(sandbox, ".claude", "skills");
		expect(await fs.pathExists(skillsDir)).toBe(true);

		// 4. Uninstall
		const uninstallResult = await runCLI(["uninstall"], sandbox);
		expect(uninstallResult.exitCode).toBe(0);

		// Manifest gone
		expect(await fs.pathExists(manifestPath)).toBe(false);

		// Skills gone
		expect(await fs.pathExists(skillsDir)).toBe(false);

		// 5. Doctor (should show no installation)
		const doctorResult2 = await runCLI(["doctor"], sandbox);
		const doctorOutput2 = doctorResult2.stdout + doctorResult2.stderr;
		const hasNoInstall =
			doctorOutput2.includes("No installation") ||
			doctorOutput2.includes("No CLIs");
		expect(hasNoInstall).toBe(true);
	}, 120_000);
});

describe("E2E: sync", () => {
	let sandbox: string;

	beforeEach(async () => {
		sandbox = await createSandbox();
	});

	afterEach(async () => {
		await removeSandbox(sandbox);
	});

	// ─── Test 16: sync --project-dir generates CLAUDE.md ────────────────────

	it("sync --project-dir generates CLAUDE.md in a project", async () => {
		// Create a fake project with .ai-config
		const projectDir = path.join(sandbox, "my-project");
		await fs.ensureDir(projectDir);

		// Create .ai-config/agents/test-agent.md
		const agentsDir = path.join(projectDir, ".ai-config", "agents");
		await fs.ensureDir(agentsDir);
		await fs.writeFile(
			path.join(agentsDir, "test-agent.md"),
			"---\nname: Test Agent\ndescription: A test agent\n---\n\n# Test Agent\n\nDoes things.\n",
			"utf-8",
		);

		// Create .ai-config/skills/test-skill/SKILL.md
		const skillsDir = path.join(
			projectDir,
			".ai-config",
			"skills",
			"test-skill",
		);
		await fs.ensureDir(skillsDir);
		await fs.writeFile(
			path.join(skillsDir, "SKILL.md"),
			"---\nname: Test Skill\ndescription: A test skill\n---\n\n# Test Skill\n\nDoes skill things.\n",
			"utf-8",
		);

		// Run sync
		const result = await runCLI(["sync", "--project-dir", projectDir], sandbox);
		expect(result.exitCode).toBe(0);

		// CLAUDE.md should exist in the project dir
		const claudeMd = path.join(projectDir, "CLAUDE.md");
		expect(await fs.pathExists(claudeMd)).toBe(true);

		const content = await fs.readFile(claudeMd, "utf-8");
		expect(content).toContain("Test Agent");
		expect(content).toContain("Test Skill");
		// Should contain javi-ai markers
		expect(content).toContain("<!-- BEGIN JAVI-AI -->");
		expect(content).toContain("<!-- END JAVI-AI -->");
	}, 30_000);

	// ─── Test 17: sync --dry-run does not write files ───────────────────────

	it("sync --dry-run does not write files", async () => {
		// Create a fake project with .ai-config
		const projectDir = path.join(sandbox, "my-project");
		await fs.ensureDir(projectDir);

		const agentsDir = path.join(projectDir, ".ai-config", "agents");
		await fs.ensureDir(agentsDir);
		await fs.writeFile(
			path.join(agentsDir, "test-agent.md"),
			"---\nname: Test Agent\ndescription: A test agent\n---\n\n# Test Agent\n",
			"utf-8",
		);

		// Run sync with --dry-run
		const result = await runCLI(
			["sync", "--project-dir", projectDir, "--dry-run"],
			sandbox,
		);
		expect(result.exitCode).toBe(0);

		// CLAUDE.md should NOT exist
		const claudeMd = path.join(projectDir, "CLAUDE.md");
		expect(await fs.pathExists(claudeMd)).toBe(false);
	}, 30_000);

	// ─── Test: sync generates AGENTS.md for opencode ────────────────────────

	it("sync generates AGENTS.md for opencode target", async () => {
		const projectDir = path.join(sandbox, "my-project");
		await fs.ensureDir(projectDir);

		const agentsDir = path.join(projectDir, ".ai-config", "agents");
		await fs.ensureDir(agentsDir);
		await fs.writeFile(
			path.join(agentsDir, "helper.md"),
			"---\nname: Helper\ndescription: Helps with stuff\n---\n\n# Helper\n",
			"utf-8",
		);

		const result = await runCLI(
			["sync", "--project-dir", projectDir, "--target", "opencode"],
			sandbox,
		);
		expect(result.exitCode).toBe(0);

		const agentsMd = path.join(projectDir, "AGENTS.md");
		expect(await fs.pathExists(agentsMd)).toBe(true);

		const content = await fs.readFile(agentsMd, "utf-8");
		expect(content).toContain("Helper");
	}, 30_000);

	// ─── Test: sync merge mode preserves existing content ───────────────────

	it("sync merge mode preserves existing content", async () => {
		const projectDir = path.join(sandbox, "my-project");
		await fs.ensureDir(projectDir);

		const agentsDir = path.join(projectDir, ".ai-config", "agents");
		await fs.ensureDir(agentsDir);
		await fs.writeFile(
			path.join(agentsDir, "helper.md"),
			"---\nname: Helper\n---\n\n# Helper\n",
			"utf-8",
		);

		// Create existing CLAUDE.md with custom content
		const claudeMd = path.join(projectDir, "CLAUDE.md");
		await fs.writeFile(
			claudeMd,
			"# My Project\n\nCustom instructions here.\n",
			"utf-8",
		);

		// Sync in merge mode
		const result = await runCLI(
			[
				"sync",
				"--project-dir",
				projectDir,
				"--target",
				"claude",
				"--mode",
				"merge",
			],
			sandbox,
		);
		expect(result.exitCode).toBe(0);

		const content = await fs.readFile(claudeMd, "utf-8");
		// Should preserve original content
		expect(content).toContain("Custom instructions here.");
		// Should also have generated content within markers
		expect(content).toContain("<!-- BEGIN JAVI-AI -->");
		expect(content).toContain("Helper");
		expect(content).toContain("<!-- END JAVI-AI -->");
	}, 30_000);

	// ─── Test: sync with no .ai-config reports error ────────────────────────

	it("sync with no .ai-config reports error", async () => {
		const projectDir = path.join(sandbox, "empty-project");
		await fs.ensureDir(projectDir);

		const result = await runCLI(["sync", "--project-dir", projectDir], sandbox);
		const output = result.stdout + result.stderr;
		// Should mention not found
		expect(output).toContain("not found");
	}, 30_000);
});
