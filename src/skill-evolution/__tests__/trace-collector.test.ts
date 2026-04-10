import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	appendTrace,
	createTraceEvent,
	loadTraces,
	summarizeSession,
	type TraceEvent,
	type TraceOutcome,
} from "../trace-collector.js";

let tmpDir: string;
let traceFile: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "trace-test-"));
	traceFile = path.join(tmpDir, "traces.jsonl");
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── TraceEvent creation ──

describe("createTraceEvent", () => {
	it("creates event with required fields", () => {
		const event = createTraceEvent({
			skillName: "react-19",
			sessionId: "sess-1",
			outcome: "used",
		});
		expect(event.skillName).toBe("react-19");
		expect(event.sessionId).toBe("sess-1");
		expect(event.outcome).toBe("used");
		expect(event.timestamp).toBeTruthy();
		expect(event.tokenCost).toBe(0);
	});

	it("includes optional token cost", () => {
		const event = createTraceEvent({
			skillName: "sdd-apply",
			sessionId: "s1",
			outcome: "loaded",
			tokenCost: 2500,
		});
		expect(event.tokenCost).toBe(2500);
	});

	it("records all outcome types", () => {
		const outcomes: TraceOutcome[] = ["loaded", "used", "ignored", "failed"];
		for (const outcome of outcomes) {
			const event = createTraceEvent({
				skillName: "test",
				sessionId: "s1",
				outcome,
			});
			expect(event.outcome).toBe(outcome);
		}
	});
});

// ── JSONL persistence ──

describe("appendTrace", () => {
	it("creates file on first append", () => {
		const event = createTraceEvent({
			skillName: "test",
			sessionId: "s1",
			outcome: "loaded",
		});
		appendTrace(event, traceFile);
		expect(fs.existsSync(traceFile)).toBe(true);
	});

	it("appends multiple events", () => {
		for (let i = 0; i < 3; i++) {
			appendTrace(
				createTraceEvent({
					skillName: `skill-${i}`,
					sessionId: "s1",
					outcome: "used",
				}),
				traceFile,
			);
		}
		const lines = fs.readFileSync(traceFile, "utf-8").trim().split("\n");
		expect(lines).toHaveLength(3);
	});

	it("writes valid JSON per line", () => {
		appendTrace(
			createTraceEvent({
				skillName: "test",
				sessionId: "s1",
				outcome: "failed",
			}),
			traceFile,
		);
		const line = fs.readFileSync(traceFile, "utf-8").trim();
		const parsed = JSON.parse(line);
		expect(parsed.skillName).toBe("test");
		expect(parsed.outcome).toBe("failed");
	});
});

// ── Loading traces ──

describe("loadTraces", () => {
	it("loads all traces from file", () => {
		for (let i = 0; i < 5; i++) {
			appendTrace(
				createTraceEvent({
					skillName: `skill-${i}`,
					sessionId: "s1",
					outcome: "used",
				}),
				traceFile,
			);
		}
		const traces = loadTraces(traceFile);
		expect(traces).toHaveLength(5);
	});

	it("returns empty array for missing file", () => {
		expect(loadTraces("/nonexistent/file.jsonl")).toEqual([]);
	});

	it("filters by session ID", () => {
		appendTrace(
			createTraceEvent({ skillName: "a", sessionId: "s1", outcome: "used" }),
			traceFile,
		);
		appendTrace(
			createTraceEvent({ skillName: "b", sessionId: "s2", outcome: "used" }),
			traceFile,
		);
		const filtered = loadTraces(traceFile, { sessionId: "s1" });
		expect(filtered).toHaveLength(1);
		expect(filtered[0]!.sessionId).toBe("s1");
	});

	it("filters by skill name", () => {
		appendTrace(
			createTraceEvent({
				skillName: "react-19",
				sessionId: "s1",
				outcome: "used",
			}),
			traceFile,
		);
		appendTrace(
			createTraceEvent({
				skillName: "typescript",
				sessionId: "s1",
				outcome: "loaded",
			}),
			traceFile,
		);
		const filtered = loadTraces(traceFile, { skillName: "react-19" });
		expect(filtered).toHaveLength(1);
	});

	it("skips malformed lines", () => {
		fs.writeFileSync(
			traceFile,
			'{"skillName":"good","sessionId":"s1","outcome":"used","timestamp":"2026-01-01","tokenCost":0}\nnot json\n',
		);
		const traces = loadTraces(traceFile);
		expect(traces).toHaveLength(1);
	});
});

// ── Session summary ──

describe("summarizeSession", () => {
	it("summarizes skill outcomes for a session", () => {
		const traces: TraceEvent[] = [
			createTraceEvent({
				skillName: "react-19",
				sessionId: "s1",
				outcome: "used",
				tokenCost: 1000,
			}),
			createTraceEvent({
				skillName: "typescript",
				sessionId: "s1",
				outcome: "loaded",
				tokenCost: 500,
			}),
			createTraceEvent({
				skillName: "sdd-apply",
				sessionId: "s1",
				outcome: "ignored",
			}),
			createTraceEvent({
				skillName: "debug-mode",
				sessionId: "s1",
				outcome: "failed",
			}),
		];

		const summary = summarizeSession(traces, "s1");
		expect(summary.sessionId).toBe("s1");
		expect(summary.totalSkills).toBe(4);
		expect(summary.outcomes.used).toBe(1);
		expect(summary.outcomes.loaded).toBe(1);
		expect(summary.outcomes.ignored).toBe(1);
		expect(summary.outcomes.failed).toBe(1);
		expect(summary.totalTokenCost).toBe(1500);
	});

	it("handles empty traces", () => {
		const summary = summarizeSession([], "s1");
		expect(summary.totalSkills).toBe(0);
		expect(summary.totalTokenCost).toBe(0);
	});
});
