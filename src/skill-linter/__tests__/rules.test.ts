import { describe, expect, it } from "vitest";
import { lintSkill, VALID_PHASES } from "../rules.js";

const GOOD_SKILL = `---
name: test-skill
description: A test skill for validation
version: 1.0.0
phase: build
---

# Test Skill

## Purpose

This skill does testing.

## Constraints

1. Never skip validation
2. Always run tests first

## Execution Steps

### Step 1 — Setup

Initialize the test environment.

## Critical Rules

1. Always validate input
2. Never skip tests

## Rationalizations

- **Excuse**: "Tests are too slow"
  **Rebuttal**: Slow tests catch bugs. Fast bugs cost more.
`;

const MINIMAL_SKILL = `---
name: minimal
---

# Minimal Skill

Some content.
`;

const NO_FRONTMATTER = `# No Frontmatter

Just content without YAML frontmatter.
`;

// ── Frontmatter ──

describe("frontmatter validation", () => {
	it("passes with valid frontmatter", () => {
		const result = lintSkill(GOOD_SKILL);
		expect(result.hasFrontmatter).toBe(true);
		expect(
			result.findings.filter((f) => f.ruleId === "frontmatter-required"),
		).toHaveLength(0);
	});

	it("errors on missing frontmatter", () => {
		const result = lintSkill(NO_FRONTMATTER);
		expect(result.hasFrontmatter).toBe(false);
		const errors = result.findings.filter(
			(f) => f.ruleId === "frontmatter-required",
		);
		expect(errors).toHaveLength(1);
		expect(errors[0]!.severity).toBe("error");
	});

	it("errors on missing name field", () => {
		const skill = "---\ndescription: test\n---\n# Test\n";
		const result = lintSkill(skill);
		expect(result.findings.some((f) => f.ruleId === "frontmatter-name")).toBe(
			true,
		);
	});

	it("warns on missing description field", () => {
		const result = lintSkill(MINIMAL_SKILL);
		expect(
			result.findings.some((f) => f.ruleId === "frontmatter-description"),
		).toBe(true);
	});
});

// ── Lifecycle phase ──

describe("lifecycle phase", () => {
	it("accepts valid phase", () => {
		const result = lintSkill(GOOD_SKILL);
		expect(result.phase).toBe("build");
		expect(
			result.findings.filter((f) => f.ruleId.startsWith("lifecycle")),
		).toHaveLength(0);
	});

	it("info when phase is missing", () => {
		const result = lintSkill(MINIMAL_SKILL);
		expect(result.findings.some((f) => f.ruleId === "lifecycle-phase")).toBe(
			true,
		);
	});

	it("warns on invalid phase", () => {
		const skill = "---\nname: test\nphase: yolo\n---\n# Test\n";
		const result = lintSkill(skill);
		expect(
			result.findings.some((f) => f.ruleId === "lifecycle-phase-invalid"),
		).toBe(true);
	});

	it("VALID_PHASES has 8 phases", () => {
		expect(VALID_PHASES).toHaveLength(8);
		expect(VALID_PHASES).toContain("build");
		expect(VALID_PHASES).toContain("verify");
		expect(VALID_PHASES).toContain("ship");
	});
});

// ── Rationalizations ──

describe("rationalizations", () => {
	it("passes when rationalizations section exists", () => {
		const result = lintSkill(GOOD_SKILL);
		expect(result.hasRationalizations).toBe(true);
		expect(
			result.findings.filter((f) => f.ruleId === "rationalizations-missing"),
		).toHaveLength(0);
	});

	it("warns when rationalizations section is missing", () => {
		const result = lintSkill(MINIMAL_SKILL);
		expect(result.hasRationalizations).toBe(false);
		expect(
			result.findings.some((f) => f.ruleId === "rationalizations-missing"),
		).toBe(true);
	});
});

// ── Constraints-first ──

describe("constraints-first", () => {
	it("passes when constraints is before personality", () => {
		const result = lintSkill(GOOD_SKILL);
		expect(result.hasConstraints).toBe(true);
		expect(result.constraintsBeforePersonality).toBe(true);
	});

	it("warns when constraints is after personality", () => {
		const skill = `---
name: bad-order
---

# Bad Order

## Personality

Be friendly.

## Constraints

1. Don't skip steps
`;
		const result = lintSkill(skill);
		expect(result.hasConstraints).toBe(true);
		expect(result.constraintsBeforePersonality).toBe(false);
		expect(
			result.findings.some((f) => f.ruleId === "constraints-after-personality"),
		).toBe(true);
	});

	it("info when constraints is missing", () => {
		const result = lintSkill(MINIMAL_SKILL);
		expect(result.hasConstraints).toBe(false);
		expect(
			result.findings.some((f) => f.ruleId === "constraints-missing"),
		).toBe(true);
	});

	it("passes when constraints exists without personality", () => {
		const skill = `---
name: constraints-only
---

# Constraints Only

## Constraints

1. Rule one
`;
		const result = lintSkill(skill);
		expect(result.hasConstraints).toBe(true);
		expect(result.constraintsBeforePersonality).toBe(true);
	});
});

// ── Critical Rules ──

describe("critical rules", () => {
	it("passes when critical rules section exists", () => {
		const result = lintSkill(GOOD_SKILL);
		expect(
			result.findings.filter((f) => f.ruleId === "critical-rules-missing"),
		).toHaveLength(0);
	});

	it("warns when critical rules section is missing", () => {
		const result = lintSkill(MINIMAL_SKILL);
		expect(
			result.findings.some((f) => f.ruleId === "critical-rules-missing"),
		).toBe(true);
	});
});

// ── Scoring ──

describe("scoring", () => {
	it("perfect skill scores 100", () => {
		const result = lintSkill(GOOD_SKILL);
		expect(result.score).toBe(100);
	});

	it("no frontmatter scores low", () => {
		const result = lintSkill(NO_FRONTMATTER);
		expect(result.score).toBeLessThan(60);
	});

	it("minimal skill scores between 40-80", () => {
		const result = lintSkill(MINIMAL_SKILL);
		expect(result.score).toBeGreaterThanOrEqual(40);
		expect(result.score).toBeLessThanOrEqual(80);
	});

	it("score never goes below 0", () => {
		const result = lintSkill("");
		expect(result.score).toBeGreaterThanOrEqual(0);
	});
});
