/**
 * TraceCollector — records which skills were loaded per session,
 * their outcomes, and token costs. Persists to JSONL for batch analysis.
 */

import fs from "fs";
import path from "path";

// ── Types ──

export type TraceOutcome = "loaded" | "used" | "ignored" | "failed";

export interface TraceEvent {
	skillName: string;
	sessionId: string;
	timestamp: string;
	outcome: TraceOutcome;
	tokenCost: number;
}

export interface SessionSummary {
	sessionId: string;
	totalSkills: number;
	outcomes: Record<TraceOutcome, number>;
	totalTokenCost: number;
	skills: string[];
}

export interface TraceFilter {
	sessionId?: string;
	skillName?: string;
	outcome?: TraceOutcome;
}

// ── Event creation ──

export function createTraceEvent(params: {
	skillName: string;
	sessionId: string;
	outcome: TraceOutcome;
	tokenCost?: number;
}): TraceEvent {
	return {
		skillName: params.skillName,
		sessionId: params.sessionId,
		timestamp: new Date().toISOString(),
		outcome: params.outcome,
		tokenCost: params.tokenCost ?? 0,
	};
}

// ── JSONL persistence ──

export function appendTrace(event: TraceEvent, filePath: string): void {
	const dir = path.dirname(filePath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	fs.appendFileSync(filePath, JSON.stringify(event) + "\n");
}

export function loadTraces(
	filePath: string,
	filter?: TraceFilter,
): TraceEvent[] {
	if (!fs.existsSync(filePath)) return [];

	const content = fs.readFileSync(filePath, "utf-8");
	const lines = content.trim().split("\n").filter(Boolean);
	const events: TraceEvent[] = [];

	for (const line of lines) {
		try {
			const event = JSON.parse(line) as TraceEvent;
			if (filter?.sessionId && event.sessionId !== filter.sessionId) continue;
			if (filter?.skillName && event.skillName !== filter.skillName) continue;
			if (filter?.outcome && event.outcome !== filter.outcome) continue;
			events.push(event);
		} catch {
			// Skip malformed lines
		}
	}

	return events;
}

// ── Session summary ──

export function summarizeSession(
	traces: TraceEvent[],
	sessionId: string,
): SessionSummary {
	const sessionTraces = traces.filter((t) => t.sessionId === sessionId);

	const outcomes: Record<TraceOutcome, number> = {
		loaded: 0,
		used: 0,
		ignored: 0,
		failed: 0,
	};

	let totalTokenCost = 0;
	const skills: string[] = [];

	for (const trace of sessionTraces) {
		outcomes[trace.outcome]++;
		totalTokenCost += trace.tokenCost;
		if (!skills.includes(trace.skillName)) {
			skills.push(trace.skillName);
		}
	}

	return {
		sessionId,
		totalSkills: skills.length,
		outcomes,
		totalTokenCost,
		skills,
	};
}
