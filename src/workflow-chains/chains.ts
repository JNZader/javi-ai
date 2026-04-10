/**
 * Multi-skill workflow chains — predefined pipelines that chain
 * multiple skills in sequence (e.g., feature-dev → test → deploy).
 *
 * Each chain defines steps with skill references, inputs/outputs,
 * and optional conditions for conditional branching.
 */

import fs from "fs-extra";
import path from "path";

// ── Types ──

export interface ChainStep {
	id: string;
	skill: string;
	description: string;
	inputs?: Record<string, string>;
	condition?: string;
	onFailure?: "stop" | "skip" | "retry";
}

export interface WorkflowChain {
	name: string;
	description: string;
	steps: ChainStep[];
	tags?: string[];
}

export interface ChainRegistry {
	version: string;
	chains: Record<string, WorkflowChain>;
}

export interface ChainExecution {
	chain: string;
	currentStep: number;
	totalSteps: number;
	completed: string[];
	skipped: string[];
	failed: string[];
	status: "running" | "completed" | "failed" | "stopped";
}

// ── Built-in chains ──

export const BUILTIN_CHAINS: Record<string, WorkflowChain> = {
	"feature-dev": {
		name: "feature-dev",
		description: "Full feature development pipeline",
		steps: [
			{
				id: "explore",
				skill: "sdd-explore",
				description: "Investigate requirements and codebase",
			},
			{
				id: "spec",
				skill: "sdd-spec",
				description: "Write specifications",
			},
			{
				id: "design",
				skill: "sdd-design",
				description: "Create technical design",
			},
			{
				id: "implement",
				skill: "sdd-apply",
				description: "Implement the feature",
			},
			{
				id: "verify",
				skill: "sdd-verify",
				description: "Validate implementation",
			},
			{
				id: "review",
				skill: "adversarial-review",
				description: "Multi-perspective code review",
				onFailure: "stop",
			},
		],
		tags: ["sdd", "full-cycle"],
	},
	"quick-fix": {
		name: "quick-fix",
		description: "Rapid bug fix pipeline",
		steps: [
			{
				id: "debug",
				skill: "debug-mode",
				description: "Diagnose the issue",
			},
			{
				id: "fix",
				skill: "sdd-apply",
				description: "Apply the fix",
			},
			{
				id: "test",
				skill: "sdd-verify",
				description: "Verify the fix",
			},
			{
				id: "commit",
				skill: "git:commit",
				description: "Commit the fix",
			},
		],
		tags: ["bugfix", "fast"],
	},
	"quality-gate": {
		name: "quality-gate",
		description: "Pre-merge quality validation",
		steps: [
			{
				id: "lint",
				skill: "refactoring:cleanup",
				description: "Clean up code",
			},
			{
				id: "review",
				skill: "adversarial-review",
				description: "Security + quality review",
			},
			{
				id: "coverage",
				skill: "testing:test-coverage",
				description: "Analyze test coverage",
			},
			{
				id: "pr",
				skill: "git:pr-create",
				description: "Create pull request",
			},
		],
		tags: ["quality", "pr"],
	},
};

// ── Registry ──

export function parseChainRegistry(content: string): ChainRegistry {
	const registry: ChainRegistry = { version: "1.0.0", chains: {} };
	const lines = content.split("\n");

	let currentChain: string | null = null;
	let currentStep: Partial<ChainStep> | null = null;

	for (const line of lines) {
		const trimmed = line.trimEnd();

		if (trimmed.startsWith("version:")) {
			registry.version =
				trimmed.split(":")[1]?.trim().replace(/['"]/g, "") ?? "1.0.0";
			continue;
		}

		// Chain name (2-space indent)
		const chainMatch = trimmed.match(/^ {2}([\w-]+):\s*$/);
		if (chainMatch) {
			currentChain = chainMatch[1];
			registry.chains[currentChain] = {
				name: currentChain,
				description: "",
				steps: [],
			};
			currentStep = null;
			continue;
		}

		if (!currentChain) continue;
		const chain = registry.chains[currentChain]!;

		// Description
		const descMatch = trimmed.match(/^ {4}description:\s*['"]?(.+?)['"]?\s*$/);
		if (descMatch) {
			chain.description = descMatch[1];
			continue;
		}

		// Step (6-space indent with dash)
		const stepMatch = trimmed.match(/^ {6}- id:\s*(.+)$/);
		if (stepMatch) {
			currentStep = { id: stepMatch[1].trim() };
			chain.steps.push(currentStep as ChainStep);
			continue;
		}

		if (currentStep) {
			const skillMatch = trimmed.match(/^ {8}skill:\s*(.+)$/);
			if (skillMatch) {
				currentStep.skill = skillMatch[1].trim();
				continue;
			}
			const stepDescMatch = trimmed.match(
				/^ {8}description:\s*['"]?(.+?)['"]?\s*$/,
			);
			if (stepDescMatch) {
				currentStep.description = stepDescMatch[1];
				continue;
			}
			const failMatch = trimmed.match(/^ {8}onFailure:\s*(.+)$/);
			if (failMatch) {
				currentStep.onFailure = failMatch[1].trim() as ChainStep["onFailure"];
			}
		}
	}

	return registry;
}

// ── Execution tracking ──

export function createExecution(chain: WorkflowChain): ChainExecution {
	return {
		chain: chain.name,
		currentStep: 0,
		totalSteps: chain.steps.length,
		completed: [],
		skipped: [],
		failed: [],
		status: "running",
	};
}

export function advanceStep(
	execution: ChainExecution,
	passed: boolean,
	onFailure: ChainStep["onFailure"] = "stop",
): ChainExecution {
	const stepId = `step-${execution.currentStep}`;

	if (passed) {
		execution.completed.push(stepId);
	} else {
		switch (onFailure) {
			case "skip":
				execution.skipped.push(stepId);
				break;
			case "stop":
				execution.failed.push(stepId);
				execution.status = "failed";
				return execution;
			default:
				execution.failed.push(stepId);
				execution.status = "failed";
				return execution;
		}
	}

	execution.currentStep++;
	if (execution.currentStep >= execution.totalSteps) {
		execution.status = "completed";
	}

	return execution;
}

// ── Listing ──

export function listChains(
	registry?: ChainRegistry,
): Array<{ name: string; description: string; stepCount: number }> {
	const chains = registry
		? Object.values(registry.chains)
		: Object.values(BUILTIN_CHAINS);

	return chains.map((c) => ({
		name: c.name,
		description: c.description,
		stepCount: c.steps.length,
	}));
}

export function getChain(
	name: string,
	registry?: ChainRegistry,
): WorkflowChain | null {
	if (registry?.chains[name]) return registry.chains[name];
	return BUILTIN_CHAINS[name] ?? null;
}

// ── File I/O ──

export async function loadChainRegistry(
	registryPath: string,
): Promise<ChainRegistry | null> {
	if (!(await fs.pathExists(registryPath))) return null;
	try {
		const content = await fs.readFile(registryPath, "utf-8");
		return parseChainRegistry(content);
	} catch {
		return null;
	}
}
