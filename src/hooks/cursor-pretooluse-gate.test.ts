import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	decideCursorPreToolUse,
	runCursorPreToolUseHook,
} from "./cursor-pretooluse-gate.js";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const missingPolicyPath = "/tmp/does-not-exist-cursor-policy";
const hookDir = join(repoRoot, "own/cursor-hooks/pretooluse-gate");
const validStdin = JSON.stringify({
	toolName: "Shell",
	toolInput: { command: "echo hi" },
	hookEventName: "preToolUse",
});
const cursorSnakeStdin = JSON.stringify({
	tool_name: "Shell",
	tool_input: { command: "echo hi" },
	hook_event_name: "preToolUse",
});

describe("decideCursorPreToolUse", () => {
	it("denies when the policy file is missing", () => {
		expect(
			decideCursorPreToolUse({
				toolName: "Shell",
				policyPath: missingPolicyPath,
			}),
		).toEqual({
			decision: "deny",
			reason: "PreToolUse policy is missing or unreadable",
		});
	});

	it("denies when the reader throws", () => {
		expect(
			decideCursorPreToolUse({
				toolName: "Shell",
				policyPath: missingPolicyPath,
				readFile: () => {
					throw new Error("permission denied");
				},
			}),
		).toEqual({
			decision: "deny",
			reason: "PreToolUse policy is missing or unreadable",
		});
	});

	it("allows when a temp policy file is readable", () => {
		const dir = mkdtempSync(join(tmpdir(), "cursor-pretooluse-"));
		const policyFile = join(dir, "pretooluse.policy");
		writeFileSync(policyFile, "policy: allow\n");

		expect(
			decideCursorPreToolUse({
				toolName: "Shell",
				toolInput: "{}",
				policyPath: policyFile,
			}),
		).toEqual({ decision: "allow" });
	});
});

describe("runCursorPreToolUseHook", () => {
	it("denies with exit 2 for invalid stdin", () => {
		const result = runCursorPreToolUseHook("not-json", missingPolicyPath);

		expect(result.exitCode).toBe(2);
		expect(JSON.parse(result.stdout)).toEqual(
			expect.objectContaining({ decision: "deny" }),
		);
	});

	it("denies with exit 2 when toolName is missing", () => {
		const result = runCursorPreToolUseHook(
			JSON.stringify({ toolInput: {} }),
			missingPolicyPath,
		);

		expect(result.exitCode).toBe(2);
		expect(JSON.parse(result.stdout)).toEqual(
			expect.objectContaining({ decision: "deny" }),
		);
	});

	it("allows with exit 0 for valid stdin and a readable policy", () => {
		const dir = mkdtempSync(join(tmpdir(), "cursor-pretooluse-hook-"));
		const policyFile = join(dir, "pretooluse.policy");
		writeFileSync(policyFile, "policy: allow\n");

		const result = runCursorPreToolUseHook(validStdin, policyFile);

		expect(result.exitCode).toBe(0);
		expect(JSON.parse(result.stdout)).toEqual({ decision: "allow" });
	});

	it("allows Cursor snake_case stdin when the policy is readable", () => {
		const dir = mkdtempSync(join(tmpdir(), "cursor-pretooluse-snake-"));
		const policyFile = join(dir, "pretooluse.policy");
		writeFileSync(policyFile, "policy: allow\n");

		const result = runCursorPreToolUseHook(cursorSnakeStdin, policyFile);

		expect(result.exitCode).toBe(0);
		expect(JSON.parse(result.stdout)).toEqual({ decision: "allow" });
	});
});

describe("pretooluse-hook.mjs", () => {
	it("prints deny and exits 2 when JAVI_AI_PRETOOLUSE_POLICY points at a missing file", () => {
		const hookPath = join(hookDir, "pretooluse-hook.mjs");
		const result = spawnSync(process.execPath, [hookPath], {
			cwd: repoRoot,
			encoding: "utf8",
			input: validStdin,
			env: {
				...process.env,
				JAVI_AI_PRETOOLUSE_POLICY: missingPolicyPath,
			},
		});

		expect(result.status).toBe(2);
		expect(JSON.parse(result.stdout)).toEqual(
			expect.objectContaining({ decision: "deny" }),
		);
	});
});

describe("shipped Cursor hooks.json snippet", () => {
	it("uses camelCase preToolUse with failClosed true", () => {
		const hooks = JSON.parse(
			readFileSync(join(hookDir, "hooks.json"), "utf8"),
		) as {
			hooks?: { preToolUse?: Array<{ failClosed?: boolean }> };
		};

		expect(hooks.hooks?.preToolUse).toEqual(
			expect.arrayContaining([expect.objectContaining({ failClosed: true })]),
		);
		expect(JSON.stringify(hooks)).not.toMatch(/"PreToolUse"/);
	});
});
