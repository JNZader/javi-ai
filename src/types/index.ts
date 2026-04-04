export type CLI =
	| "claude"
	| "opencode"
	| "gemini"
	| "qwen"
	| "codex"
	| "copilot";

export type Feature =
	| "skills"
	| "orchestrators"
	| "configs"
	| "hooks"
	| "plugins"
	| "agents";

export type AutonomyLevel = "observer" | "advisor" | "assistant" | "partner";

export interface CLIOption {
	id: CLI;
	label: string;
	configPath: string;
	skillsPath: string;
	pluginsPath: string;
	available: boolean;
}

export interface InstallOptions {
	clis: CLI[];
	features: Feature[];
	dryRun: boolean;
	backup: boolean;
	autonomyLevel?: AutonomyLevel;
}

export interface SkillManifest {
	name: string;
	version: string;
	source: "upstream" | "delta" | "own";
	installedAt: string;
	checksum?: string;
	dependencies?: string[];
}

// --- Plugin types ---

export interface PluginManifest {
	name: string;
	version: string;
	description: string;
	dependencies?: string[];
	compatible_tools?: CLI[];
	triggers?: string[];
}

export type PluginFormat = "plugin" | "legacy-skill";

export interface InstalledPlugin {
	name: string;
	version: string;
	format: PluginFormat;
	source: "upstream" | "delta" | "own";
	installedAt: string;
	checksum?: string;
}

export interface Manifest {
	version: string;
	installedAt: string;
	updatedAt: string;
	clis: CLI[];
	skills: Record<string, SkillManifest>;
	plugins?: Record<string, InstalledPlugin>;
	autonomyLevel?: AutonomyLevel;
}

export type InstallStatus =
	| "pending"
	| "running"
	| "done"
	| "error"
	| "skipped";

export interface InstallStep {
	id: string;
	label: string;
	status: InstallStatus;
	detail?: string;
}

// --- Sync types ---

export type SyncTarget =
	| "claude"
	| "opencode"
	| "gemini"
	| "codex"
	| "copilot"
	| "all";
export type SyncMode = "overwrite" | "merge";

export interface SyncOptions {
	target: SyncTarget;
	mode: SyncMode;
	projectDir: string;
	dryRun: boolean;
}

export interface SyncStep {
	id: string;
	label: string;
	status: InstallStatus;
	detail?: string;
}

export interface MarkdownEntry {
	relativePath: string;
	name: string;
	content: string;
}

export interface FrontmatterResult {
	data: Record<string, string | string[]>;
	content: string;
}

// --- SDD Dashboard types ---

export type SddPhase =
	| "explore"
	| "proposal"
	| "spec"
	| "design"
	| "tasks"
	| "apply"
	| "verify"
	| "archive";

export interface SddChange {
	name: string;
	currentPhase: SddPhase;
	completedPhases: SddPhase[];
	taskTotal?: number;
	taskDone?: number;
	awaitingApproval: boolean;
	lastActivity: string; // ISO date string
}

export interface DashboardResult {
	changes: SddChange[];
	recentActivity: Array<{ change: string; phase: SddPhase; timestamp: string }>;
	project: string;
}
