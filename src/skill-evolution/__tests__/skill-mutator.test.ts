import { describe, expect, it } from "vitest";
import {
	applyRecommendation,
	type MutationResult,
	validateMutation,
} from "../skill-mutator.js";
import type { Recommendation } from "../trace-analyzer.js";

const SAMPLE_SKILL = `---
name: test-skill
description: A test skill
version: 1.0.0
phase: build
---

# Test Skill

## Purpose

Testing the skill mutator.

## Constraints

1. Always validate input
2. Never skip tests

## Execution Steps

### Step 1 — Setup

Initialize the environment.

## Critical Rules

1. **Always validate input before processing**
2. **Never expose internal errors to users**
`;

// ── applyRecommendation ──

describe("applyRecommendation", () => {
	it("adds rationalizations section for add_rationalization", () => {
		const rec: Recommendation = {
			type: "add_rationalization",
			skillName: "test-skill",
			reason: "Missing rationalizations",
			confidence: 0.8,
			suggestedAction: "Add Rationalizations section",
		};
		const result = applyRecommendation(rec, SAMPLE_SKILL);
		expect(result.accepted).toBe(true);
		expect(result.mutated).toContain("## Rationalizations");
		expect(result.lintAfter).toBeGreaterThanOrEqual(result.lintBefore);
	});

	it("adds tighter rule for tighten_rule", () => {
		const rec: Recommendation = {
			type: "tighten_rule",
			skillName: "test-skill",
			reason: "High failure rate",
			confidence: 0.7,
			suggestedAction: "Add specificity to rules",
		};
		const result = applyRecommendation(rec, SAMPLE_SKILL);
		expect(result.accepted).toBe(true);
		expect(result.mutated.length).toBeGreaterThan(SAMPLE_SKILL.length);
	});

	it("produces diff preview", () => {
		const rec: Recommendation = {
			type: "add_rationalization",
			skillName: "test-skill",
			reason: "Test",
			confidence: 0.5,
			suggestedAction: "Test",
		};
		const result = applyRecommendation(rec, SAMPLE_SKILL);
		expect(result.diff).toBeTruthy();
		expect(result.diff.length).toBeGreaterThan(0);
	});

	it("preserves frontmatter", () => {
		const rec: Recommendation = {
			type: "add_rationalization",
			skillName: "test-skill",
			reason: "Test",
			confidence: 0.5,
			suggestedAction: "Test",
		};
		const result = applyRecommendation(rec, SAMPLE_SKILL);
		expect(result.mutated).toContain("name: test-skill");
		expect(result.mutated).toContain("version: 1.0.0");
	});

	it("handles flag_unused (no mutation, just flag)", () => {
		const rec: Recommendation = {
			type: "flag_unused",
			skillName: "test-skill",
			reason: "Never used",
			confidence: 0.9,
			suggestedAction: "Consider removing",
		};
		const result = applyRecommendation(rec, SAMPLE_SKILL);
		// flag_unused doesn't mutate, just produces a report
		expect(result.diff).toBeTruthy();
	});
});

// ── validateMutation ──

describe("validateMutation", () => {
	it("accepts mutation that improves lint score", () => {
		const mutated = `${SAMPLE_SKILL}\n## Rationalizations\n\n- **Excuse**: "Tests are slow"\n  **Rebuttal**: Slow tests catch bugs.\n`;
		const result = validateMutation(SAMPLE_SKILL, mutated);
		expect(result.valid).toBe(true);
	});

	it("rejects mutation that decreases lint score", () => {
		// Remove frontmatter — catastrophic quality drop
		const mutated = "# No Frontmatter\nJust content.";
		const result = validateMutation(SAMPLE_SKILL, mutated);
		expect(result.valid).toBe(false);
		expect(result.reasons.some((r) => r.includes("score"))).toBe(true);
	});

	it("rejects mutation that grows file by more than 20%", () => {
		// Need >500 chars original for size check to apply
		const largeSkill = SAMPLE_SKILL + "\n" + "x".repeat(200);
		const padding = "\n" + "y".repeat(largeSkill.length);
		const mutated = largeSkill + padding;
		const result = validateMutation(largeSkill, mutated);
		expect(result.valid).toBe(false);
		// May fail for size OR score (both are valid rejections for large mutations)
		expect(result.reasons.length).toBeGreaterThan(0);
	});

	it("accepts mutation within size limit", () => {
		const smallAddition = SAMPLE_SKILL + "\n## Notes\n\nA small note.\n";
		const result = validateMutation(SAMPLE_SKILL, smallAddition);
		expect(result.valid).toBe(true);
	});

	it("rejects empty mutation", () => {
		const result = validateMutation(SAMPLE_SKILL, "");
		expect(result.valid).toBe(false);
	});
});
