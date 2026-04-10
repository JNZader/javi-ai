/**
 * PluginEval — quality scoring framework for AI skills/plugins.
 * Evaluates across 10 dimensions with weighted scoring and badge certification.
 */

import fs from "fs-extra";
import path from "path";
import { parseFrontmatter } from "../lib/frontmatter.js";

// ── Dimensions ──

export const DIMENSIONS = [
	"trigger-accuracy",
	"token-efficiency",
	"scope-calibration",
	"output-quality",
	"error-handling",
	"documentation",
	"testability",
	"composability",
	"maintainability",
	"security",
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

export interface DimensionScore {
	dimension: Dimension;
	score: number; // 0-10
	maxScore: number;
	weight: number;
	details: string[];
}

export interface EvalResult {
	skillName: string;
	skillPath: string;
	dimensions: DimensionScore[];
	totalScore: number;
	maxPossible: number;
	percentage: number;
	badge: Badge | null;
	timestamp: string;
}

export type Badge = "platinum" | "gold" | "silver" | "bronze" | "none";

// ── Weights ──

const WEIGHTS: Record<Dimension, number> = {
	"trigger-accuracy": 1.5,
	"token-efficiency": 1.2,
	"scope-calibration": 1.0,
	"output-quality": 1.5,
	"error-handling": 0.8,
	documentation: 1.0,
	testability: 1.0,
	composability: 0.8,
	maintainability: 1.0,
	security: 1.2,
};

// ── Badge thresholds ──

export function calculateBadge(percentage: number): Badge {
	if (percentage >= 95) return "platinum";
	if (percentage >= 85) return "gold";
	if (percentage >= 70) return "silver";
	if (percentage >= 50) return "bronze";
	return "none";
}

// ── Evaluators ──

interface SkillContent {
	raw: string;
	frontmatter: Record<string, string | string[]> | null;
	body: string;
	hasReferences: boolean;
	hasVariants: boolean;
	wordCount: number;
	sectionCount: number;
	hasExamples: boolean;
	hasCriticalRules: boolean;
}

async function loadSkillContent(skillDir: string): Promise<SkillContent> {
	const skillMd = path.join(skillDir, "SKILL.md");
	const raw = (await fs.pathExists(skillMd))
		? await fs.readFile(skillMd, "utf-8")
		: "";
	const fm = raw ? parseFrontmatter(raw) : null;

	return {
		raw,
		frontmatter: fm?.data ?? null,
		body: fm?.content ?? raw,
		hasReferences: await fs.pathExists(path.join(skillDir, "references")),
		hasVariants: await fs.pathExists(path.join(skillDir, "variants")),
		wordCount: raw.split(/\s+/).filter(Boolean).length,
		sectionCount: (raw.match(/^#{1,3}\s/gm) ?? []).length,
		hasExamples: /example|```/i.test(raw),
		hasCriticalRules: /critical\s*rules/i.test(raw),
	};
}

function evalTriggerAccuracy(content: SkillContent): DimensionScore {
	const details: string[] = [];
	let score = 0;

	if (content.frontmatter?.name) {
		score += 2;
		details.push("Has name in frontmatter");
	}
	if (content.frontmatter?.description) {
		score += 2;
		details.push("Has description in frontmatter");
	}
	if (/trigger|when to use|activation/i.test(content.raw)) {
		score += 3;
		details.push("Has trigger/activation section");
	}
	if (content.frontmatter?.dependencies) {
		score += 1;
		details.push("Declares dependencies");
	}
	if (/context|detect/i.test(content.raw)) {
		score += 2;
		details.push("Has context detection guidance");
	}

	return {
		dimension: "trigger-accuracy",
		score: Math.min(10, score),
		maxScore: 10,
		weight: WEIGHTS["trigger-accuracy"],
		details,
	};
}

function evalTokenEfficiency(content: SkillContent): DimensionScore {
	const details: string[] = [];
	let score = 10;

	if (content.wordCount > 5000) {
		score -= 3;
		details.push(`Very long (${content.wordCount} words) — consider splitting`);
	} else if (content.wordCount > 3000) {
		score -= 1;
		details.push(`Long (${content.wordCount} words)`);
	} else {
		details.push(`Good length (${content.wordCount} words)`);
	}

	if (content.hasReferences) {
		score += 1;
		details.push("Uses references/ for on-demand loading");
	}

	if (content.wordCount < 50) {
		score -= 4;
		details.push("Too short — likely incomplete");
	}

	return {
		dimension: "token-efficiency",
		score: Math.max(0, Math.min(10, score)),
		maxScore: 10,
		weight: WEIGHTS["token-efficiency"],
		details,
	};
}

function evalScopeCalibration(content: SkillContent): DimensionScore {
	const details: string[] = [];
	let score = 0;

	if (content.sectionCount >= 3) {
		score += 3;
		details.push(`Well-structured (${content.sectionCount} sections)`);
	} else if (content.sectionCount >= 1) {
		score += 1;
		details.push(`Basic structure (${content.sectionCount} sections)`);
	}

	if (/do not|never|avoid|don't/i.test(content.raw)) {
		score += 2;
		details.push("Has negative constraints (scope boundaries)");
	}

	if (/when to|should|must/i.test(content.raw)) {
		score += 2;
		details.push("Has directive language");
	}

	if (content.hasCriticalRules) {
		score += 3;
		details.push("Has Critical Rules section");
	}

	return {
		dimension: "scope-calibration",
		score: Math.min(10, score),
		maxScore: 10,
		weight: WEIGHTS["scope-calibration"],
		details,
	};
}

function evalOutputQuality(content: SkillContent): DimensionScore {
	const details: string[] = [];
	let score = 0;

	if (content.hasExamples) {
		score += 4;
		details.push("Has examples or code blocks");
	}

	if (/pattern|template|format/i.test(content.raw)) {
		score += 2;
		details.push("Defines output patterns/templates");
	}

	if (/```\w+/g.test(content.raw)) {
		score += 2;
		details.push("Has language-tagged code blocks");
	}

	if (/✅|✗|✓|good|bad|correct|incorrect/i.test(content.raw)) {
		score += 2;
		details.push("Has good/bad comparisons");
	}

	return {
		dimension: "output-quality",
		score: Math.min(10, score),
		maxScore: 10,
		weight: WEIGHTS["output-quality"],
		details,
	};
}

function evalErrorHandling(content: SkillContent): DimensionScore {
	const details: string[] = [];
	let score = 0;

	if (/error|fail|edge case|fallback/i.test(content.raw)) {
		score += 4;
		details.push("Addresses error/edge cases");
	}

	if (/if.*not|if.*missing|if.*fail/i.test(content.raw)) {
		score += 3;
		details.push("Has conditional handling");
	}

	if (/graceful|recover|retry/i.test(content.raw)) {
		score += 3;
		details.push("Has recovery guidance");
	}

	return {
		dimension: "error-handling",
		score: Math.min(10, score),
		maxScore: 10,
		weight: WEIGHTS["error-handling"],
		details,
	};
}

function evalDocumentation(content: SkillContent): DimensionScore {
	const details: string[] = [];
	let score = 0;

	if (content.frontmatter?.name) {
		score += 1;
		details.push("Has name");
	}
	if (content.frontmatter?.description) {
		score += 2;
		details.push("Has description");
	}
	if (content.frontmatter?.version) {
		score += 1;
		details.push("Has version");
	}

	if (content.sectionCount >= 3) {
		score += 2;
		details.push("Well-sectioned");
	}

	if (content.hasExamples) {
		score += 2;
		details.push("Has examples");
	}

	if (content.wordCount >= 200) {
		score += 2;
		details.push("Adequate documentation length");
	}

	return {
		dimension: "documentation",
		score: Math.min(10, score),
		maxScore: 10,
		weight: WEIGHTS.documentation,
		details,
	};
}

function evalTestability(content: SkillContent): DimensionScore {
	const details: string[] = [];
	let score = 0;

	if (/test|verify|assert|expect/i.test(content.raw)) {
		score += 3;
		details.push("References testing");
	}

	if (/scenario|given|when|then/i.test(content.raw)) {
		score += 3;
		details.push("Has scenario-based guidance");
	}

	if (content.hasCriticalRules) {
		score += 2;
		details.push("Critical Rules are testable assertions");
	}

	if (content.hasExamples) {
		score += 2;
		details.push("Examples serve as test cases");
	}

	return {
		dimension: "testability",
		score: Math.min(10, score),
		maxScore: 10,
		weight: WEIGHTS.testability,
		details,
	};
}

function evalComposability(content: SkillContent): DimensionScore {
	const details: string[] = [];
	let score = 0;

	if (content.frontmatter?.dependencies) {
		score += 3;
		details.push("Declares skill dependencies");
	}

	if (content.hasVariants) {
		score += 2;
		details.push("Has variants for multi-mode usage");
	}

	if (/combine|chain|together|alongside/i.test(content.raw)) {
		score += 2;
		details.push("Mentions composition with other skills");
	}

	if (content.hasReferences) {
		score += 3;
		details.push("Uses modular references/ structure");
	}

	return {
		dimension: "composability",
		score: Math.min(10, score),
		maxScore: 10,
		weight: WEIGHTS.composability,
		details,
	};
}

function evalMaintainability(content: SkillContent): DimensionScore {
	const details: string[] = [];
	let score = 0;

	if (content.frontmatter?.version) {
		score += 2;
		details.push("Versioned");
	}

	if (content.sectionCount >= 3 && content.sectionCount <= 15) {
		score += 3;
		details.push("Good section count for maintainability");
	}

	if (content.wordCount >= 100 && content.wordCount <= 3000) {
		score += 3;
		details.push("Maintainable length");
	}

	if (!/\t/g.test(content.raw)) {
		score += 2;
		details.push("Consistent formatting (no tabs)");
	}

	return {
		dimension: "maintainability",
		score: Math.min(10, score),
		maxScore: 10,
		weight: WEIGHTS.maintainability,
		details,
	};
}

function evalSecurity(content: SkillContent): DimensionScore {
	const details: string[] = [];
	let score = 5; // neutral baseline

	if (/security|safe|sanitize|validate|escape/i.test(content.raw)) {
		score += 3;
		details.push("References security practices");
	}

	if (/injection|xss|csrf|auth/i.test(content.raw)) {
		score += 2;
		details.push("Addresses specific security concerns");
	}

	if (/secret|credential|token|password|api.?key/i.test(content.raw)) {
		if (/never|do not|avoid|don't/i.test(content.raw)) {
			score += 2;
			details.push("Has credential safety guidance");
		} else {
			score -= 2;
			details.push("Mentions secrets without safety guidance");
		}
	}

	if (details.length === 0) {
		details.push("No explicit security guidance (neutral)");
	}

	return {
		dimension: "security",
		score: Math.max(0, Math.min(10, score)),
		maxScore: 10,
		weight: WEIGHTS.security,
		details,
	};
}

// ── Main evaluator ──

const EVALUATORS: Array<(content: SkillContent) => DimensionScore> = [
	evalTriggerAccuracy,
	evalTokenEfficiency,
	evalScopeCalibration,
	evalOutputQuality,
	evalErrorHandling,
	evalDocumentation,
	evalTestability,
	evalComposability,
	evalMaintainability,
	evalSecurity,
];

export async function evaluateSkill(skillDir: string): Promise<EvalResult> {
	const content = await loadSkillContent(skillDir);
	const dimensions = EVALUATORS.map((fn) => fn(content));

	const totalScore = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);
	const maxPossible = dimensions.reduce(
		(sum, d) => sum + d.maxScore * d.weight,
		0,
	);
	const percentage = maxPossible > 0 ? (totalScore / maxPossible) * 100 : 0;

	return {
		skillName: path.basename(skillDir),
		skillPath: skillDir,
		dimensions,
		totalScore: Math.round(totalScore * 100) / 100,
		maxPossible: Math.round(maxPossible * 100) / 100,
		percentage: Math.round(percentage * 10) / 10,
		badge: calculateBadge(percentage),
		timestamp: new Date().toISOString(),
	};
}

export function formatEvalReport(result: EvalResult): string {
	const lines: string[] = [
		`## PluginEval: ${result.skillName}`,
		"",
		`Badge: **${result.badge?.toUpperCase() ?? "NONE"}** (${result.percentage}%)`,
		`Score: ${result.totalScore}/${result.maxPossible}`,
		"",
		"| Dimension | Score | Weight | Details |",
		"|-----------|------:|-------:|---------|",
	];

	for (const d of result.dimensions) {
		const detail = d.details.join("; ") || "—";
		lines.push(
			`| ${d.dimension} | ${d.score}/${d.maxScore} | x${d.weight} | ${detail} |`,
		);
	}

	return lines.join("\n");
}
