/**
 * Context breakdown — reports token usage per loaded skill during
 * a session. Observability for the skill layer: which skills eat
 * the most context window.
 */

import fs from "fs";
import path from "path";

// ── Types ──

export interface SkillTokenReport {
	name: string;
	filePath: string;
	charCount: number;
	tokenEstimate: number;
	percentage: number; // of total
}

export interface ContextBreakdown {
	totalTokens: number;
	totalSkills: number;
	skills: SkillTokenReport[];
	heaviest: string | null;
	topConsumers: SkillTokenReport[]; // top 5
}

// ── Token estimation ──

const CHARS_PER_TOKEN = 4;

export function estimateTokens(content: string): number {
	return Math.max(1, Math.ceil(content.length / CHARS_PER_TOKEN));
}

// ── Skill scanning ──

export function analyzeSkillDir(skillPath: string): SkillTokenReport | null {
	const skillMd = path.join(skillPath, "SKILL.md");
	if (!fs.existsSync(skillMd)) return null;

	const name = path.basename(skillPath);
	let totalChars = 0;

	// Count SKILL.md
	try {
		totalChars += fs.readFileSync(skillMd, "utf-8").length;
	} catch {
		return null;
	}

	// Count references/ directory if exists
	const refsDir = path.join(skillPath, "references");
	if (fs.existsSync(refsDir)) {
		try {
			for (const file of fs.readdirSync(refsDir)) {
				const filePath = path.join(refsDir, file);
				if (fs.statSync(filePath).isFile()) {
					totalChars += fs.readFileSync(filePath, "utf-8").length;
				}
			}
		} catch {
			// skip unreadable
		}
	}

	return {
		name,
		filePath: skillPath,
		charCount: totalChars,
		tokenEstimate: estimateTokens(" ".repeat(totalChars)),
		percentage: 0, // filled in later
	};
}

export function analyzeSkillsDirectory(skillsDir: string): ContextBreakdown {
	const skills: SkillTokenReport[] = [];

	if (!fs.existsSync(skillsDir)) {
		return {
			totalTokens: 0,
			totalSkills: 0,
			skills: [],
			heaviest: null,
			topConsumers: [],
		};
	}

	const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
	for (const entry of entries) {
		if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
		const report = analyzeSkillDir(path.join(skillsDir, entry.name));
		if (report) skills.push(report);
	}

	const totalTokens = skills.reduce((sum, s) => sum + s.tokenEstimate, 0);

	// Calculate percentages
	for (const skill of skills) {
		skill.percentage =
			totalTokens > 0
				? Math.round((skill.tokenEstimate / totalTokens) * 10000) / 100
				: 0;
	}

	// Sort by tokens descending
	skills.sort((a, b) => b.tokenEstimate - a.tokenEstimate);

	return {
		totalTokens,
		totalSkills: skills.length,
		skills,
		heaviest: skills[0]?.name ?? null,
		topConsumers: skills.slice(0, 5),
	};
}

// ── Formatting ──

export function formatBreakdown(breakdown: ContextBreakdown): string {
	if (breakdown.totalSkills === 0) return "No skills found.\n";

	const lines: string[] = [];
	lines.push(
		`Context Breakdown: ${breakdown.totalSkills} skills, ~${formatTokens(breakdown.totalTokens)} tokens total\n`,
	);

	lines.push("  Skill                          Tokens     %");
	lines.push("  " + "─".repeat(48));

	for (const s of breakdown.skills) {
		const name = s.name.padEnd(30);
		const tokens = formatTokens(s.tokenEstimate).padStart(8);
		const pct = `${s.percentage.toFixed(1)}%`.padStart(6);
		lines.push(`  ${name}${tokens}${pct}`);
	}

	return lines.join("\n") + "\n";
}

function formatTokens(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return String(n);
}
