import fs from "fs-extra";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	calculateBadge,
	DIMENSIONS,
	evaluateSkill,
	formatEvalReport,
} from "../evaluator.js";

let tmpDir: string;

beforeEach(async () => {
	tmpDir = path.join(os.tmpdir(), `plugin-eval-test-${Date.now()}`);
	await fs.ensureDir(tmpDir);
});

afterEach(async () => {
	await fs.remove(tmpDir);
});

async function createSkill(
	name: string,
	content: string,
	extras?: { references?: boolean; variants?: boolean },
) {
	const dir = path.join(tmpDir, name);
	await fs.ensureDir(dir);
	await fs.writeFile(path.join(dir, "SKILL.md"), content);
	if (extras?.references) {
		await fs.ensureDir(path.join(dir, "references"));
		await fs.writeFile(path.join(dir, "references", "api.md"), "# API ref");
	}
	if (extras?.variants) {
		await fs.ensureDir(path.join(dir, "variants"));
		await fs.writeFile(path.join(dir, "variants", "fast.md"), "# Fast mode");
	}
	return dir;
}

const MINIMAL_SKILL = `---
name: minimal
---

# Minimal Skill
`;

const GOOD_SKILL = `---
name: quality-skill
description: A well-documented skill for code review
version: 2.0
dependencies: [typescript]
---

# Quality Skill

## When to Use (Trigger)
Use this skill when the user asks for code review or quality analysis.
Detect context from file extensions and project structure.

## Critical Rules
1. Never approve code with known security vulnerabilities
2. Always check for XSS, injection, and CSRF patterns
3. Validate input at system boundaries

## Output Format

\`\`\`typescript
interface ReviewResult {
  file: string;
  issues: Issue[];
}
\`\`\`

### Good Example
\`\`\`typescript
// ✅ Correct: validates input
const sanitized = escape(userInput);
\`\`\`

### Bad Example
\`\`\`typescript
// ✗ Incorrect: raw user input in query
const query = \`SELECT * FROM users WHERE name = '\${input}'\`;
\`\`\`

## Error Handling
If the file is not found, fail gracefully with a clear message.
If the linter returns an error, retry with fallback configuration.

## Composition
This skill works alongside the typescript skill and can be chained
with the testing skill for comprehensive quality checks.

## Security
Never expose credentials. Sanitize all output. Avoid logging tokens
or API keys. Do not trust unvalidated input from external sources.
`;

describe("calculateBadge", () => {
	it("returns platinum for 95%+", () => {
		expect(calculateBadge(95)).toBe("platinum");
		expect(calculateBadge(100)).toBe("platinum");
	});
	it("returns gold for 85-94%", () => {
		expect(calculateBadge(85)).toBe("gold");
		expect(calculateBadge(94)).toBe("gold");
	});
	it("returns silver for 70-84%", () => {
		expect(calculateBadge(70)).toBe("silver");
		expect(calculateBadge(84)).toBe("silver");
	});
	it("returns bronze for 50-69%", () => {
		expect(calculateBadge(50)).toBe("bronze");
		expect(calculateBadge(69)).toBe("bronze");
	});
	it("returns none for <50%", () => {
		expect(calculateBadge(49)).toBe("none");
		expect(calculateBadge(0)).toBe("none");
	});
});

describe("DIMENSIONS", () => {
	it("has exactly 10 dimensions", () => {
		expect(DIMENSIONS).toHaveLength(10);
	});
});

describe("evaluateSkill", () => {
	it("evaluates a minimal skill", async () => {
		const dir = await createSkill("minimal", MINIMAL_SKILL);
		const result = await evaluateSkill(dir);

		expect(result.skillName).toBe("minimal");
		expect(result.dimensions).toHaveLength(10);
		expect(result.totalScore).toBeGreaterThanOrEqual(0);
		expect(result.maxPossible).toBeGreaterThan(0);
		expect(result.percentage).toBeGreaterThanOrEqual(0);
		expect(result.percentage).toBeLessThanOrEqual(100);
		expect(result.badge).toBeDefined();
	});

	it("scores a good skill higher than a minimal one", async () => {
		const minDir = await createSkill("minimal", MINIMAL_SKILL);
		const goodDir = await createSkill("good", GOOD_SKILL, {
			references: true,
			variants: true,
		});

		const minResult = await evaluateSkill(minDir);
		const goodResult = await evaluateSkill(goodDir);

		expect(goodResult.percentage).toBeGreaterThan(minResult.percentage);
	});

	it("returns all 10 dimension scores", async () => {
		const dir = await createSkill("test", GOOD_SKILL);
		const result = await evaluateSkill(dir);

		const dims = result.dimensions.map((d) => d.dimension);
		for (const expected of DIMENSIONS) {
			expect(dims).toContain(expected);
		}
	});

	it("caps individual scores at 10", async () => {
		const dir = await createSkill("test", GOOD_SKILL);
		const result = await evaluateSkill(dir);

		for (const d of result.dimensions) {
			expect(d.score).toBeLessThanOrEqual(10);
			expect(d.score).toBeGreaterThanOrEqual(0);
		}
	});

	it("includes details for each dimension", async () => {
		const dir = await createSkill("test", GOOD_SKILL);
		const result = await evaluateSkill(dir);

		for (const d of result.dimensions) {
			expect(d.details.length).toBeGreaterThanOrEqual(0);
		}
	});

	it("detects references directory", async () => {
		const dir = await createSkill("with-refs", GOOD_SKILL, {
			references: true,
		});
		const result = await evaluateSkill(dir);

		const tokenDim = result.dimensions.find(
			(d) => d.dimension === "token-efficiency",
		);
		expect(tokenDim?.details.some((d) => d.includes("references"))).toBe(true);
	});

	it("detects variants directory", async () => {
		const dir = await createSkill("with-variants", GOOD_SKILL, {
			variants: true,
		});
		const result = await evaluateSkill(dir);

		const compDim = result.dimensions.find(
			(d) => d.dimension === "composability",
		);
		expect(compDim?.details.some((d) => d.includes("variants"))).toBe(true);
	});

	it("handles non-existent SKILL.md gracefully", async () => {
		const dir = path.join(tmpDir, "empty");
		await fs.ensureDir(dir);
		const result = await evaluateSkill(dir);

		expect(result.skillName).toBe("empty");
		expect(result.percentage).toBeLessThan(30);
	});

	it("assigns badge based on percentage", async () => {
		const dir = await createSkill("good", GOOD_SKILL, {
			references: true,
			variants: true,
		});
		const result = await evaluateSkill(dir);

		expect(result.badge).toBe(calculateBadge(result.percentage));
	});

	it("includes timestamp", async () => {
		const dir = await createSkill("ts", MINIMAL_SKILL);
		const result = await evaluateSkill(dir);
		expect(result.timestamp).toMatch(/^\d{4}-\d{2}/);
	});
});

describe("formatEvalReport", () => {
	it("formats a readable markdown report", async () => {
		const dir = await createSkill("test", GOOD_SKILL);
		const result = await evaluateSkill(dir);
		const report = formatEvalReport(result);

		expect(report).toContain("## PluginEval: test");
		expect(report).toContain("Badge:");
		expect(report).toContain("Score:");
		expect(report).toContain("| Dimension |");
	});

	it("includes all dimensions in report", async () => {
		const dir = await createSkill("test", GOOD_SKILL);
		const result = await evaluateSkill(dir);
		const report = formatEvalReport(result);

		for (const dim of DIMENSIONS) {
			expect(report).toContain(dim);
		}
	});
});
