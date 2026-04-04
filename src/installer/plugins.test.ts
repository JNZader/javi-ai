/**
 * plugins.test.ts — Tests for plugin detection, validation, and installation
 *
 * Uses the same mock pattern as skills.test.ts for ASSETS_ROOT redirection.
 */

import fs from "fs-extra";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { FIXED_ASSETS_ROOT, FIXED_CLAUDE_PLUGINS_DEST } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const p = require("path");
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const o = require("os");
	return {
		FIXED_ASSETS_ROOT: p.join(
			o.tmpdir(),
			"javi-ai-plugins-test-suite",
		) as string,
		FIXED_CLAUDE_PLUGINS_DEST: p.join(
			o.tmpdir(),
			"javi-ai-plugins-claude-dest-test",
		) as string,
	};
});

vi.mock("url", async (importOriginal) => {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const nodePath = require("path");
	const actual = await importOriginal<typeof import("url")>();
	return {
		...actual,
		fileURLToPath: (url: string | URL) => {
			const urlStr = url.toString();
			if (urlStr.includes("plugins") && !urlStr.includes("plugins.test")) {
				return nodePath.join(
					FIXED_ASSETS_ROOT,
					"src",
					"installer",
					"plugins.js",
				);
			}
			// Also handle skills.ts import (for detectFormat)
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

vi.mock("../constants.js", () => {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const nodePath = require("path");
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const nodeOs = require("os");
	return {
		CLI_OPTIONS: [
			{
				id: "claude",
				label: "Claude Code",
				configPath: nodePath.join(nodeOs.homedir(), ".claude"),
				skillsPath: nodePath.join(
					nodeOs.tmpdir(),
					"javi-ai-plugins-skills-dest-test",
				),
				pluginsPath: FIXED_CLAUDE_PLUGINS_DEST,
				available: true,
			},
		],
		MANIFEST_PATH: nodePath.join(
			nodeOs.tmpdir(),
			"javi-ai-plugins-manifest-test.json",
		),
		BACKUP_DIR: nodePath.join(nodeOs.tmpdir(), "javi-ai-plugins-backups-test"),
		MARKER_START: "<!-- BEGIN JAVI-AI -->",
		MARKER_END: "<!-- END JAVI-AI -->",
		HOME: nodeOs.homedir(),
	};
});

import type { PluginManifest } from "../types/index.js";
import {
	detectFormat,
	installPluginsForCLI,
	readPluginManifest,
	validatePluginManifest,
} from "./plugins.js";

const VALID_MANIFEST: PluginManifest = {
	name: "test-plugin",
	version: "1.0.0",
	description: "A test plugin",
	dependencies: [],
	compatible_tools: ["claude"],
	triggers: ["test trigger"],
};

async function createPluginTree(): Promise<void> {
	await fs.remove(FIXED_ASSETS_ROOT);

	// Valid plugin in own/plugins
	const pluginDir = path.join(FIXED_ASSETS_ROOT, "own", "plugins", "my-plugin");
	await fs.ensureDir(path.join(pluginDir, "commands"));
	await fs.ensureDir(path.join(pluginDir, "connectors"));
	await fs.ensureDir(path.join(pluginDir, "references"));
	await fs.writeFile(
		path.join(pluginDir, "manifest.json"),
		JSON.stringify(VALID_MANIFEST),
		"utf-8",
	);
	await fs.writeFile(
		path.join(pluginDir, "SKILL.md"),
		"# Test Plugin",
		"utf-8",
	);
	await fs.writeFile(
		path.join(pluginDir, "commands", "do.md"),
		"# Do command",
		"utf-8",
	);
	await fs.writeFile(
		path.join(pluginDir, "connectors", "tool.json"),
		JSON.stringify({ name: "tool" }),
		"utf-8",
	);
	await fs.writeFile(
		path.join(pluginDir, "references", "deep.md"),
		"# Deep context",
		"utf-8",
	);

	// Plugin with CLI restriction (opencode only)
	const restrictedDir = path.join(
		FIXED_ASSETS_ROOT,
		"own",
		"plugins",
		"opencode-only",
	);
	await fs.ensureDir(restrictedDir);
	await fs.writeFile(
		path.join(restrictedDir, "manifest.json"),
		JSON.stringify({
			...VALID_MANIFEST,
			name: "opencode-only",
			compatible_tools: ["opencode"],
		}),
		"utf-8",
	);
	await fs.writeFile(
		path.join(restrictedDir, "SKILL.md"),
		"# OpenCode Only",
		"utf-8",
	);

	// Legacy skill (no manifest.json) — should be skipped
	const legacyDir = path.join(
		FIXED_ASSETS_ROOT,
		"own",
		"plugins",
		"legacy-skill",
	);
	await fs.ensureDir(legacyDir);
	await fs.writeFile(path.join(legacyDir, "SKILL.md"), "# Legacy", "utf-8");

	// Plugin with invalid manifest
	const invalidDir = path.join(
		FIXED_ASSETS_ROOT,
		"own",
		"plugins",
		"bad-plugin",
	);
	await fs.ensureDir(invalidDir);
	await fs.writeFile(
		path.join(invalidDir, "manifest.json"),
		"{ broken json",
		"utf-8",
	);
	await fs.writeFile(path.join(invalidDir, "SKILL.md"), "# Bad", "utf-8");

	// Plugin with no compatible_tools (should install for all CLIs)
	const universalDir = path.join(
		FIXED_ASSETS_ROOT,
		"own",
		"plugins",
		"universal-plugin",
	);
	await fs.ensureDir(universalDir);
	await fs.writeFile(
		path.join(universalDir, "manifest.json"),
		JSON.stringify({
			name: "universal-plugin",
			version: "1.0.0",
			description: "Works everywhere",
		}),
		"utf-8",
	);
	await fs.writeFile(
		path.join(universalDir, "SKILL.md"),
		"# Universal",
		"utf-8",
	);

	// Dotfile directory — should be skipped
	const dotDir = path.join(FIXED_ASSETS_ROOT, "own", "plugins", ".hidden");
	await fs.ensureDir(dotDir);
	await fs.writeFile(
		path.join(dotDir, "manifest.json"),
		JSON.stringify(VALID_MANIFEST),
		"utf-8",
	);
}

describe("detectFormat", () => {
	beforeEach(async () => {
		await createPluginTree();
	});

	afterEach(async () => {
		await fs.remove(FIXED_ASSETS_ROOT);
	});

	it('returns "plugin" when manifest.json exists', async () => {
		const pluginDir = path.join(
			FIXED_ASSETS_ROOT,
			"own",
			"plugins",
			"my-plugin",
		);
		expect(await detectFormat(pluginDir)).toBe("plugin");
	});

	it('returns "legacy-skill" when manifest.json does not exist', async () => {
		const legacyDir = path.join(
			FIXED_ASSETS_ROOT,
			"own",
			"plugins",
			"legacy-skill",
		);
		expect(await detectFormat(legacyDir)).toBe("legacy-skill");
	});
});

describe("readPluginManifest", () => {
	beforeEach(async () => {
		await createPluginTree();
	});

	afterEach(async () => {
		await fs.remove(FIXED_ASSETS_ROOT);
	});

	it("parses valid manifest", async () => {
		const dir = path.join(FIXED_ASSETS_ROOT, "own", "plugins", "my-plugin");
		const manifest = await readPluginManifest(dir);
		expect(manifest).not.toBeNull();
		expect(manifest!.name).toBe("test-plugin");
		expect(manifest!.version).toBe("1.0.0");
	});

	it("returns null for invalid JSON", async () => {
		const dir = path.join(FIXED_ASSETS_ROOT, "own", "plugins", "bad-plugin");
		const manifest = await readPluginManifest(dir);
		expect(manifest).toBeNull();
	});

	it("returns null for non-existent directory", async () => {
		const dir = path.join(
			FIXED_ASSETS_ROOT,
			"own",
			"plugins",
			"does-not-exist",
		);
		const manifest = await readPluginManifest(dir);
		expect(manifest).toBeNull();
	});

	it("returns null for manifest missing name", async () => {
		const dir = path.join(os.tmpdir(), "javi-ai-plugins-test-no-name");
		await fs.ensureDir(dir);
		await fs.writeFile(
			path.join(dir, "manifest.json"),
			JSON.stringify({ version: "1.0.0", description: "test" }),
			"utf-8",
		);
		const manifest = await readPluginManifest(dir);
		expect(manifest).toBeNull();
		await fs.remove(dir);
	});
});

describe("validatePluginManifest", () => {
	it("returns empty array for valid manifest", () => {
		const errors = validatePluginManifest(VALID_MANIFEST);
		expect(errors).toEqual([]);
	});

	it("detects missing name", () => {
		const errors = validatePluginManifest({ ...VALID_MANIFEST, name: "" });
		expect(errors).toContain("missing required field: name");
	});

	it("detects missing version", () => {
		const errors = validatePluginManifest({ ...VALID_MANIFEST, version: "" });
		expect(errors).toContain("missing required field: version");
	});

	it("detects missing description", () => {
		const errors = validatePluginManifest({
			...VALID_MANIFEST,
			description: "",
		});
		expect(errors).toContain("missing required field: description");
	});

	it("detects non-array dependencies", () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const errors = validatePluginManifest({
			...VALID_MANIFEST,
			dependencies: "bad" as any,
		});
		expect(errors).toContain("dependencies must be an array");
	});

	it("detects non-array compatible_tools", () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const errors = validatePluginManifest({
			...VALID_MANIFEST,
			compatible_tools: "bad" as any,
		});
		expect(errors).toContain("compatible_tools must be an array");
	});

	it("detects non-array triggers", () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const errors = validatePluginManifest({
			...VALID_MANIFEST,
			triggers: "bad" as any,
		});
		expect(errors).toContain("triggers must be an array");
	});
});

describe("installPluginsForCLI", () => {
	beforeEach(async () => {
		await createPluginTree();
		await fs.remove(FIXED_CLAUDE_PLUGINS_DEST);
	});

	afterEach(async () => {
		await fs.remove(FIXED_CLAUDE_PLUGINS_DEST);
	});

	it("returns [] for unknown cli", async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = await installPluginsForCLI("unknown" as any, true);
		expect(result).toEqual([]);
	});

	it("dryRun: returns installed plugin names without creating files", async () => {
		const result = await installPluginsForCLI("claude", true);
		expect(result).toContain("my-plugin");
		expect(result).toContain("universal-plugin");
		expect(await fs.pathExists(FIXED_CLAUDE_PLUGINS_DEST)).toBe(false);
	});

	it("dryRun: skips plugins restricted to other CLIs", async () => {
		const result = await installPluginsForCLI("claude", true);
		expect(result).not.toContain("opencode-only");
	});

	it("dryRun: skips legacy skills without manifest.json", async () => {
		const result = await installPluginsForCLI("claude", true);
		expect(result).not.toContain("legacy-skill");
	});

	it("dryRun: skips plugins with invalid manifest", async () => {
		const result = await installPluginsForCLI("claude", true);
		expect(result).not.toContain("bad-plugin");
	});

	it("dryRun: skips dotfile directories", async () => {
		const result = await installPluginsForCLI("claude", true);
		expect(result).not.toContain(".hidden");
	});

	it("installs valid plugin with all subdirectories", async () => {
		await installPluginsForCLI("claude", false);

		const dest = path.join(FIXED_CLAUDE_PLUGINS_DEST, "my-plugin");
		expect(await fs.pathExists(path.join(dest, "manifest.json"))).toBe(true);
		expect(await fs.pathExists(path.join(dest, "SKILL.md"))).toBe(true);
		expect(await fs.pathExists(path.join(dest, "commands", "do.md"))).toBe(
			true,
		);
		expect(
			await fs.pathExists(path.join(dest, "connectors", "tool.json")),
		).toBe(true);
		expect(await fs.pathExists(path.join(dest, "references", "deep.md"))).toBe(
			true,
		);
	});

	it("installs universal plugin (no compatible_tools restriction)", async () => {
		await installPluginsForCLI("claude", false);
		expect(
			await fs.pathExists(
				path.join(FIXED_CLAUDE_PLUGINS_DEST, "universal-plugin", "SKILL.md"),
			),
		).toBe(true);
	});

	it("does not install CLI-restricted plugin", async () => {
		await installPluginsForCLI("claude", false);
		expect(
			await fs.pathExists(
				path.join(FIXED_CLAUDE_PLUGINS_DEST, "opencode-only"),
			),
		).toBe(false);
	});

	it("handles missing own/plugins directory gracefully", async () => {
		await fs.remove(path.join(FIXED_ASSETS_ROOT, "own", "plugins"));
		const result = await installPluginsForCLI("claude", false);
		expect(result).toEqual([]);
	});

	it("overwrites plugin on reinstall", async () => {
		await installPluginsForCLI("claude", false);

		// Modify installed content
		const dest = path.join(FIXED_CLAUDE_PLUGINS_DEST, "my-plugin", "SKILL.md");
		await fs.writeFile(dest, "# Modified", "utf-8");

		// Reinstall
		await installPluginsForCLI("claude", false);
		const content = await fs.readFile(dest, "utf-8");
		expect(content).toBe("# Test Plugin");
	});
});
