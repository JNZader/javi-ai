import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	decideGrokPreToolUse,
	runGrokPreToolUseHook,
} from "./grok-pretooluse-gate.js";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const missingPolicyPath = "/tmp/does-not-exist-grok-policy";
const validStdin = JSON.stringify({
	toolName: "Bash",
	toolInput: { command: "echo hi" },
	hookEventName: "PreToolUse",
});

describe("decideGrokPreToolUse", () => {
	it("denies when the policy file is missing", () => {
		expect(
			decideGrokPreToolUse({
				toolName: "Bash",
				policyPath: missingPolicyPath,
			}),
		).toEqual({
			decision: "deny",
			reason: "PreToolUse policy is missing or unreadable",
		});
	});

	it("denies when the reader throws", () => {
		expect(
			decideGrokPreToolUse({
				toolName: "Bash",
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
		const dir = mkdtempSync(join(tmpdir(), "grok-pretooluse-"));
		const policyFile = join(dir, "pretooluse.policy");
		writeFileSync(policyFile, "policy: allow\n");

		expect(
			decideGrokPreToolUse({
				toolName: "Bash",
				toolInput: "{}",
				policyPath: policyFile,
			}),
		).toEqual({ decision: "allow" });
	});
});

describe("runGrokPreToolUseHook", () => {
	it("denies with exit 2 when the policy file is missing", () => {
		const result = runGrokPreToolUseHook(validStdin, missingPolicyPath);

		expect(result.exitCode).toBe(2);
		expect(JSON.parse(result.stdout)).toEqual({
			decision: "deny",
			reason: "PreToolUse policy is missing or unreadable",
		});
	});

	it("denies with exit 2 for invalid stdin", () => {
		const result = runGrokPreToolUseHook("not-json", missingPolicyPath);

		expect(result.exitCode).toBe(2);
		expect(JSON.parse(result.stdout)).toEqual(
			expect.objectContaining({ decision: "deny" }),
		);
	});

	it("allows with exit 0 for valid stdin and a readable policy", () => {
		const dir = mkdtempSync(join(tmpdir(), "grok-pretooluse-hook-"));
		const policyFile = join(dir, "pretooluse.policy");
		writeFileSync(policyFile, "policy: allow\n");

		const result = runGrokPreToolUseHook(validStdin, policyFile);

		expect(result.exitCode).toBe(0);
		expect(JSON.parse(result.stdout)).toEqual({ decision: "allow" });
	});
});

describe("pretooluse-hook.mjs", () => {
	it("prints deny and exits 2 when JAVI_AI_PRETOOLUSE_POLICY points at a missing file", () => {
		const hookPath = join(
			repoRoot,
			"own/grok-plugins/pretooluse-gate/pretooluse-hook.mjs",
		);
		const result = spawnSync(process.execPath, [hookPath], {
			cwd: repoRoot,
			encoding: "utf8",
			input: validStdin,
			env: {
				...process.env,
				JAVI_AI_PRETOOLUSE_POLICY: "/nonexistent",
			},
		});

		expect(result.status).toBe(2);
		expect(result.stdout).toContain("deny");
	});
});
