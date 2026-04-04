/**
 * E2E tests for javi-ai install command.
 *
 * Strategy: Each test creates a unique temp directory as a fake HOME,
 * runs the REAL compiled CLI as a subprocess with HOME overridden,
 * then verifies filesystem results in the fake HOME.
 */

import fs from "fs-extra";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	countFiles,
	createSandbox,
	listDirs,
	removeSandbox,
	runCLI,
} from "./helpers.js";

describe("E2E: install", () => {
	let sandbox: string;

	beforeEach(async () => {
		sandbox = await createSandbox();
	});

	afterEach(async () => {
		await removeSandbox(sandbox);
	});

	// ─── Test 1: dry-run produces output without creating files ──────────────

	it("dry-run produces output without creating files", async () => {
		const result = await runCLI(
			["install", "--dry-run", "--cli", "claude"],
			sandbox,
		);

		// Should not create .claude/ directory
		const claudeDir = path.join(sandbox, ".claude");
		expect(await fs.pathExists(claudeDir)).toBe(false);

		// Should not create manifest
		const manifestPath = path.join(sandbox, ".javi-ai", "manifest.json");
		expect(await fs.pathExists(manifestPath)).toBe(false);
	}, 30_000);

	// ─── Test 2: install --cli claude creates skills directory ───────────────

	it("install --cli claude creates skills directory with real skills", async () => {
		const result = await runCLI(["install", "--cli", "claude"], sandbox);

		expect(result.exitCode).toBe(0);

		// Skills directory must exist
		const skillsDir = path.join(sandbox, ".claude", "skills");
		expect(await fs.pathExists(skillsDir)).toBe(true);

		// At least 30 SKILL.md files (upstream ~36 + own ~4 = ~40)
		const skillMdCount = await countFiles(skillsDir, "SKILL.md");
		expect(skillMdCount).toBeGreaterThanOrEqual(30);
	}, 30_000);

	// ─── Test 3: install --cli claude creates configs ────────────────────────

	it("install --cli claude creates configs", async () => {
		await runCLI(["install", "--cli", "claude"], sandbox);

		// CLAUDE.md must exist and be non-empty
		const claudeMd = path.join(sandbox, ".claude", "CLAUDE.md");
		expect(await fs.pathExists(claudeMd)).toBe(true);
		const content = await fs.readFile(claudeMd, "utf-8");
		expect(content.length).toBeGreaterThan(0);

		// settings.json must exist and be valid JSON
		const settingsJson = path.join(sandbox, ".claude", "settings.json");
		expect(await fs.pathExists(settingsJson)).toBe(true);
		const settingsContent = await fs.readFile(settingsJson, "utf-8");
		expect(() => JSON.parse(settingsContent)).not.toThrow();
	}, 30_000);

	// ─── Test 4: install --cli claude creates hooks ──────────────────────────

	it("install --cli claude creates hooks", async () => {
		await runCLI(["install", "--cli", "claude"], sandbox);

		const hooksDir = path.join(sandbox, ".claude", "hooks");
		expect(await fs.pathExists(hooksDir)).toBe(true);

		// comment-check.sh must exist and be executable
		const commentCheck = path.join(hooksDir, "comment-check.sh");
		expect(await fs.pathExists(commentCheck)).toBe(true);
		const commentStat = await fs.stat(commentCheck);
		expect(commentStat.mode & 0o111).toBeGreaterThan(0); // executable

		// todo-tracker.sh must exist and be executable
		const todoTracker = path.join(hooksDir, "todo-tracker.sh");
		expect(await fs.pathExists(todoTracker)).toBe(true);
		const todoStat = await fs.stat(todoTracker);
		expect(todoStat.mode & 0o111).toBeGreaterThan(0); // executable
	}, 30_000);

	// ─── Test 5: install --cli claude creates orchestrators ──────────────────

	it("install --cli claude creates orchestrators", async () => {
		await runCLI(["install", "--cli", "claude"], sandbox);

		// Orchestrators go to .claude/agents/claude/
		const agentsDir = path.join(sandbox, ".claude", "agents", "claude");
		expect(await fs.pathExists(agentsDir)).toBe(true);

		// Should have orchestrator .md files
		const files = await fs.readdir(agentsDir);
		const mdFiles = files.filter((f) => f.endsWith(".md"));
		expect(mdFiles.length).toBeGreaterThanOrEqual(1);
	}, 30_000);

	// ─── Test 6: install --cli opencode creates correct paths ────────────────

	it("install --cli opencode creates correct paths", async () => {
		const result = await runCLI(["install", "--cli", "opencode"], sandbox);

		expect(result.exitCode).toBe(0);

		// Skills path for opencode
		const skillsDir = path.join(sandbox, ".config", "opencode", "skill");
		expect(await fs.pathExists(skillsDir)).toBe(true);
		const skillMdCount = await countFiles(skillsDir, "SKILL.md");
		expect(skillMdCount).toBeGreaterThanOrEqual(30);

		// opencode.json config
		const opencodeJson = path.join(
			sandbox,
			".config",
			"opencode",
			"opencode.json",
		);
		expect(await fs.pathExists(opencodeJson)).toBe(true);
		const jsonContent = await fs.readFile(opencodeJson, "utf-8");
		expect(() => JSON.parse(jsonContent)).not.toThrow();
	}, 30_000);

	// ─── Test 7: install --cli claude,opencode installs both ─────────────────

	it("install --cli claude,opencode installs both", async () => {
		const result = await runCLI(
			["install", "--cli", "claude,opencode"],
			sandbox,
		);

		expect(result.exitCode).toBe(0);

		// Claude skills
		const claudeSkills = path.join(sandbox, ".claude", "skills");
		expect(await fs.pathExists(claudeSkills)).toBe(true);

		// OpenCode skills
		const opencodeSkills = path.join(sandbox, ".config", "opencode", "skill");
		expect(await fs.pathExists(opencodeSkills)).toBe(true);
	}, 30_000);

	// ─── Test 8: install creates manifest ────────────────────────────────────

	it("install creates manifest", async () => {
		await runCLI(["install", "--cli", "claude"], sandbox);

		const manifestPath = path.join(sandbox, ".javi-ai", "manifest.json");
		expect(await fs.pathExists(manifestPath)).toBe(true);

		const manifest = await fs.readJSON(manifestPath);
		expect(manifest).toHaveProperty("clis");
		expect(manifest.clis).toContain("claude");
		expect(manifest).toHaveProperty("version");
		expect(manifest).toHaveProperty("installedAt");
		expect(manifest).toHaveProperty("updatedAt");
	}, 30_000);

	// ─── Test 9: double install is idempotent ────────────────────────────────

	it("double install is idempotent (no errors)", async () => {
		// First install
		const first = await runCLI(["install", "--cli", "claude"], sandbox);
		expect(first.exitCode).toBe(0);

		const skillsDir = path.join(sandbox, ".claude", "skills");
		const firstCount = await countFiles(skillsDir, "SKILL.md");

		// Second install
		const second = await runCLI(["install", "--cli", "claude"], sandbox);
		expect(second.exitCode).toBe(0);

		// Same skill count
		const secondCount = await countFiles(skillsDir, "SKILL.md");
		expect(secondCount).toBe(firstCount);
	}, 60_000);

	// ─── Test 10: extension content is appended correctly ────────────────────

	it("extension content is appended to upstream skills", async () => {
		await runCLI(["install", "--cli", "claude"], sandbox);

		// sdd-explore has an EXTENSION.md
		const sddExplore = path.join(
			sandbox,
			".claude",
			"skills",
			"sdd-explore",
			"SKILL.md",
		);
		expect(await fs.pathExists(sddExplore)).toBe(true);

		const content = await fs.readFile(sddExplore, "utf-8");

		// Must contain the separator between upstream and extension
		expect(content).toContain("---");

		// Must contain extension content
		expect(content).toContain("Extensions");
	}, 30_000);

	// ─── Test: _shared directory is installed ────────────────────────────────

	it("installs _shared conventions directory", async () => {
		await runCLI(["install", "--cli", "claude"], sandbox);

		const sharedDir = path.join(sandbox, ".claude", "skills", "_shared");
		expect(await fs.pathExists(sharedDir)).toBe(true);

		const persistenceContract = path.join(sharedDir, "persistence-contract.md");
		expect(await fs.pathExists(persistenceContract)).toBe(true);
	}, 30_000);

	// ─── Test: own skills are installed ──────────────────────────────────────

	it("installs own skills (skill-creator)", async () => {
		await runCLI(["install", "--cli", "claude"], sandbox);

		const skillCreator = path.join(
			sandbox,
			".claude",
			"skills",
			"skill-creator",
			"SKILL.md",
		);
		expect(await fs.pathExists(skillCreator)).toBe(true);
	}, 30_000);

	// ─── Test: manifest records multiple CLIs ────────────────────────────────

	it("manifest records multiple CLIs when installed together", async () => {
		await runCLI(["install", "--cli", "claude,opencode"], sandbox);

		const manifestPath = path.join(sandbox, ".javi-ai", "manifest.json");
		const manifest = await fs.readJSON(manifestPath);
		expect(manifest.clis).toContain("claude");
		expect(manifest.clis).toContain("opencode");
	}, 30_000);
});
