import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const skillPath = join(
	dirname(fileURLToPath(import.meta.url)),
	"../../own/skills/smart-context/SKILL.md",
);

describe("smart-context skill contract", () => {
	const skill = readFileSync(skillPath, "utf8");

	it("instructs RepoForge first with the file-dep graph command", () => {
		expect(skill).toContain("repoforge graph -w . --v2 --format json");
		expect(skill).toMatch(/RepoForge FIRST/i);
	});

	it("instructs Engram second", () => {
		expect(skill).toMatch(/Engram SECOND/i);
	});

	it("lists symbols, calls, and cross_service as unsupported", () => {
		expect(skill).toMatch(/unsupported/i);
		expect(skill).toContain("symbols");
		expect(skill).toContain("calls");
		expect(skill).toContain("cross_service");
	});

	it("preserves conflicts", () => {
		expect(skill).toMatch(/conflict/i);
	});

	it("abstains when a provider is missing", () => {
		expect(skill).toMatch(/abstain/i);
	});

	it("forbids named products as do not", () => {
		expect(skill).toMatch(/do not/i);
		for (const name of [
			"broker server",
			"GHAGGA",
			"Orca",
			"Hermes",
			"ERE",
			"fusion ranking",
			"blast-radius",
			"codemap",
			"edge weight",
			"md-evals",
		]) {
			expect(skill, name).toContain(name);
		}
	});
});
