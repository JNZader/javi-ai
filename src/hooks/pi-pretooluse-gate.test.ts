import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decidePiToolCall } from "./pi-pretooluse-gate.js";

describe("decidePiToolCall", () => {
	it("blocks when the policy path is missing", () => {
		const decision = decidePiToolCall({
			toolName: "bash",
			toolInput: JSON.stringify({ command: "echo hi" }),
			policyPath: "/tmp/does-not-exist-pi-pretooluse-policy",
		});

		expect(decision.block).toBe(true);
		if (decision.block) {
			expect(decision.reason.toLowerCase()).toContain("policy");
			expect(decision.reason.toLowerCase()).toMatch(/missing|unreadable/);
		}
	});

	it("blocks when the policy is unreadable", () => {
		const decision = decidePiToolCall({
			toolName: "bash",
			policyPath: "/tmp/pi-pretooluse-unreadable-policy",
			readFile: () => {
				throw new Error("EACCES: permission denied");
			},
		});

		expect(decision.block).toBe(true);
		if (decision.block) {
			expect(decision.reason.toLowerCase()).toContain("policy");
			expect(decision.reason.toLowerCase()).toMatch(/missing|unreadable/);
		}
	});

	it("allows when the policy file is readable", () => {
		const dir = mkdtempSync(join(tmpdir(), "pi-pretooluse-"));
		const policyPath = join(dir, "pretooluse.policy");
		writeFileSync(policyPath, "allow\n");

		expect(
			decidePiToolCall({
				toolName: "bash",
				toolInput: JSON.stringify({ command: "echo hi" }),
				policyPath,
			}),
		).toEqual({ block: false });
	});
});
