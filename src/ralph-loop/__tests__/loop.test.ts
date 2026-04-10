import { describe, expect, it, vi } from "vitest";
import type { CheckFn, LoopConfig, LoopState } from "../loop.js";
import {
	checkCircuitBreakers,
	DEFAULT_CONFIG,
	formatLoopResult,
	runLoop,
} from "../loop.js";

describe("checkCircuitBreakers", () => {
	const baseState: LoopState = {
		iteration: 0,
		passed: false,
		totalCostUsd: 0,
		elapsedMs: 0,
		errors: [],
		lastResult: "",
	};

	it("returns passed when state.passed is true", () => {
		expect(
			checkCircuitBreakers({ ...baseState, passed: true }, DEFAULT_CONFIG),
		).toBe("passed");
	});

	it("returns max-iterations when limit reached", () => {
		expect(
			checkCircuitBreakers({ ...baseState, iteration: 10 }, DEFAULT_CONFIG),
		).toBe("max-iterations");
	});

	it("returns max-cost when cost exceeded", () => {
		expect(
			checkCircuitBreakers({ ...baseState, totalCostUsd: 5.0 }, DEFAULT_CONFIG),
		).toBe("max-cost");
	});

	it("returns timeout when time exceeded", () => {
		expect(
			checkCircuitBreakers(
				{ ...baseState, elapsedMs: 300_001 },
				DEFAULT_CONFIG,
			),
		).toBe("timeout");
	});

	it("returns null when no breaker triggered", () => {
		expect(checkCircuitBreakers(baseState, DEFAULT_CONFIG)).toBeNull();
	});
});

describe("runLoop", () => {
	it("passes on first iteration when check succeeds", async () => {
		const check: CheckFn = async () => ({
			passed: true,
			output: "all good",
			costUsd: 0.01,
		});

		const result = await runLoop(check, { cooldownMs: 0 });
		expect(result.outcome).toBe("passed");
		expect(result.state.iteration).toBe(1);
		expect(result.state.passed).toBe(true);
	});

	it("retries until pass", async () => {
		let callCount = 0;
		const check: CheckFn = async () => {
			callCount++;
			return {
				passed: callCount >= 3,
				output: callCount < 3 ? "not yet" : "done",
				costUsd: 0.01,
			};
		};

		const result = await runLoop(check, { cooldownMs: 0 });
		expect(result.outcome).toBe("passed");
		expect(result.state.iteration).toBe(3);
	});

	it("stops at max iterations", async () => {
		const check: CheckFn = async () => ({
			passed: false,
			output: "still failing",
			costUsd: 0.01,
		});

		const result = await runLoop(check, {
			maxIterations: 3,
			cooldownMs: 0,
		});
		expect(result.outcome).toBe("max-iterations");
		expect(result.state.iteration).toBe(3);
	});

	it("stops at max cost", async () => {
		const check: CheckFn = async () => ({
			passed: false,
			output: "expensive",
			costUsd: 2.0,
		});

		const result = await runLoop(check, {
			maxCostUsd: 3.0,
			maxIterations: 100,
			cooldownMs: 0,
		});
		expect(result.outcome).toBe("max-cost");
		expect(result.state.totalCostUsd).toBeGreaterThanOrEqual(3.0);
	});

	it("handles errors gracefully", async () => {
		let callCount = 0;
		const check: CheckFn = async () => {
			callCount++;
			if (callCount === 1) throw new Error("boom");
			return { passed: true, output: "recovered", costUsd: 0 };
		};

		const result = await runLoop(check, { cooldownMs: 0 });
		expect(result.outcome).toBe("passed");
		expect(result.state.errors).toHaveLength(1);
		expect(result.state.errors[0]).toContain("boom");
	});

	it("accumulates cost across iterations", async () => {
		let callCount = 0;
		const check: CheckFn = async () => {
			callCount++;
			return {
				passed: callCount >= 3,
				output: "ok",
				costUsd: 0.5,
			};
		};

		const result = await runLoop(check, { cooldownMs: 0 });
		expect(result.state.totalCostUsd).toBeCloseTo(1.5);
	});

	it("calls onIteration callback", async () => {
		const iterations: number[] = [];
		let callCount = 0;
		const check: CheckFn = async () => {
			callCount++;
			return { passed: callCount >= 2, output: "ok", costUsd: 0 };
		};

		await runLoop(check, {
			cooldownMs: 0,
			onIteration: (state) => iterations.push(state.iteration),
		});

		expect(iterations).toEqual([1, 2]);
	});

	it("tracks elapsed time", async () => {
		const check: CheckFn = async () => ({
			passed: true,
			output: "fast",
			costUsd: 0,
		});

		const result = await runLoop(check, { cooldownMs: 0 });
		expect(result.state.elapsedMs).toBeGreaterThanOrEqual(0);
	});
});

describe("formatLoopResult", () => {
	it("formats passed result", () => {
		const output = formatLoopResult({
			outcome: "passed",
			state: {
				iteration: 3,
				passed: true,
				totalCostUsd: 0.15,
				elapsedMs: 5000,
				errors: [],
				lastResult: "all tests pass",
			},
		});
		expect(output).toContain("✅");
		expect(output).toContain("PASSED");
		expect(output).toContain("Iterations: 3");
		expect(output).toContain("$0.15");
	});

	it("formats failed result with errors", () => {
		const output = formatLoopResult({
			outcome: "max-iterations",
			state: {
				iteration: 10,
				passed: false,
				totalCostUsd: 2.5,
				elapsedMs: 30000,
				errors: ["Iteration 1: test failed", "Iteration 2: test failed"],
				lastResult: "still failing",
			},
		});
		expect(output).toContain("🛑");
		expect(output).toContain("MAX-ITERATIONS");
		expect(output).toContain("Errors: 2");
	});

	it("shows only last 3 errors", () => {
		const output = formatLoopResult({
			outcome: "max-iterations",
			state: {
				iteration: 5,
				passed: false,
				totalCostUsd: 1,
				elapsedMs: 10000,
				errors: ["e1", "e2", "e3", "e4", "e5"],
				lastResult: "",
			},
		});
		// Should show e3, e4, e5 but not e1, e2
		expect(output).toContain("e3");
		expect(output).toContain("e5");
		expect(output).not.toContain("- e1");
	});
});
