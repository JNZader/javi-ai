/**
 * Skillify — generates a well-structured SKILL.md from parameters.
 * Lowers the barrier from "write YAML frontmatter manually" to
 * "answer a few questions and get a valid skill".
 */

import type { LifecyclePhase } from "./rules.js";

export interface SkillifyInput {
	name: string;
	description: string;
	version?: string;
	phase?: LifecyclePhase;
	triggers?: string[];
	constraints?: string[];
	rationalizations?: Array<{ excuse: string; rebuttal: string }>;
	steps?: string[];
	criticalRules?: string[];
	allowedTools?: string[];
}

export function generateSkillMd(input: SkillifyInput): string {
	const lines: string[] = [];

	// Frontmatter
	lines.push("---");
	lines.push(`name: ${input.name}`);
	lines.push(`description: ${input.description}`);
	if (input.version) lines.push(`version: ${input.version}`);
	if (input.phase) lines.push(`phase: ${input.phase}`);
	if (input.triggers?.length) {
		lines.push("triggers:");
		for (const t of input.triggers) lines.push(`  - ${t}`);
	}
	if (input.allowedTools?.length) {
		lines.push("allowed-tools:");
		for (const t of input.allowedTools) lines.push(`  - ${t}`);
	}
	lines.push("---");
	lines.push("");

	// Title
	lines.push(`# ${formatTitle(input.name)}`);
	lines.push("");

	// Purpose
	lines.push("## Purpose");
	lines.push("");
	lines.push(input.description);
	lines.push("");

	// Constraints (before any personality)
	if (input.constraints?.length) {
		lines.push("## Constraints");
		lines.push("");
		for (let i = 0; i < input.constraints.length; i++) {
			lines.push(`${i + 1}. ${input.constraints[i]}`);
		}
		lines.push("");
	}

	// Execution Steps
	if (input.steps?.length) {
		lines.push("## Execution Steps");
		lines.push("");
		for (let i = 0; i < input.steps.length; i++) {
			lines.push(`### Step ${i + 1} — ${input.steps[i]}`);
			lines.push("");
			lines.push(`<!-- Describe step ${i + 1} in detail -->`);
			lines.push("");
		}
	}

	// Critical Rules
	if (input.criticalRules?.length) {
		lines.push("## Critical Rules");
		lines.push("");
		for (let i = 0; i < input.criticalRules.length; i++) {
			lines.push(`${i + 1}. **${input.criticalRules[i]}**`);
		}
		lines.push("");
	}

	// Rationalizations (anti-drift)
	if (input.rationalizations?.length) {
		lines.push("## Rationalizations");
		lines.push("");
		lines.push(
			"Common excuses the agent may use to skip steps, with rebuttals:",
		);
		lines.push("");
		for (const r of input.rationalizations) {
			lines.push(`- **Excuse**: "${r.excuse}"`);
			lines.push(`  **Rebuttal**: ${r.rebuttal}`);
			lines.push("");
		}
	}

	return lines.join("\n");
}

function formatTitle(name: string): string {
	return name
		.split("-")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
}

/**
 * Generate a Socratic teaching wrapper skill that forces question-based
 * guidance instead of direct answers.
 */
export function generateSocraticWrapper(wrappedSkillName: string): string {
	return generateSkillMd({
		name: `socratic-${wrappedSkillName}`,
		description: `Socratic teaching wrapper for ${wrappedSkillName}. Guides users through questions instead of giving direct answers.`,
		version: "1.0.0",
		phase: "learn",
		constraints: [
			"NEVER give the direct answer first — always start with a guiding question",
			"Ask at most 3 questions before providing the answer if the user is stuck",
			"Each question should build on the previous answer, narrowing toward the solution",
			"If the user answers correctly, acknowledge and move to the next concept",
			"If the user answers incorrectly, explain WHY with evidence before asking the next question",
			"Always end with a summary of what the user learned, not what you told them",
		],
		rationalizations: [
			{
				excuse: "The user asked for a direct answer, so I should just give it",
				rebuttal:
					"The user is in learning mode. A direct answer teaches nothing. Guide them to discover it.",
			},
			{
				excuse: "This is a simple question, no need for Socratic method",
				rebuttal:
					"Even simple questions benefit from 'what do you think?' — it reveals misconceptions.",
			},
			{
				excuse: "We're running low on context, let me skip the questions",
				rebuttal:
					"One good question uses fewer tokens than a long explanation. Ask, don't lecture.",
			},
		],
		steps: [
			"Identify the core concept the user needs to understand",
			"Ask a diagnostic question to gauge current understanding",
			"Based on response, ask a more targeted question",
			"When user demonstrates understanding, confirm and extend",
		],
		criticalRules: [
			"Questions FIRST, answers SECOND — this is non-negotiable",
			"Never answer your own questions — wait for the user",
			"Acknowledge correct answers before moving on",
			"Limit to 3 questions max before revealing the answer",
		],
	});
}
