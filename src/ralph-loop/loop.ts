/**
 * Ralph loop pattern — automated run-until-specs-pass with circuit breakers,
 * cost caps, and safety guardrails.
 *
 * The loop runs a check function repeatedly until it passes or a limit is hit.
 * Named after the "Ralph" pattern from awesome-claude-code.
 */

// ── Types ──

export interface LoopConfig {
	maxIterations: number;
	maxCostUsd: number;
	timeoutMs: number;
	cooldownMs: number;
	onIteration?: (state: LoopState) => void;
}

export interface LoopState {
	iteration: number;
	passed: boolean;
	totalCostUsd: number;
	elapsedMs: number;
	errors: string[];
	lastResult: string;
}

export type CheckResult = {
	passed: boolean;
	output: string;
	costUsd: number;
};

export type CheckFn = (iteration: number) => Promise<CheckResult>;

export type LoopOutcome =
	| "passed"
	| "max-iterations"
	| "max-cost"
	| "timeout"
	| "error";

export interface LoopResult {
	outcome: LoopOutcome;
	state: LoopState;
}

// ── Defaults ──

export const DEFAULT_CONFIG: LoopConfig = {
	maxIterations: 10,
	maxCostUsd: 5.0,
	timeoutMs: 300_000, // 5 minutes
	cooldownMs: 1000,
};

// ── Circuit breakers ──

export function checkCircuitBreakers(
	state: LoopState,
	config: LoopConfig,
): LoopOutcome | null {
	if (state.passed) return "passed";
	if (state.iteration >= config.maxIterations) return "max-iterations";
	if (state.totalCostUsd >= config.maxCostUsd) return "max-cost";
	if (state.elapsedMs >= config.timeoutMs) return "timeout";
	return null;
}

// ── Loop runner ──

export async function runLoop(
	check: CheckFn,
	config: Partial<LoopConfig> = {},
): Promise<LoopResult> {
	const cfg = { ...DEFAULT_CONFIG, ...config };
	const startTime = Date.now();

	const state: LoopState = {
		iteration: 0,
		passed: false,
		totalCostUsd: 0,
		elapsedMs: 0,
		errors: [],
		lastResult: "",
	};

	while (true) {
		state.elapsedMs = Date.now() - startTime;

		// Check circuit breakers before running
		const preBreaker = checkCircuitBreakers(state, cfg);
		if (preBreaker) {
			return { outcome: preBreaker, state };
		}

		state.iteration++;

		try {
			const result = await check(state.iteration);
			state.lastResult = result.output;
			state.totalCostUsd += result.costUsd;
			state.passed = result.passed;

			cfg.onIteration?.(state);

			if (result.passed) {
				return { outcome: "passed", state };
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			state.errors.push(`Iteration ${state.iteration}: ${msg}`);
			state.lastResult = msg;

			cfg.onIteration?.(state);
		}

		state.elapsedMs = Date.now() - startTime;

		// Check breakers after running
		const postBreaker = checkCircuitBreakers(state, cfg);
		if (postBreaker) {
			return { outcome: postBreaker, state };
		}

		// Cooldown between iterations
		if (cfg.cooldownMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, cfg.cooldownMs));
		}
	}
}

// ── Formatting ──

export function formatLoopResult(result: LoopResult): string {
	const { outcome, state } = result;
	const lines: string[] = [];

	const icon = outcome === "passed" ? "✅" : outcome === "error" ? "💥" : "🛑";

	lines.push(`${icon} Ralph Loop: ${outcome.toUpperCase()}`);
	lines.push(`   Iterations: ${state.iteration}`);
	lines.push(`   Cost: $${state.totalCostUsd.toFixed(2)}`);
	lines.push(`   Time: ${(state.elapsedMs / 1000).toFixed(1)}s`);

	if (state.errors.length > 0) {
		lines.push(`   Errors: ${state.errors.length}`);
		for (const err of state.errors.slice(-3)) {
			lines.push(`     - ${err}`);
		}
	}

	return lines.join("\n");
}
