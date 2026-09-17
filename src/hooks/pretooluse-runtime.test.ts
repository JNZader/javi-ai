import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { PreToolUseEvent } from "./pretooluse-runtime.js";
import { evaluatePreToolUse } from "./pretooluse-runtime.js";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const mjsRuntimeUrl = new URL(
	"../../own/hooks/claude/pretooluse-runtime.mjs",
	import.meta.url,
);

const event: PreToolUseEvent = { toolName: "Bash", toolInput: "rm -rf /" };
const policyPath = "/tmp/does-not-exist-pretooluse-policy.yaml";
const policyText = "policy: deny-by-default";

describe("evaluatePreToolUse", () => {
	it("denies when the policy file is missing", () => {
		const readFile = () => {
			throw new Error("ENOENT: missing policy");
		};

		expect(
			evaluatePreToolUse({
				event,
				policyPath,
				readFile,
				evaluatePolicy: () => "allow",
			}),
		).toBe("deny");
	});

	it("denies when the reader throws", () => {
		const readFile = () => {
			throw new Error("permission denied");
		};

		expect(
			evaluatePreToolUse({
				event,
				policyPath,
				readFile,
				evaluatePolicy: () => "allow",
			}),
		).toBe("deny");
	});

	it("denies when the evaluator throws", () => {
		expect(
			evaluatePreToolUse({
				event,
				policyPath,
				readFile: () => policyText,
				evaluatePolicy: () => {
					throw new Error("evaluator crashed");
				},
			}),
		).toBe("deny");
	});

	it("denies when the evaluator returns deny", () => {
		expect(
			evaluatePreToolUse({
				event,
				policyPath,
				readFile: () => policyText,
				evaluatePolicy: () => "deny",
			}),
		).toBe("deny");
	});

	it("allows when the evaluator returns allow", () => {
		expect(
			evaluatePreToolUse({
				event,
				policyPath,
				readFile: () => policyText,
				evaluatePolicy: () => "allow",
			}),
		).toBe("allow");
	});

	it("denies when the evaluator is omitted after a successful read", () => {
		expect(
			evaluatePreToolUse({
				event,
				policyPath,
				readFile: () => policyText,
			}),
		).toBe("deny");
	});

	it("denies when the default reader cannot find the policy path", () => {
		expect(
			evaluatePreToolUse({
				event,
				policyPath,
				evaluatePolicy: () => "allow",
			}),
		).toBe("deny");
	});
});

describe("evaluatePreToolUse (mjs)", () => {
	async function loadMjs() {
		const mod = await import(mjsRuntimeUrl.href);
		return mod.evaluatePreToolUse as typeof evaluatePreToolUse;
	}

	it("denies when the policy file is missing", async () => {
		const evaluate = await loadMjs();
		const readFile = () => {
			throw new Error("ENOENT: missing policy");
		};

		expect(
			evaluate({
				event,
				policyPath,
				readFile,
				evaluatePolicy: () => "allow",
			}),
		).toBe("deny");
	});

	it("denies when the reader throws", async () => {
		const evaluate = await loadMjs();
		const readFile = () => {
			throw new Error("permission denied");
		};

		expect(
			evaluate({
				event,
				policyPath,
				readFile,
				evaluatePolicy: () => "allow",
			}),
		).toBe("deny");
	});

	it("denies when the evaluator throws", async () => {
		const evaluate = await loadMjs();

		expect(
			evaluate({
				event,
				policyPath,
				readFile: () => policyText,
				evaluatePolicy: () => {
					throw new Error("evaluator crashed");
				},
			}),
		).toBe("deny");
	});

	it("denies when the evaluator returns deny", async () => {
		const evaluate = await loadMjs();

		expect(
			evaluate({
				event,
				policyPath,
				readFile: () => policyText,
				evaluatePolicy: () => "deny",
			}),
		).toBe("deny");
	});

	it("allows when the evaluator returns allow", async () => {
		const evaluate = await loadMjs();

		expect(
			evaluate({
				event,
				policyPath,
				readFile: () => policyText,
				evaluatePolicy: () => "allow",
			}),
		).toBe("allow");
	});

	it("denies when the evaluator is omitted after a successful read", async () => {
		const evaluate = await loadMjs();

		expect(
			evaluate({
				event,
				policyPath,
				readFile: () => policyText,
			}),
		).toBe("deny");
	});
});

describe("pretooluse-runtime.mjs CLI", () => {
	const cliPath = join(repoRoot, "own/hooks/claude/pretooluse-runtime.mjs");

	it("exits 2 when the policy path argument is missing", () => {
		const result = spawnSync(process.execPath, [cliPath], {
			cwd: repoRoot,
			encoding: "utf8",
			env: { ...process.env, HOME: tmpdir() },
		});

		expect(result.status).toBe(2);
	});

	it("exits 0 when a readable policy file is provided", () => {
		const dir = mkdtempSync(join(tmpdir(), "pretooluse-cli-"));
		const policyFile = join(dir, "security-guard.yaml");
		writeFileSync(policyFile, "policy: allow\n");

		const result = spawnSync(process.execPath, [cliPath, policyFile], {
			cwd: repoRoot,
			encoding: "utf8",
			env: {
				...process.env,
				HOME: dir,
				TOOL_NAME: "Bash",
				TOOL_INPUT: "echo hi",
			},
		});

		expect(result.status).toBe(0);
	});
});
