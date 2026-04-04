import os from "node:os";
import path from "node:path";
import type { AutonomyLevel, CLIOption, Feature } from "./types/index.js";

export const HOME = os.homedir();

export const CLI_OPTIONS: CLIOption[] = [
	{
		id: "claude",
		label: "Claude Code",
		configPath: path.join(HOME, ".claude"),
		skillsPath: path.join(HOME, ".claude", "skills"),
		pluginsPath: path.join(HOME, ".claude", "plugins"),
		available: true,
	},
	{
		id: "opencode",
		label: "OpenCode",
		configPath: path.join(HOME, ".config", "opencode"),
		skillsPath: path.join(HOME, ".config", "opencode", "skill"),
		pluginsPath: path.join(HOME, ".config", "opencode", "plugins"),
		available: true,
	},
	{
		id: "gemini",
		label: "Gemini CLI",
		configPath: path.join(HOME, ".gemini"),
		skillsPath: path.join(HOME, ".gemini", "skills"),
		pluginsPath: path.join(HOME, ".gemini", "plugins"),
		available: true,
	},
	{
		id: "qwen",
		label: "Qwen",
		configPath: path.join(HOME, ".qwen"),
		skillsPath: path.join(HOME, ".qwen", "skills"),
		pluginsPath: path.join(HOME, ".qwen", "plugins"),
		available: true,
	},
	{
		id: "codex",
		label: "Codex CLI",
		configPath: path.join(HOME, ".codex"),
		skillsPath: path.join(HOME, ".codex", "skills"),
		pluginsPath: path.join(HOME, ".codex", "plugins"),
		available: true,
	},
	{
		id: "copilot",
		label: "GitHub Copilot",
		configPath: path.join(HOME, ".copilot"),
		skillsPath: path.join(HOME, ".copilot", "skills"),
		pluginsPath: path.join(HOME, ".copilot", "plugins"),
		available: true,
	},
];

export const MANIFEST_PATH = path.join(HOME, ".javi-ai", "manifest.json");
export const BACKUP_DIR = path.join(HOME, ".javi-ai", "backups");
export const PROPOSED_DIR = path.join(HOME, ".javi-ai", "proposed");
export const CLAUDE_SKILLS_DIR = path.join(HOME, ".claude", "skills");

export const MARKER_START = "<!-- BEGIN JAVI-AI -->";
export const MARKER_END = "<!-- END JAVI-AI -->";

// --- Sync constants ---

export const AI_CONFIG_DIR_NAME = ".ai-config";

export const AI_CLI_CONFIG_FILES: Record<string, string> = {
	claude: "CLAUDE.md",
	opencode: "AGENTS.md",
	gemini: "GEMINI.md",
	codex: "CODEX.md",
	copilot: ".github/copilot-instructions.md",
};

export const SYNC_TARGETS = [
	"claude",
	"opencode",
	"gemini",
	"codex",
	"copilot",
] as const;

// --- Autonomy level definitions ---

export interface AutonomyLevelDefinition {
	id: AutonomyLevel;
	label: string;
	description: string;
	features: Feature[];
}

export const AUTONOMY_LEVELS: AutonomyLevelDefinition[] = [
	{
		id: "observer",
		label: "Observer",
		description:
			"Read-only: analysis skills only, no hooks, no orchestrators that execute actions",
		features: ["skills", "configs"],
	},
	{
		id: "advisor",
		label: "Advisor",
		description:
			"Suggests actions, waits for confirmation: skills + orchestrators, no auto-execute hooks",
		features: ["skills", "orchestrators", "configs"],
	},
	{
		id: "assistant",
		label: "Assistant",
		description:
			"Handles routine tasks autonomously, escalates complex ones: full setup minus aggressive hooks",
		features: ["skills", "orchestrators", "configs", "hooks", "plugins"],
	},
	{
		id: "partner",
		label: "Partner",
		description:
			"Full autonomy: everything including aggressive hooks and auto-apply orchestrators",
		features: [
			"skills",
			"orchestrators",
			"configs",
			"hooks",
			"plugins",
			"agents",
		],
	},
];

export const DEFAULT_AUTONOMY_LEVEL: AutonomyLevel = "assistant";
