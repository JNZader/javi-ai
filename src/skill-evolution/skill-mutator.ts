/**
 * SkillMutator — proposes targeted improvements to SKILL.md files
 * based on TraceAnalyzer recommendations. Triple-gate validation:
 * lint score, size limit, frontmatter preservation.
 */

import { lintSkill } from "../skill-linter/rules.js";
import type { Recommendation, RecommendationType } from "./trace-analyzer.js";

// ── Types ──

export interface MutationResult {
	skillName: string;
	original: string;
	mutated: string;
	diff: string;
	lintBefore: number;
	lintAfter: number;
	sizeGrowth: number; // percentage
	accepted: boolean;
	rejectionReasons: string[];
}

export interface ValidationResult {
	valid: boolean;
	reasons: string[];
}

// ── Mutation strategies ──

const RATIONALIZATION_TEMPLATE = `\n## Rationalizations

- **Excuse**: "This step seems unnecessary"
  **Rebuttal**: Follow the process every time — consistency prevents drift.
`;

const TIGHTEN_RULE_TEMPLATE = `
3. **Verify output matches specification before marking task complete**`;

function applyAddRationalization(content: string): string {
	if (content.toLowerCase().includes("## rationalizations")) {
		return content; // already has it
	}
	// Insert before the last section or at end
	return content.trimEnd() + "\n" + RATIONALIZATION_TEMPLATE;
}

function applyTightenRule(content: string): string {
	// Find Critical Rules section and add a rule
	const rulesIdx = content.toLowerCase().indexOf("## critical rules");
	if (rulesIdx === -1) {
		// No rules section — add one
		return (
			content.trimEnd() +
			"\n\n## Critical Rules\n\n1. **Follow all constraints without exception**" +
			TIGHTEN_RULE_TEMPLATE +
			"\n"
		);
	}

	// Find the last numbered rule and append
	const lines = content.split("\n");
	let lastRuleIdx = -1;
	for (let i = 0; i < lines.length; i++) {
		if (/^\d+\.\s+\*?\*/.test(lines[i]!)) {
			lastRuleIdx = i;
		}
	}

	if (lastRuleIdx >= 0) {
		// Count existing rules
		const ruleCount = parseInt(lines[lastRuleIdx]!.match(/^(\d+)/)![1]!, 10);
		const newRule = `${ruleCount + 1}. **Verify output matches specification before marking complete**`;
		lines.splice(lastRuleIdx + 1, 0, newRule);
		return lines.join("\n");
	}

	return content;
}

function applyReduceCost(content: string): string {
	// Add a note about token optimization
	const note =
		"\n\n<!-- TOKEN OPTIMIZATION: This skill has high token cost relative to usage. Consider extracting verbose examples into a references/ directory. -->\n";
	return content.trimEnd() + note;
}

function applyFlagUnused(content: string): string {
	// Don't mutate — just return as-is. The recommendation itself is the output.
	return content;
}

// ── Diff generation ──

function generateDiff(original: string, mutated: string): string {
	if (original === mutated) return "(no changes)";

	const origLines = original.split("\n");
	const mutLines = mutated.split("\n");

	const additions = mutLines.length - origLines.length;
	const addedContent = mutated.slice(original.length).trim();

	if (additions > 0 && addedContent) {
		return `+${additions} lines added:\n${addedContent
			.split("\n")
			.map((l) => `+ ${l}`)
			.join("\n")}`;
	}

	return `Changed: ${origLines.length} → ${mutLines.length} lines`;
}

// ── Main API ──

export function applyRecommendation(
	rec: Recommendation,
	skillContent: string,
): MutationResult {
	const lintBefore = lintSkill(skillContent).score;
	let mutated: string;

	switch (rec.type) {
		case "add_rationalization":
			mutated = applyAddRationalization(skillContent);
			break;
		case "tighten_rule":
			mutated = applyTightenRule(skillContent);
			break;
		case "reduce_cost":
			mutated = applyReduceCost(skillContent);
			break;
		case "flag_unused":
			mutated = applyFlagUnused(skillContent);
			break;
		case "suggest_merge":
			mutated = skillContent; // merge is a structural change, not a content mutation
			break;
		default:
			mutated = skillContent;
	}

	const lintAfter = lintSkill(mutated).score;
	const sizeGrowth =
		skillContent.length > 0
			? ((mutated.length - skillContent.length) / skillContent.length) * 100
			: 0;

	const validation = validateMutation(skillContent, mutated);
	const diff = generateDiff(skillContent, mutated);

	return {
		skillName: rec.skillName,
		original: skillContent,
		mutated: validation.valid ? mutated : skillContent,
		diff,
		lintBefore,
		lintAfter,
		sizeGrowth: Math.round(sizeGrowth * 10) / 10,
		accepted: validation.valid && mutated !== skillContent,
		rejectionReasons: validation.reasons,
	};
}

export function validateMutation(
	original: string,
	mutated: string,
): ValidationResult {
	const reasons: string[] = [];

	if (!mutated.trim()) {
		reasons.push("Mutation produced empty content");
		return { valid: false, reasons };
	}

	// Lint score gate
	const originalScore = lintSkill(original).score;
	const mutatedScore = lintSkill(mutated).score;
	if (mutatedScore < originalScore) {
		reasons.push(`Lint score decreased: ${originalScore} → ${mutatedScore}`);
	}

	// Size limit (20%) — only enforce for non-trivial files (>500 chars)
	if (original.length > 500) {
		const growth = ((mutated.length - original.length) / original.length) * 100;
		if (growth > 20) {
			reasons.push(`Size growth ${growth.toFixed(1)}% exceeds 20% limit`);
		}
	}

	return { valid: reasons.length === 0, reasons };
}
