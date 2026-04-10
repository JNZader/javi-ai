/**
 * Skill linter rules — validates and scores SKILL.md files against
 * best practices: rationalizations, lifecycle phases, constraint-first
 * personas, and structural requirements.
 */

import { parseFrontmatter } from "../lib/frontmatter.js";

// ── Types ──

export type RuleSeverity = "error" | "warning" | "info";

export interface LintFinding {
	ruleId: string;
	severity: RuleSeverity;
	message: string;
	line?: number;
}

export interface LintResult {
	file: string;
	findings: LintFinding[];
	score: number; // 0-100
	hasFrontmatter: boolean;
	phase?: string;
	hasRationalizations: boolean;
	hasConstraints: boolean;
	constraintsBeforePersonality: boolean;
}

export const VALID_PHASES = [
	"explore",
	"plan",
	"build",
	"verify",
	"review",
	"ship",
	"operate",
	"learn",
] as const;

export type LifecyclePhase = (typeof VALID_PHASES)[number];

// ── Section detection ──

function findSection(
	content: string,
	heading: string,
): { found: boolean; line: number } {
	const lines = content.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!.trim().toLowerCase();
		if (line.startsWith("##") && line.includes(heading.toLowerCase())) {
			return { found: true, line: i + 1 };
		}
	}
	return { found: false, line: -1 };
}

function findSectionPosition(content: string, heading: string): number {
	const lines = content.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!.trim().toLowerCase();
		if (line.startsWith("##") && line.includes(heading.toLowerCase())) {
			return i;
		}
	}
	return -1;
}

// ── Rules ──

function checkFrontmatter(content: string): LintFinding[] {
	const findings: LintFinding[] = [];
	const fm = parseFrontmatter(content);

	if (!fm) {
		findings.push({
			ruleId: "frontmatter-required",
			severity: "error",
			message: "SKILL.md must start with YAML frontmatter (---)",
			line: 1,
		});
		return findings;
	}

	if (!fm.data.name) {
		findings.push({
			ruleId: "frontmatter-name",
			severity: "error",
			message: 'Frontmatter must include "name" field',
			line: 1,
		});
	}

	if (!fm.data.description) {
		findings.push({
			ruleId: "frontmatter-description",
			severity: "warning",
			message: 'Frontmatter should include "description" field',
			line: 1,
		});
	}

	return findings;
}

function checkPhase(content: string): {
	findings: LintFinding[];
	phase?: string;
} {
	const fm = parseFrontmatter(content);
	if (!fm) return { findings: [] };

	const phase = fm.data.phase;
	if (!phase) {
		return {
			findings: [
				{
					ruleId: "lifecycle-phase",
					severity: "info",
					message: `Frontmatter should include "phase" field (${VALID_PHASES.join(", ")})`,
					line: 1,
				},
			],
		};
	}

	const phaseStr = Array.isArray(phase) ? phase[0] : phase;
	if (phaseStr && !VALID_PHASES.includes(phaseStr as LifecyclePhase)) {
		return {
			findings: [
				{
					ruleId: "lifecycle-phase-invalid",
					severity: "warning",
					message: `Invalid phase "${phaseStr}". Valid: ${VALID_PHASES.join(", ")}`,
					line: 1,
				},
			],
			phase: phaseStr,
		};
	}

	return { findings: [], phase: phaseStr };
}

function checkRationalizations(content: string): LintFinding[] {
	const { found } = findSection(content, "rationalizations");
	if (!found) {
		return [
			{
				ruleId: "rationalizations-missing",
				severity: "warning",
				message:
					"Skill should include a ## Rationalizations section listing common agent excuses and rebuttals",
			},
		];
	}
	return [];
}

function checkConstraintsFirst(content: string): {
	findings: LintFinding[];
	hasConstraints: boolean;
	constraintsBeforePersonality: boolean;
} {
	const constraintsPos = findSectionPosition(content, "constraints");
	const personalityPos = findSectionPosition(content, "personality");
	const rolePos = findSectionPosition(content, "role");
	const identityPos = findSectionPosition(content, "identity");

	const hasConstraints = constraintsPos >= 0;

	if (!hasConstraints) {
		return {
			findings: [
				{
					ruleId: "constraints-missing",
					severity: "info",
					message:
						"Consider adding a ## Constraints section before role/personality definitions",
				},
			],
			hasConstraints: false,
			constraintsBeforePersonality: false,
		};
	}

	// Check if constraints comes before any personality/role section
	const personalityLike = [personalityPos, rolePos, identityPos].filter(
		(p) => p >= 0,
	);

	if (personalityLike.length === 0) {
		return {
			findings: [],
			hasConstraints: true,
			constraintsBeforePersonality: true,
		};
	}

	const earliestPersonality = Math.min(...personalityLike);
	const constraintsBeforePersonality = constraintsPos < earliestPersonality;

	if (!constraintsBeforePersonality) {
		return {
			findings: [
				{
					ruleId: "constraints-after-personality",
					severity: "warning",
					message:
						"## Constraints should appear BEFORE ## Personality/Role — constraints shape behavior more effectively than identity framing",
				},
			],
			hasConstraints: true,
			constraintsBeforePersonality: false,
		};
	}

	return {
		findings: [],
		hasConstraints: true,
		constraintsBeforePersonality: true,
	};
}

function checkCriticalRules(content: string): LintFinding[] {
	const { found } = findSection(content, "critical rules");
	if (!found) {
		return [
			{
				ruleId: "critical-rules-missing",
				severity: "warning",
				message:
					"Skill should include a ## Critical Rules section with numbered rules",
			},
		];
	}
	return [];
}

// ── Scoring ──

function computeScore(findings: LintFinding[]): number {
	let score = 100;
	for (const f of findings) {
		if (f.severity === "error") score -= 20;
		else if (f.severity === "warning") score -= 10;
		else if (f.severity === "info") score -= 3;
	}
	return Math.max(0, score);
}

// ── Main linter ──

export function lintSkill(
	content: string,
	filePath: string = "SKILL.md",
): LintResult {
	const allFindings: LintFinding[] = [];

	// Structural
	allFindings.push(...checkFrontmatter(content));
	allFindings.push(...checkCriticalRules(content));

	// Anti-drift rationalizations
	const hasRationalizations = findSection(content, "rationalizations").found;
	allFindings.push(...checkRationalizations(content));

	// Lifecycle phase
	const phaseResult = checkPhase(content);
	allFindings.push(...phaseResult.findings);

	// Constraint-first
	const constraintResult = checkConstraintsFirst(content);
	allFindings.push(...constraintResult.findings);

	return {
		file: filePath,
		findings: allFindings,
		score: computeScore(allFindings),
		hasFrontmatter: parseFrontmatter(content) !== null,
		phase: phaseResult.phase,
		hasRationalizations,
		hasConstraints: constraintResult.hasConstraints,
		constraintsBeforePersonality: constraintResult.constraintsBeforePersonality,
	};
}
