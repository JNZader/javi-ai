/**
 * Hook-driven skill auto-activation — detects project context
 * and determines which skills should be loaded automatically.
 *
 * Used by UserPromptSubmit hooks to inject skill context when
 * the user's request matches a skill's trigger patterns.
 */

import fs from "fs-extra";
import path from "path";
import { parseFrontmatter } from "../lib/frontmatter.js";

// ── Types ──

export interface SkillTrigger {
	skillName: string;
	skillPath: string;
	patterns: string[];
	filePatterns: string[];
	description: string;
}

export interface ActivationMatch {
	skillName: string;
	skillPath: string;
	matchedPattern: string;
	matchType: "keyword" | "file" | "content";
	confidence: number;
}

// ── Default trigger patterns ──

const DEFAULT_TRIGGERS: Record<
	string,
	{ keywords: string[]; files: string[] }
> = {
	"react-19": {
		keywords: ["react", "jsx", "component", "hook", "usestate", "useeffect"],
		files: ["*.tsx", "*.jsx"],
	},
	"nextjs-15": {
		keywords: [
			"next",
			"nextjs",
			"app router",
			"server component",
			"server action",
		],
		files: ["next.config.*", "app/**/page.tsx"],
	},
	typescript: {
		keywords: ["typescript", "interface", "generic", "type annotation"],
		files: ["*.ts", "tsconfig.json"],
	},
	"tailwind-4": {
		keywords: ["tailwind", "className", "cn(", "styling", "css utility"],
		files: ["tailwind.config.*"],
	},
	"zod-4": {
		keywords: ["zod", "schema", "validation", "z.object", "z.string"],
		files: [],
	},
	"zustand-5": {
		keywords: ["zustand", "store", "state management", "create("],
		files: ["*store*"],
	},
	"ai-sdk-5": {
		keywords: ["ai sdk", "vercel ai", "streaming", "useChat", "generateText"],
		files: [],
	},
	"django-drf": {
		keywords: ["django", "drf", "viewset", "serializer", "rest framework"],
		files: ["manage.py", "settings.py"],
	},
	playwright: {
		keywords: ["playwright", "e2e", "page object", "browser test"],
		files: ["playwright.config.*", "*.spec.ts"],
	},
	pytest: {
		keywords: ["pytest", "fixture", "conftest", "parametrize"],
		files: ["conftest.py", "test_*.py", "*_test.py"],
	},
};

// ── Scanning ──

/**
 * Scan a skills directory and build trigger index from frontmatter.
 */
export async function buildTriggerIndex(
	skillsDir: string,
): Promise<SkillTrigger[]> {
	const triggers: SkillTrigger[] = [];

	if (!(await fs.pathExists(skillsDir))) return triggers;

	const entries = await fs.readdir(skillsDir);
	for (const entry of entries) {
		if (entry.startsWith(".") || entry === "_shared") continue;
		const skillDir = path.join(skillsDir, entry);
		const stat = await fs.stat(skillDir).catch(() => null);
		if (!stat?.isDirectory()) continue;

		const skillMd = path.join(skillDir, "SKILL.md");
		if (!(await fs.pathExists(skillMd))) continue;

		const raw = await fs.readFile(skillMd, "utf-8");
		const fm = parseFrontmatter(raw);

		// Get triggers from frontmatter or defaults
		const fmTriggers = fm?.data.triggers;
		const defaults = DEFAULT_TRIGGERS[entry];

		const patterns: string[] = [];
		const filePatterns: string[] = [];

		if (Array.isArray(fmTriggers)) {
			patterns.push(...fmTriggers);
		} else if (defaults) {
			patterns.push(...defaults.keywords);
			filePatterns.push(...defaults.files);
		}

		if (patterns.length > 0 || filePatterns.length > 0) {
			triggers.push({
				skillName: entry,
				skillPath: skillDir,
				patterns,
				filePatterns,
				description: fm?.data.description ? String(fm.data.description) : "",
			});
		}
	}

	return triggers;
}

// ── Matching ──

/**
 * Match user input against skill triggers.
 * Returns skills sorted by confidence (highest first).
 */
export function matchSkills(
	input: string,
	triggers: SkillTrigger[],
): ActivationMatch[] {
	const matches: ActivationMatch[] = [];
	const lowerInput = input.toLowerCase();

	for (const trigger of triggers) {
		for (const pattern of trigger.patterns) {
			const lowerPattern = pattern.toLowerCase();
			if (lowerInput.includes(lowerPattern)) {
				// Longer pattern matches are more confident
				const confidence = Math.min(1, lowerPattern.length / 10);
				matches.push({
					skillName: trigger.skillName,
					skillPath: trigger.skillPath,
					matchedPattern: pattern,
					matchType: "keyword",
					confidence,
				});
				break; // one match per skill is enough
			}
		}
	}

	// Dedupe by skill name, keep highest confidence
	const bySkill = new Map<string, ActivationMatch>();
	for (const match of matches) {
		const existing = bySkill.get(match.skillName);
		if (!existing || match.confidence > existing.confidence) {
			bySkill.set(match.skillName, match);
		}
	}

	return [...bySkill.values()].sort((a, b) => b.confidence - a.confidence);
}

/**
 * Match files being edited against skill file patterns.
 */
export function matchFiles(
	filePaths: string[],
	triggers: SkillTrigger[],
): ActivationMatch[] {
	const matches: ActivationMatch[] = [];

	for (const trigger of triggers) {
		for (const filePattern of trigger.filePatterns) {
			const regex = globToRegex(filePattern);
			for (const filePath of filePaths) {
				const fileName = path.basename(filePath);
				if (regex.test(fileName) || regex.test(filePath)) {
					matches.push({
						skillName: trigger.skillName,
						skillPath: trigger.skillPath,
						matchedPattern: filePattern,
						matchType: "file",
						confidence: 0.8,
					});
					break;
				}
			}
		}
	}

	// Dedupe
	const bySkill = new Map<string, ActivationMatch>();
	for (const match of matches) {
		if (!bySkill.has(match.skillName)) {
			bySkill.set(match.skillName, match);
		}
	}

	return [...bySkill.values()];
}

/**
 * Simple glob-to-regex converter for file matching.
 */
export function globToRegex(glob: string): RegExp {
	let result = "";
	let i = 0;
	while (i < glob.length) {
		const ch = glob[i];
		if (ch === "*" && glob[i + 1] === "*") {
			if (glob[i + 2] === "/") {
				result += "(?:.*/)?";
				i += 3;
			} else {
				result += ".*";
				i += 2;
			}
		} else if (ch === "*") {
			result += "[^/]*";
			i++;
		} else if (ch === "?") {
			result += ".";
			i++;
		} else if (".+^${}()|[]\\".includes(ch)) {
			result += `\\${ch}`;
			i++;
		} else {
			result += ch;
			i++;
		}
	}
	return new RegExp(`^${result}$`, "i");
}
