import { describe, expect, it } from "vitest";
import {
	analyzeTraces,
	findDecliningSkills,
	findHighCostLowUsage,
	findUnusedSkills,
	type Recommendation,
} from "../trace-analyzer.js";
import { createTraceEvent, type TraceEvent } from "../trace-collector.js";

function makeTraces(
	specs: Array<{
		skill: string;
		outcome: "loaded" | "used" | "ignored" | "failed";
		cost?: number;
		session?: string;
	}>,
): TraceEvent[] {
	return specs.map((s, i) =>
		createTraceEvent({
			skillName: s.skill,
			sessionId: s.session ?? `s${i}`,
			outcome: s.outcome,
			tokenCost: s.cost ?? 0,
		}),
	);
}

// ── findUnusedSkills ──

describe("findUnusedSkills", () => {
	it("flags skills loaded 10+ times but never used", () => {
		const traces = makeTraces(
			Array(12)
				.fill(null)
				.map((_, i) => ({
					skill: "unused-skill",
					outcome: "loaded" as const,
					session: `s${i}`,
				})),
		);
		const recs = findUnusedSkills(traces, 10);
		expect(recs).toHaveLength(1);
		expect(recs[0]!.type).toBe("flag_unused");
		expect(recs[0]!.skillName).toBe("unused-skill");
	});

	it("does not flag skills that were used", () => {
		const traces = makeTraces([
			{ skill: "active-skill", outcome: "loaded" },
			{ skill: "active-skill", outcome: "loaded" },
			{ skill: "active-skill", outcome: "used" },
		]);
		const recs = findUnusedSkills(traces, 2);
		expect(recs).toHaveLength(0);
	});

	it("does not flag below threshold", () => {
		const traces = makeTraces([
			{ skill: "new-skill", outcome: "loaded" },
			{ skill: "new-skill", outcome: "loaded" },
		]);
		const recs = findUnusedSkills(traces, 5);
		expect(recs).toHaveLength(0);
	});
});

// ── findDecliningSkills ──

describe("findDecliningSkills", () => {
	it("detects skills with increasing failure rate", () => {
		const traces = makeTraces([
			// Early sessions: used successfully
			{ skill: "declining", outcome: "used", session: "s1" },
			{ skill: "declining", outcome: "used", session: "s2" },
			// Later sessions: started failing
			{ skill: "declining", outcome: "failed", session: "s3" },
			{ skill: "declining", outcome: "failed", session: "s4" },
			{ skill: "declining", outcome: "failed", session: "s5" },
		]);
		const recs = findDecliningSkills(traces);
		expect(recs.length).toBeGreaterThanOrEqual(1);
		expect(recs[0]!.type).toBe("tighten_rule");
	});

	it("ignores consistently successful skills", () => {
		const traces = makeTraces(
			Array(10)
				.fill(null)
				.map((_, i) => ({
					skill: "stable-skill",
					outcome: "used" as const,
					session: `s${i}`,
				})),
		);
		const recs = findDecliningSkills(traces);
		expect(recs).toHaveLength(0);
	});
});

// ── findHighCostLowUsage ──

describe("findHighCostLowUsage", () => {
	it("flags skills with high token cost but low usage", () => {
		const traces = makeTraces([
			{ skill: "expensive", outcome: "loaded", cost: 5000 },
			{ skill: "expensive", outcome: "loaded", cost: 5000 },
			{ skill: "expensive", outcome: "loaded", cost: 5000 },
			{ skill: "expensive", outcome: "loaded", cost: 5000 },
			{ skill: "expensive", outcome: "used", cost: 5000 },
			// Used only 1/5 times, but costs 5000 tokens each load
		]);
		const recs = findHighCostLowUsage(traces, {
			minLoads: 3,
			maxUsageRatio: 0.3,
			minAvgCost: 2000,
		});
		expect(recs).toHaveLength(1);
		expect(recs[0]!.type).toBe("reduce_cost");
	});

	it("ignores cheap skills", () => {
		const traces = makeTraces([
			{ skill: "cheap", outcome: "loaded", cost: 100 },
			{ skill: "cheap", outcome: "loaded", cost: 100 },
		]);
		const recs = findHighCostLowUsage(traces, {
			minLoads: 2,
			maxUsageRatio: 0.3,
			minAvgCost: 2000,
		});
		expect(recs).toHaveLength(0);
	});
});

// ── analyzeTraces (integration) ──

describe("analyzeTraces", () => {
	it("produces combined recommendations", () => {
		const traces = makeTraces([
			// Unused skill
			...Array(12)
				.fill(null)
				.map((_, i) => ({
					skill: "never-used",
					outcome: "loaded" as const,
					session: `s${i}`,
				})),
			// Active skill
			{ skill: "active", outcome: "used", session: "s1" },
		]);
		const result = analyzeTraces(traces);
		expect(result.recommendations.length).toBeGreaterThan(0);
		expect(result.recommendations.some((r) => r.type === "flag_unused")).toBe(
			true,
		);
	});

	it("returns empty for clean traces", () => {
		const traces = makeTraces([
			{ skill: "good-skill", outcome: "used" },
			{ skill: "good-skill", outcome: "used" },
		]);
		const result = analyzeTraces(traces);
		expect(result.recommendations).toHaveLength(0);
	});

	it("recommendations have required fields", () => {
		const traces = makeTraces(
			Array(12)
				.fill(null)
				.map((_, i) => ({
					skill: "test",
					outcome: "loaded" as const,
					session: `s${i}`,
				})),
		);
		const result = analyzeTraces(traces);
		for (const rec of result.recommendations) {
			expect(rec.type).toBeTruthy();
			expect(rec.skillName).toBeTruthy();
			expect(rec.reason).toBeTruthy();
			expect(typeof rec.confidence).toBe("number");
		}
	});
});
