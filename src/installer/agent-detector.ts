import { execSync } from "node:child_process";
import fs from "fs-extra";
import { CLI_OPTIONS } from "../constants.js";
import type { CLI, CLIOption } from "../types/index.js";

/** Binary names to look for in PATH per CLI */
const CLI_BINARIES: Record<CLI, string[]> = {
	claude: ["claude"],
	opencode: ["opencode"],
	gemini: ["gemini"],
	qwen: ["qwen"],
	codex: ["codex"],
	copilot: ["github-copilot-cli", "copilot"],
};

export interface DetectionResult {
	id: CLI;
	label: string;
	detected: boolean;
	reason: "binary" | "config-dir" | "not-found";
	binaryPath?: string;
	configPath?: string;
}

/**
 * Check if a binary exists in PATH.
 */
function findBinary(names: string[]): string | undefined {
	for (const name of names) {
		try {
			const result = execSync(`which ${name} 2>/dev/null`, {
				encoding: "utf-8",
				timeout: 3000,
			}).trim();
			if (result) return result;
		} catch {
			// not found
		}
	}
	return undefined;
}

/**
 * Detect a single CLI agent: check binary in PATH, then config directory.
 */
function detectSingleAgent(option: CLIOption): DetectionResult {
	const binaryNames = CLI_BINARIES[option.id] ?? [option.id];
	const binaryPath = findBinary(binaryNames);

	if (binaryPath) {
		return {
			id: option.id,
			label: option.label,
			detected: true,
			reason: "binary",
			binaryPath,
			configPath: option.configPath,
		};
	}

	if (fs.pathExistsSync(option.configPath)) {
		return {
			id: option.id,
			label: option.label,
			detected: true,
			reason: "config-dir",
			configPath: option.configPath,
		};
	}

	return {
		id: option.id,
		label: option.label,
		detected: false,
		reason: "not-found",
	};
}

/**
 * Detect all installed AI agents on the system.
 * Returns detection results for every known CLI.
 */
export function detectAgents(
	options: CLIOption[] = CLI_OPTIONS,
): DetectionResult[] {
	return options.map(detectSingleAgent);
}

/**
 * Get only the detected (installed) CLI IDs.
 */
export function getDetectedCLIs(options: CLIOption[] = CLI_OPTIONS): CLI[] {
	return detectAgents(options)
		.filter((r) => r.detected)
		.map((r) => r.id);
}
