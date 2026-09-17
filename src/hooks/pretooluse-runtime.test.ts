import { describe, expect, it } from "vitest";
import type { PreToolUseEvent } from "./pretooluse-runtime.js";
import { evaluatePreToolUse } from "./pretooluse-runtime.js";

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
