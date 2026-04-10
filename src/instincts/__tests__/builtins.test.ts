import { describe, expect, it } from "vitest";
import {
	BUILTIN_INSTINCTS,
	getBuiltinInstincts,
	isBuiltinInstinct,
} from "../builtins.js";
import {
	addInstinct,
	createCollection,
	getActiveInstincts,
} from "../instinct.js";

describe("BUILTIN_INSTINCTS", () => {
	it("includes anti-lazy-output instinct", () => {
		const antiLazy = BUILTIN_INSTINCTS.find(
			(i) =>
				i.rule.toLowerCase().includes("truncat") ||
				i.rule.toLowerCase().includes("placeholder"),
		);
		expect(antiLazy).toBeDefined();
		expect(antiLazy!.confidence).toBe(1.0);
		expect(antiLazy!.source).toBe("built-in");
	});

	it("includes complete-output instinct", () => {
		const complete = BUILTIN_INSTINCTS.find(
			(i) =>
				i.rule.toLowerCase().includes("complete") ||
				i.rule.toLowerCase().includes("skip"),
		);
		expect(complete).toBeDefined();
	});

	it("all builtins have confidence 1.0", () => {
		for (const instinct of BUILTIN_INSTINCTS) {
			expect(instinct.confidence).toBe(1.0);
		}
	});

	it("all builtins have source 'built-in'", () => {
		for (const instinct of BUILTIN_INSTINCTS) {
			expect(instinct.source).toBe("built-in");
		}
	});

	it("has at least 3 built-in instincts", () => {
		expect(BUILTIN_INSTINCTS.length).toBeGreaterThanOrEqual(3);
	});
});

describe("getBuiltinInstincts", () => {
	it("returns all builtins", () => {
		const builtins = getBuiltinInstincts();
		expect(builtins.length).toBe(BUILTIN_INSTINCTS.length);
	});

	it("builtins are always active regardless of threshold", () => {
		const builtins = getBuiltinInstincts();
		expect(builtins.every((i) => i.confidence >= 1.0)).toBe(true);
	});
});

describe("isBuiltinInstinct", () => {
	it("identifies builtins by id prefix", () => {
		const builtins = getBuiltinInstincts();
		expect(isBuiltinInstinct(builtins[0]!)).toBe(true);
	});

	it("returns false for user instincts", () => {
		const col = createCollection("test");
		const userInstinct = {
			id: "inst-123-1",
			rule: "Custom rule",
			confidence: 0.5,
			source: "user" as const,
			tags: [],
			createdAt: new Date().toISOString(),
			usedCount: 0,
			lastUsedAt: null,
		};
		expect(isBuiltinInstinct(userInstinct)).toBe(false);
	});
});

describe("integration with collection", () => {
	it("builtins are always included in active instincts", () => {
		const col = createCollection("test");
		// Add builtins to collection
		for (const bi of getBuiltinInstincts()) {
			addInstinct(col, bi);
		}
		// Even with a high threshold, builtins should appear
		const active = getActiveInstincts(col, 0.99);
		expect(active.length).toBeGreaterThanOrEqual(BUILTIN_INSTINCTS.length);
	});
});
