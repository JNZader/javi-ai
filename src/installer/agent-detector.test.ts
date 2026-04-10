import { execSync } from "node:child_process";
import fs from "fs-extra";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CLIOption } from "../types/index.js";
import { detectAgents, getDetectedCLIs } from "./agent-detector.js";

vi.mock("node:child_process", () => ({
	execSync: vi.fn(),
}));

vi.mock("fs-extra", async (importOriginal) => {
	const actual = await importOriginal<typeof import("fs-extra")>();
	return {
		...actual,
		default: {
			...actual,
			pathExistsSync: vi.fn(),
		},
		pathExistsSync: vi.fn(),
	};
});

const mockExecSync = vi.mocked(execSync);
const mockPathExistsSync = vi.mocked(fs.pathExistsSync);

const TEST_OPTIONS: CLIOption[] = [
	{
		id: "claude",
		label: "Claude Code",
		configPath: "/home/test/.claude",
		skillsPath: "/home/test/.claude/skills",
		pluginsPath: "/home/test/.claude/plugins",
		available: true,
	},
	{
		id: "opencode",
		label: "OpenCode",
		configPath: "/home/test/.config/opencode",
		skillsPath: "/home/test/.config/opencode/skill",
		pluginsPath: "/home/test/.config/opencode/plugins",
		available: true,
	},
	{
		id: "gemini",
		label: "Gemini CLI",
		configPath: "/home/test/.gemini",
		skillsPath: "/home/test/.gemini/skills",
		pluginsPath: "/home/test/.gemini/plugins",
		available: true,
	},
];

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("detectAgents", () => {
	it("detects agent when binary is found in PATH", () => {
		mockExecSync.mockImplementation((cmd) => {
			const cmdStr = String(cmd);
			if (cmdStr.includes("which claude")) return "/usr/local/bin/claude\n";
			throw new Error("not found");
		});
		mockPathExistsSync.mockReturnValue(false);

		const results = detectAgents(TEST_OPTIONS);
		const claude = results.find((r) => r.id === "claude");

		expect(claude).toBeDefined();
		expect(claude?.detected).toBe(true);
		expect(claude?.reason).toBe("binary");
		expect(claude?.binaryPath).toBe("/usr/local/bin/claude");
	});

	it("detects agent when config directory exists but no binary", () => {
		mockExecSync.mockImplementation(() => {
			throw new Error("not found");
		});
		mockPathExistsSync.mockImplementation((p) => {
			return String(p) === "/home/test/.gemini";
		});

		const results = detectAgents(TEST_OPTIONS);
		const gemini = results.find((r) => r.id === "gemini");

		expect(gemini).toBeDefined();
		expect(gemini?.detected).toBe(true);
		expect(gemini?.reason).toBe("config-dir");
		expect(gemini?.binaryPath).toBeUndefined();
		expect(gemini?.configPath).toBe("/home/test/.gemini");
	});

	it("marks agent as not-found when neither binary nor config dir exists", () => {
		mockExecSync.mockImplementation(() => {
			throw new Error("not found");
		});
		mockPathExistsSync.mockReturnValue(false);

		const results = detectAgents(TEST_OPTIONS);
		const opencode = results.find((r) => r.id === "opencode");

		expect(opencode).toBeDefined();
		expect(opencode?.detected).toBe(false);
		expect(opencode?.reason).toBe("not-found");
	});

	it("returns results for all provided CLI options", () => {
		mockExecSync.mockImplementation(() => {
			throw new Error("not found");
		});
		mockPathExistsSync.mockReturnValue(false);

		const results = detectAgents(TEST_OPTIONS);
		expect(results).toHaveLength(3);
		expect(results.map((r) => r.id)).toEqual(["claude", "opencode", "gemini"]);
	});

	it("prioritizes binary detection over config-dir", () => {
		mockExecSync.mockImplementation((cmd) => {
			const cmdStr = String(cmd);
			if (cmdStr.includes("which claude")) return "/usr/bin/claude\n";
			throw new Error("not found");
		});
		mockPathExistsSync.mockReturnValue(true); // config dir also exists

		const results = detectAgents(TEST_OPTIONS);
		const claude = results.find((r) => r.id === "claude");

		expect(claude).toBeDefined();
		expect(claude?.detected).toBe(true);
		expect(claude?.reason).toBe("binary");
		expect(claude?.binaryPath).toBe("/usr/bin/claude");
	});

	it("handles multiple binary names for copilot", () => {
		const copilotOption: CLIOption = {
			id: "copilot",
			label: "GitHub Copilot",
			configPath: "/home/test/.copilot",
			skillsPath: "/home/test/.copilot/skills",
			pluginsPath: "/home/test/.copilot/plugins",
			available: true,
		};

		mockExecSync.mockImplementation((cmd) => {
			const cmdStr = String(cmd);
			if (cmdStr.includes("github-copilot-cli")) throw new Error("not found");
			if (cmdStr.includes("copilot")) return "/usr/local/bin/copilot\n";
			throw new Error("not found");
		});
		mockPathExistsSync.mockReturnValue(false);

		const results = detectAgents([copilotOption]);
		expect(results[0].detected).toBe(true);
		expect(results[0].reason).toBe("binary");
	});

	it("handles execSync timeout gracefully", () => {
		mockExecSync.mockImplementation(() => {
			const err = new Error("timeout");
			(err as NodeJS.ErrnoException).code = "ETIMEDOUT";
			throw err;
		});
		mockPathExistsSync.mockReturnValue(false);

		const results = detectAgents(TEST_OPTIONS);
		expect(results.every((r) => !r.detected)).toBe(true);
	});

	it("handles empty which output", () => {
		mockExecSync.mockReturnValue("  \n");
		mockPathExistsSync.mockReturnValue(false);

		const results = detectAgents(TEST_OPTIONS);
		// Empty string after trim is falsy, should fall through to config-dir check
		expect(results.every((r) => !r.detected)).toBe(true);
	});
});

describe("getDetectedCLIs", () => {
	it("returns only detected CLI IDs", () => {
		mockExecSync.mockImplementation((cmd) => {
			const cmdStr = String(cmd);
			if (cmdStr.includes("which claude")) return "/usr/bin/claude\n";
			throw new Error("not found");
		});
		mockPathExistsSync.mockImplementation((p) => {
			return String(p) === "/home/test/.gemini";
		});

		const clis = getDetectedCLIs(TEST_OPTIONS);
		expect(clis).toEqual(["claude", "gemini"]);
	});

	it("returns empty array when nothing is detected", () => {
		mockExecSync.mockImplementation(() => {
			throw new Error("not found");
		});
		mockPathExistsSync.mockReturnValue(false);

		const clis = getDetectedCLIs(TEST_OPTIONS);
		expect(clis).toEqual([]);
	});
});
