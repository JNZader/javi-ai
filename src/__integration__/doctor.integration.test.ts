/**
 * Integration tests for runDoctor — health checks with real filesystem.
 * Mocks only paths and execFile (for `which` command).
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
	const root = p.join(o.tmpdir(), `javi-ai-doctor-test-${Date.now()}`);
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
	AI_CLI_CONFIG_FILES: { claude: "CLAUDE.md" },
}));

vi.mock("child_process", () => ({
	execFile: vi.fn((_cmd: string, args: string[], cb: Function) => {
		const tool = args?.[0] ?? "";
		if (tool === "claude")
			cb(null, { stdout: "/usr/bin/claude\n", stderr: "" });
		else cb(new Error("not found"), { stdout: "", stderr: "" });
	}),
}));

vi.mock("../installer/manifest.js", () => ({
	readManifest: async () => {
		const fse = require("fs-extra");
		if (await fse.pathExists(FIXED_MANIFEST))
			return fse.readJson(FIXED_MANIFEST);
		return {
			version: "1.0.0",
			clis: [],
			installedAt: "",
			updatedAt: "",
			skills: {},
		};
	},
}));

import { runDoctor } from "../commands/doctor.js";

describe("runDoctor() — integration", () => {
	beforeEach(async () => {
		await fs.ensureDir(FIXED_HOME);
	});

	afterEach(async () => {
		await fs.remove(FIXED_ROOT);
	});

	it("reports no installation when manifest is missing", async () => {
		const result = await runDoctor();
		const installSection = result.sections.find(
			(s) => s.title === "Installation",
		);
		expect(installSection).toBeDefined();
		const installCheck = installSection!.checks.find((c) =>
			c.label.includes("No installation"),
		);
		expect(installCheck?.status).toBe("fail");
	});

	it("reports installed CLIs when manifest exists", async () => {
		await fs.ensureDir(path.dirname(FIXED_MANIFEST));
		await fs.writeJson(FIXED_MANIFEST, {
			version: "1.0.0",
			clis: ["claude"],
			installedAt: "2026-03-22T00:00:00Z",
			updatedAt: "2026-03-22T00:00:00Z",
			skills: {},
		});

		const result = await runDoctor();
		const installSection = result.sections.find(
			(s) => s.title === "Installation",
		);
		const installCheck = installSection!.checks.find((c) => c.status === "ok");
		expect(installCheck).toBeDefined();
	});

	it("skills section shows count when skills installed", async () => {
		await fs.ensureDir(path.dirname(FIXED_MANIFEST));
		await fs.writeJson(FIXED_MANIFEST, {
			version: "1.0.0",
			clis: ["claude"],
			installedAt: "",
			updatedAt: "",
			skills: {},
		});

		// Create some skills
		for (const skill of ["react-19", "typescript", "sdd-apply"]) {
			await fs.ensureDir(path.join(FIXED_CLAUDE_SKILLS, skill));
			await fs.writeFile(
				path.join(FIXED_CLAUDE_SKILLS, skill, "SKILL.md"),
				`# ${skill}`,
			);
		}

		const result = await runDoctor();
		const skillsSection = result.sections.find((s) => s.title === "Skills");
		expect(skillsSection).toBeDefined();
		const claudeSkills = skillsSection!.checks.find((c) =>
			c.label.includes("claude"),
		);
		expect(claudeSkills).toBeDefined();
		expect(claudeSkills!.detail).toContain("3");
	});

	it("config section shows present/missing config files", async () => {
		await fs.ensureDir(path.dirname(FIXED_MANIFEST));
		await fs.writeJson(FIXED_MANIFEST, {
			version: "1.0.0",
			clis: ["claude"],
			installedAt: "",
			updatedAt: "",
			skills: {},
		});

		// Create CLAUDE.md
		await fs.ensureDir(FIXED_CLAUDE_CONFIG);
		await fs.writeFile(path.join(FIXED_CLAUDE_CONFIG, "CLAUDE.md"), "# Config");

		const result = await runDoctor();
		const configSection = result.sections.find(
			(s) => s.title === "Config Files",
		);
		expect(configSection).toBeDefined();
		const claudeConfig = configSection!.checks.find((c) =>
			c.label.includes("CLAUDE.md"),
		);
		expect(claudeConfig?.status).toBe("ok");
	});

	it("backup section lists backup directories", async () => {
		await fs.ensureDir(path.dirname(FIXED_MANIFEST));
		await fs.writeJson(FIXED_MANIFEST, {
			version: "1.0.0",
			clis: ["claude"],
			installedAt: "",
			updatedAt: "",
			skills: {},
		});

		// Create backups
		for (const ts of ["2026-03-20T00-00-00", "2026-03-21T00-00-00"]) {
			const dir = path.join(FIXED_BACKUP, ts, "claude");
			await fs.ensureDir(dir);
			await fs.writeFile(path.join(dir, "settings.json"), "{}");
		}

		const result = await runDoctor();
		const backupSection = result.sections.find((s) => s.title === "Backups");
		expect(backupSection).toBeDefined();
		expect(backupSection!.checks.length).toBeGreaterThanOrEqual(2);
	});

	it("returns sections array with all expected sections", async () => {
		const result = await runDoctor();
		const titles = result.sections.map((s) => s.title);
		expect(titles).toContain("Installation");
		expect(titles).toContain("CLI Detection");
		expect(titles).toContain("Skills");
		expect(titles).toContain("Config Files");
	});
});
