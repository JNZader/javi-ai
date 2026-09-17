import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	decideAgyPreToolUse,
	runAgyPreToolUseHook,
} from "./agy-pretooluse-gate.js";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const missingPolicyPath = "/tmp/does-not-exist-agy-policy";
const validStdin = JSON.stringify({
	toolCall: { name: "Bash", args: { command: "echo hi" } },
});

describe("decideAgyPreToolUse", () => {
	it("denies when the policy file is missing", () => {
		expect(
			decideAgyPreToolUse({
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
			decideAgyPreToolUse({
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
		const dir = mkdtempSync(join(tmpdir(), "agy-pretooluse-"));
		const policyFile = join(dir, "pretooluse.policy");
		writeFileSync(policyFile, "policy: allow\n");

		expect(
			decideAgyPreToolUse({
				toolName: "Bash",
				toolInput: "{}",
				policyPath: policyFile,
			}),
		).toEqual({ decision: "allow" });
	});
});

describe("runAgyPreToolUseHook", () => {
	it("returns deny JSON for invalid stdin", () => {
		expect(
			JSON.parse(runAgyPreToolUseHook("not-json", missingPolicyPath)),
		).toEqual(expect.objectContaining({ decision: "deny" }));
	});

	it("returns deny JSON when toolCall.name is missing", () => {
		expect(
			JSON.parse(
				runAgyPreToolUseHook(
					JSON.stringify({ toolCall: { args: {} } }),
					missingPolicyPath,
				),
			),
		).toEqual(expect.objectContaining({ decision: "deny" }));
	});

	it("returns allow JSON for valid stdin and a readable policy", () => {
		const dir = mkdtempSync(join(tmpdir(), "agy-pretooluse-hook-"));
		const policyFile = join(dir, "pretooluse.policy");
		writeFileSync(policyFile, "policy: allow\n");

		expect(JSON.parse(runAgyPreToolUseHook(validStdin, policyFile))).toEqual({
			decision: "allow",
		});
	});
});

describe("pretooluse-hook.mjs", () => {
	it("prints deny when JAVI_AI_PRETOOLUSE_POLICY points at a missing file", () => {
		const hookPath = join(
			repoRoot,
			"own/agy-plugins/pretooluse-gate/pretooluse-hook.mjs",
		);
		const result = spawnSync(process.execPath, [hookPath], {
			cwd: repoRoot,
			encoding: "utf8",
			input: validStdin,
			env: {
				...process.env,
				JAVI_AI_PRETOOLUSE_POLICY: missingPolicyPath,
			},
		});

		expect(result.status).toBe(0);
		expect(JSON.parse(result.stdout)).toEqual(
			expect.objectContaining({ decision: "deny" }),
		);
	});
});
