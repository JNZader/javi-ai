import { describe, expect, it } from "vitest";
import {
	addInstinct,
	boostConfidence,
	createCollection,
	createInstinct,
	findByTag,
	formatInstincts,
	fromJSON,
	getActiveInstincts,
	penalizeConfidence,
	recordUsage,
	removeInstinct,
	toJSON,
	validateRule,
} from "../instinct.js";

// ── validateRule ──

describe("validateRule", () => {
	it("accepts a short rule", () => {
		expect(validateRule("Always run tests before committing").valid).toBe(true);
	});

	it("rejects empty rule", () => {
		expect(validateRule("").valid).toBe(false);
	});

	it("rejects rule over 500 chars", () => {
		expect(validateRule("x".repeat(501)).valid).toBe(false);
	});

	it("rejects rule over 5 lines", () => {
		const rule = Array(6).fill("line").join("\n");
		const result = validateRule(rule);
		expect(result.valid).toBe(false);
		expect(result.reason).toContain("6 lines");
	});

	it("accepts multi-line rule within limits", () => {
		const rule = "Line 1\nLine 2\nLine 3";
		expect(validateRule(rule).valid).toBe(true);
	});
});

// ── createInstinct ──

describe("createInstinct", () => {
	it("creates with default values", () => {
		const inst = createInstinct({ rule: "Always test first" });
		expect(inst.rule).toBe("Always test first");
		expect(inst.confidence).toBe(0.5);
		expect(inst.source).toBe("user");
		expect(inst.tags).toEqual([]);
		expect(inst.usedCount).toBe(0);
		expect(inst.lastUsedAt).toBeNull();
		expect(inst.id).toBeTruthy();
	});

	it("accepts custom values", () => {
		const inst = createInstinct({
			rule: "Prefer composition",
			source: "learned",
			tags: ["architecture"],
			confidence: 0.8,
		});
		expect(inst.source).toBe("learned");
		expect(inst.tags).toEqual(["architecture"]);
		expect(inst.confidence).toBe(0.8);
	});

	it("generates unique IDs", () => {
		const a = createInstinct({ rule: "Rule A" });
		const b = createInstinct({ rule: "Rule B" });
		expect(a.id).not.toBe(b.id);
	});
});

// ── Collection ──

describe("collection management", () => {
	it("creates empty collection", () => {
		const col = createCollection("my-project");
		expect(col.project).toBe("my-project");
		expect(col.instincts).toHaveLength(0);
	});

	it("adds instinct", () => {
		const col = createCollection("test");
		addInstinct(col, createInstinct({ rule: "Rule 1" }));
		expect(col.instincts).toHaveLength(1);
	});

	it("removes instinct by id", () => {
		const col = createCollection("test");
		const inst = createInstinct({ rule: "Rule 1" });
		addInstinct(col, inst);
		expect(removeInstinct(col, inst.id)).toBe(true);
		expect(col.instincts).toHaveLength(0);
	});

	it("returns false when removing non-existent", () => {
		const col = createCollection("test");
		expect(removeInstinct(col, "nope")).toBe(false);
	});

	it("finds by tag", () => {
		const col = createCollection("test");
		addInstinct(col, createInstinct({ rule: "R1", tags: ["testing"] }));
		addInstinct(col, createInstinct({ rule: "R2", tags: ["arch"] }));
		addInstinct(col, createInstinct({ rule: "R3", tags: ["testing", "ci"] }));

		expect(findByTag(col, "testing")).toHaveLength(2);
		expect(findByTag(col, "arch")).toHaveLength(1);
		expect(findByTag(col, "nope")).toHaveLength(0);
	});
});

// ── Confidence ──

describe("confidence management", () => {
	it("boosts confidence", () => {
		const inst = createInstinct({ rule: "R", confidence: 0.5 });
		boostConfidence(inst);
		expect(inst.confidence).toBeCloseTo(0.6);
	});

	it("caps at 1.0", () => {
		const inst = createInstinct({ rule: "R", confidence: 0.95 });
		boostConfidence(inst);
		expect(inst.confidence).toBe(1.0);
	});

	it("penalizes confidence", () => {
		const inst = createInstinct({ rule: "R", confidence: 0.5 });
		penalizeConfidence(inst);
		expect(inst.confidence).toBeCloseTo(0.4);
	});

	it("floors at 0.0", () => {
		const inst = createInstinct({ rule: "R", confidence: 0.05 });
		penalizeConfidence(inst);
		expect(inst.confidence).toBe(0.0);
	});
});

// ── Usage tracking ──

describe("usage tracking", () => {
	it("increments count and sets timestamp", () => {
		const inst = createInstinct({ rule: "R" });
		expect(inst.usedCount).toBe(0);
		recordUsage(inst);
		expect(inst.usedCount).toBe(1);
		expect(inst.lastUsedAt).not.toBeNull();
	});
});

// ── Active instincts ──

describe("getActiveInstincts", () => {
	it("filters by min confidence", () => {
		const col = createCollection("test");
		addInstinct(col, createInstinct({ rule: "Low", confidence: 0.1 }));
		addInstinct(col, createInstinct({ rule: "Mid", confidence: 0.5 }));
		addInstinct(col, createInstinct({ rule: "High", confidence: 0.9 }));

		const active = getActiveInstincts(col, 0.3);
		expect(active).toHaveLength(2);
		expect(active[0]!.rule).toBe("High"); // sorted desc
		expect(active[1]!.rule).toBe("Mid");
	});

	it("returns empty when all below threshold", () => {
		const col = createCollection("test");
		addInstinct(col, createInstinct({ rule: "Low", confidence: 0.1 }));
		expect(getActiveInstincts(col, 0.5)).toHaveLength(0);
	});
});

// ── Serialization ──

describe("serialization", () => {
	it("roundtrips through JSON", () => {
		const col = createCollection("test");
		addInstinct(col, createInstinct({ rule: "Rule 1", tags: ["testing"] }));
		addInstinct(col, createInstinct({ rule: "Rule 2", confidence: 0.9 }));

		const json = toJSON(col);
		const restored = fromJSON(json);
		expect(restored.project).toBe("test");
		expect(restored.instincts).toHaveLength(2);
		expect(restored.instincts[0]!.rule).toBe("Rule 1");
		expect(restored.instincts[1]!.confidence).toBe(0.9);
	});
});

// ── Formatting ──

describe("formatInstincts", () => {
	it("formats with confidence percentage", () => {
		const instincts = [
			createInstinct({
				rule: "Always test",
				confidence: 0.85,
				tags: ["testing"],
			}),
		];
		const output = formatInstincts(instincts);
		expect(output).toContain("[85%]");
		expect(output).toContain("Always test");
		expect(output).toContain("testing");
	});

	it("returns message for empty", () => {
		expect(formatInstincts([])).toContain("No active instincts");
	});
});
