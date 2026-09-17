import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

describe("security-guard.sh", () => {
	it("exits 2 when the policy yaml is missing", () => {
		const dir = mkdtempSync(join(tmpdir(), "security-guard-"));
		const scriptDest = join(dir, "security-guard.sh");
		copyFileSync(
			join(repoRoot, "own/hooks/claude/security-guard.sh"),
			scriptDest,
		);
		try {
			copyFileSync(
				join(repoRoot, "own/hooks/claude/pretooluse-runtime.mjs"),
				join(dir, "pretooluse-runtime.mjs"),
			);
		} catch {
			// RED: runtime module may not exist yet
		}

		const result = spawnSync("bash", [scriptDest], {
			encoding: "utf8",
			env: {
				...process.env,
				HOME: dir,
				TOOL_NAME: "Bash",
				TOOL_INPUT: "echo hi",
			},
		});

		expect(result.status).toBe(2);
	});

	it("registers PreToolUse in Claude settings", () => {
		const settings = readFileSync(
			join(repoRoot, "configs/claude/settings.json"),
			"utf8",
		);
		expect(settings).toContain("PreToolUse");
		expect(settings).toContain("security-guard.sh");
	});
});
