import fs from "fs-extra";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { FIXED_ASSETS_ROOT } = vi.hoisted(() => {
	const p = require("path");
	const o = require("os");
	return {
		FIXED_ASSETS_ROOT: p.join(o.tmpdir(), "javi-ai-list-test-suite") as string,
	};
});

vi.mock("url", async (importOriginal) => {
	const nodePath = require("path");
	const actual = await importOriginal<typeof import("url")>();
	return {
		...actual,
		fileURLToPath: (url: string | URL) => {
			const urlStr = url.toString();
			if (urlStr.includes("list") && !urlStr.includes("list.test")) {
				return nodePath.join(FIXED_ASSETS_ROOT, "src", "commands", "list.js");
			}
			if (urlStr.includes("skills") && !urlStr.includes("skills.test")) {
				return nodePath.join(
					FIXED_ASSETS_ROOT,
					"src",
					"installer",
					"skills.js",
				);
			}
			return actual.fileURLToPath(url);
		},
	};
});

import { runList } from "./list.js";

async function createListAssetTree(): Promise<void> {
	await fs.remove(FIXED_ASSETS_ROOT);

	const atlSkills = path.join(
		FIXED_ASSETS_ROOT,
		"upstream",
		"agent-teams-lite",
		"skills",
	);
	await fs.ensureDir(path.join(atlSkills, "sdd-explore"));
	await fs.writeFile(
		path.join(atlSkills, "sdd-explore", "SKILL.md"),
		"# SDD Explore",
		"utf-8",
	);

	const gsSkills = path.join(
		FIXED_ASSETS_ROOT,
		"upstream",
		"gentleman-skills",
		"curated",
	);
	await fs.ensureDir(path.join(gsSkills, "react-19"));
	await fs.writeFile(
		path.join(gsSkills, "react-19", "SKILL.md"),
		"# React 19",
		"utf-8",
	);

	const ownSkills = path.join(FIXED_ASSETS_ROOT, "own", "skills");
	await fs.ensureDir(path.join(ownSkills, "my-skill"));
	await fs.writeFile(
		path.join(ownSkills, "my-skill", "SKILL.md"),
		"# My Skill",
		"utf-8",
	);

	// delta overrides dir (empty but must exist for buildAvailableSkillsMap)
	await fs.ensureDir(path.join(FIXED_ASSETS_ROOT, "delta", "overrides"));
}

describe("runList", () => {
	beforeEach(async () => {
		await createListAssetTree();
	});

	afterEach(async () => {
		await fs.remove(FIXED_ASSETS_ROOT);
	});

	it("prints skills grouped by source without throwing", async () => {
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await runList();

		const output = logSpy.mock.calls.map((c) => c[0]).join("\n");

		// Should contain skill names
		expect(output).toContain("sdd-explore");
		expect(output).toContain("react-19");
		expect(output).toContain("my-skill");

		// Should contain group headers
		expect(output).toContain("Upstream");
		expect(output).toContain("Own");

		logSpy.mockRestore();
	});

	it("handles empty asset directories gracefully", async () => {
		await fs.remove(FIXED_ASSETS_ROOT);
		await fs.ensureDir(
			path.join(FIXED_ASSETS_ROOT, "upstream", "agent-teams-lite", "skills"),
		);
		await fs.ensureDir(
			path.join(FIXED_ASSETS_ROOT, "upstream", "gentleman-skills", "curated"),
		);
		await fs.ensureDir(path.join(FIXED_ASSETS_ROOT, "delta", "overrides"));
		await fs.ensureDir(path.join(FIXED_ASSETS_ROOT, "own", "skills"));

		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await runList();

		const output = logSpy.mock.calls.map((c) => c[0]).join("\n");
		expect(output).toContain("No skills found");

		logSpy.mockRestore();
	});
});
