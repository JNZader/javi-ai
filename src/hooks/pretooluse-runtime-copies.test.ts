import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const canonicalPath = join(repoRoot, "own/runtime/pretooluse-runtime.mjs");
const copyPaths = [
	"own/hooks/claude/evaluate-pretooluse.mjs",
	"own/agy-plugins/pretooluse-gate/evaluate-pretooluse.mjs",
	"own/grok-plugins/pretooluse-gate/evaluate-pretooluse.mjs",
	"own/cursor-hooks/pretooluse-gate/evaluate-pretooluse.mjs",
	"own/pi-extensions/evaluate-pretooluse.mjs",
];

function sha256(path: string): string {
	return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("evaluate-pretooluse copies", () => {
	it("are byte-identical to the canonical runtime", () => {
		const expected = sha256(canonicalPath);
		for (const relativePath of copyPaths) {
			expect(sha256(join(repoRoot, relativePath))).toBe(expected);
		}
	});
});
