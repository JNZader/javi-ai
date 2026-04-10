/**
 * Multi-platform publisher — publish skills to Claude Code, Cursor,
 * Codex, Copilot, Windsurf from a single source of truth.
 *
 * Two strategies:
 * - Directory: copies SKILL.md into per-skill directories (Claude, Cursor, Codex)
 * - Concatenated: merges into a single instruction file with markers (Copilot, Windsurf)
 */

import fs from "fs";
import path from "path";

// ── Types ──

export interface PublishTarget {
	platform: string;
	strategy: "directory" | "concatenated";
	skillsPath: string;
}

export interface PublishResult {
	platform: string;
	success: boolean;
	path: string;
	error?: string;
}

// ── Markers for concatenated format ──

const MARKER_START = (name: string) => `<!-- BEGIN JAVI-AI:${name} -->`;
const MARKER_END = (name: string) => `<!-- END JAVI-AI:${name} -->`;

// ── Directory strategy ──

export function directoryPublish(
	skillName: string,
	content: string,
	target: PublishTarget,
): PublishResult {
	try {
		const skillDir = path.join(target.skillsPath, skillName);
		fs.mkdirSync(skillDir, { recursive: true });
		const filePath = path.join(skillDir, "SKILL.md");
		fs.writeFileSync(filePath, content);
		return { platform: target.platform, success: true, path: filePath };
	} catch (err) {
		return {
			platform: target.platform,
			success: false,
			path: target.skillsPath,
			error: String(err),
		};
	}
}

// ── Concatenated strategy ──

export function concatPublish(
	skillName: string,
	content: string,
	target: PublishTarget,
): PublishResult {
	try {
		const startMarker = MARKER_START(skillName);
		const endMarker = MARKER_END(skillName);
		const markedContent = `${startMarker}\n${content}\n${endMarker}`;

		let existing = "";
		if (fs.existsSync(target.skillsPath)) {
			existing = fs.readFileSync(target.skillsPath, "utf-8");
		}

		let newContent: string;
		if (existing.includes(startMarker) && existing.includes(endMarker)) {
			// Replace existing block
			const startIdx = existing.indexOf(startMarker);
			const endIdx = existing.indexOf(endMarker) + endMarker.length;
			newContent =
				existing.slice(0, startIdx) + markedContent + existing.slice(endIdx);
		} else {
			// Append
			newContent = existing
				? `${existing.trimEnd()}\n\n${markedContent}\n`
				: `${markedContent}\n`;
		}

		const dir = path.dirname(target.skillsPath);
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(target.skillsPath, newContent);
		return {
			platform: target.platform,
			success: true,
			path: target.skillsPath,
		};
	} catch (err) {
		return {
			platform: target.platform,
			success: false,
			path: target.skillsPath,
			error: String(err),
		};
	}
}

// ── Unified publish ──

export function publishSkill(
	skillName: string,
	content: string,
	target: PublishTarget,
): PublishResult {
	if (target.strategy === "directory") {
		return directoryPublish(skillName, content, target);
	}
	return concatPublish(skillName, content, target);
}

// ── Compatibility filter ──

function extractCompatiblePlatforms(content: string): string[] | null {
	const match = content.match(/compatible_platforms:\s*\[([^\]]+)\]/);
	if (!match) return null;
	return match[1]!
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}

// ── Publish to all ──

export function publishToAll(
	skillName: string,
	content: string,
	targets: PublishTarget[],
): PublishResult[] {
	const compatible = extractCompatiblePlatforms(content);

	return targets.map((target) => {
		// Check compatibility
		if (compatible && !compatible.includes(target.platform)) {
			return {
				platform: target.platform,
				success: false,
				path: target.skillsPath,
				error: `Skill '${skillName}' is incompatible with platform '${target.platform}'`,
			};
		}
		return publishSkill(skillName, content, target);
	});
}

// ── Platform detection ──

const PLATFORM_SIGNATURES: Array<{
	platform: string;
	marker: string;
	strategy: "directory" | "concatenated";
	skillsSubpath: string;
}> = [
	{
		platform: "claude",
		marker: ".claude/skills",
		strategy: "directory",
		skillsSubpath: ".claude/skills",
	},
	{
		platform: "cursor",
		marker: ".cursor",
		strategy: "directory",
		skillsSubpath: ".cursor/skills",
	},
	{
		platform: "codex",
		marker: ".codex",
		strategy: "directory",
		skillsSubpath: ".codex/skills",
	},
	{
		platform: "copilot",
		marker: ".github",
		strategy: "concatenated",
		skillsSubpath: ".github/copilot-instructions.md",
	},
	{
		platform: "windsurf",
		marker: ".windsurfrules",
		strategy: "concatenated",
		skillsSubpath: ".windsurfrules",
	},
];

export function detectTargets(baseDir: string): PublishTarget[] {
	const targets: PublishTarget[] = [];

	for (const sig of PLATFORM_SIGNATURES) {
		const markerPath = path.join(baseDir, sig.marker);
		if (fs.existsSync(markerPath)) {
			targets.push({
				platform: sig.platform,
				strategy: sig.strategy,
				skillsPath: path.join(baseDir, sig.skillsSubpath),
			});
		}
	}

	return targets;
}
