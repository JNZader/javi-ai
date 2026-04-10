/**
 * TraceAnalyzer — batch-analyzes execution traces to find patterns:
 * declining confidence, unused skills, high-cost low-usage.
 * Produces typed recommendations for the SkillMutator.
 */

import type { TraceEvent, TraceOutcome } from "./trace-collector.js";

// ── Types ──

export type RecommendationType =
	| "add_rationalization"
	| "tighten_rule"
	| "suggest_merge"
	| "flag_unused"
	| "reduce_cost";

export interface Recommendation {
	type: RecommendationType;
	skillName: string;
	reason: string;
	confidence: number; // 0.0-1.0
	suggestedAction: string;
}

export interface AnalysisResult {
	recommendations: Recommendation[];
	skillsAnalyzed: number;
	tracesProcessed: number;
}

// ── Helpers ──

interface SkillStats {
	loadCount: number;
	useCount: number;
	ignoreCount: number;
	failCount: number;
	totalCost: number;
	sessions: Set<string>;
}

function aggregateBySkill(traces: TraceEvent[]): Map<string, SkillStats> {
	const stats = new Map<string, SkillStats>();

	for (const trace of traces) {
		let s = stats.get(trace.skillName);
		if (!s) {
			s = {
				loadCount: 0,
				useCount: 0,
				ignoreCount: 0,
				failCount: 0,
				totalCost: 0,
				sessions: new Set(),
			};
			stats.set(trace.skillName, s);
		}

		s.sessions.add(trace.sessionId);
		s.totalCost += trace.tokenCost;

		switch (trace.outcome) {
			case "loaded":
				s.loadCount++;
				break;
			case "used":
				s.useCount++;
				break;
			case "ignored":
				s.ignoreCount++;
				break;
			case "failed":
				s.failCount++;
				break;
		}
	}

	return stats;
}

// ── Pattern detectors ──

export function findUnusedSkills(
	traces: TraceEvent[],
	minLoads: number = 10,
): Recommendation[] {
	const stats = aggregateBySkill(traces);
	const recs: Recommendation[] = [];

	for (const [skill, s] of stats) {
		if (s.loadCount >= minLoads && s.useCount === 0) {
			recs.push({
				type: "flag_unused",
				skillName: skill,
				reason: `Loaded ${s.loadCount} times across ${s.sessions.size} sessions but never used`,
				confidence: Math.min(0.9, s.loadCount / 20),
				suggestedAction: `Consider removing '${skill}' or making it load-on-demand instead of always-on`,
			});
		}
	}

	return recs;
}

export function findDecliningSkills(traces: TraceEvent[]): Recommendation[] {
	const stats = aggregateBySkill(traces);
	const recs: Recommendation[] = [];

	for (const [skill, s] of stats) {
		const total = s.useCount + s.failCount;
		if (total < 3) continue; // not enough data

		const failRate = s.failCount / total;
		if (failRate > 0.4) {
			recs.push({
				type: "tighten_rule",
				skillName: skill,
				reason: `Failure rate ${(failRate * 100).toFixed(0)}% (${s.failCount}/${total}) — skill may need clearer rules`,
				confidence: Math.min(0.9, failRate),
				suggestedAction: `Review Critical Rules in '${skill}' SKILL.md — add specificity to reduce failures`,
			});
		}
	}

	return recs;
}

export function findHighCostLowUsage(
	traces: TraceEvent[],
	thresholds: {
		minLoads: number;
		maxUsageRatio: number;
		minAvgCost: number;
	} = {
		minLoads: 5,
		maxUsageRatio: 0.3,
		minAvgCost: 2000,
	},
): Recommendation[] {
	const stats = aggregateBySkill(traces);
	const recs: Recommendation[] = [];

	for (const [skill, s] of stats) {
		const totalLoads = s.loadCount + s.useCount;
		if (totalLoads < thresholds.minLoads) continue;

		const usageRatio = s.useCount / totalLoads;
		const avgCost = s.totalCost / totalLoads;

		if (
			usageRatio <= thresholds.maxUsageRatio &&
			avgCost >= thresholds.minAvgCost
		) {
			recs.push({
				type: "reduce_cost",
				skillName: skill,
				reason: `Used ${(usageRatio * 100).toFixed(0)}% of loads, avg cost ${avgCost.toFixed(0)} tokens — high cost for low usage`,
				confidence: 0.7,
				suggestedAction: `Compress '${skill}' content or split into a smaller always-on stub + on-demand detail`,
			});
		}
	}

	return recs;
}

// ── Main analyzer ──

export function analyzeTraces(traces: TraceEvent[]): AnalysisResult {
	const stats = aggregateBySkill(traces);
	const recommendations: Recommendation[] = [
		...findUnusedSkills(traces),
		...findDecliningSkills(traces),
		...findHighCostLowUsage(traces),
	];

	return {
		recommendations,
		skillsAnalyzed: stats.size,
		tracesProcessed: traces.length,
	};
}
