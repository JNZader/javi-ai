import type { DashboardResult, SddChange, SddPhase } from "../types/index.js";

export const PHASE_ORDER: SddPhase[] = [
	"explore",
	"proposal",
	"spec",
	"design",
	"tasks",
	"apply",
	"verify",
	"archive",
];

// Phases that typically require explicit user approval to continue
export const APPROVAL_PHASES: SddPhase[] = [
	"proposal",
	"spec",
	"design",
	"tasks",
];

/**
 * Returns the highest SddPhase reached given a list of artifact type strings
 * found in engram (e.g. ['explore', 'proposal', 'apply-progress']).
 */
export function detectPhase(artifactTypes: string[]): SddPhase {
	let highest: SddPhase = "explore";
	for (const phase of PHASE_ORDER) {
		const key = phase === "apply" ? "apply-progress" : phase;
		if (artifactTypes.includes(phase) || artifactTypes.includes(key)) {
			highest = phase;
		}
	}
	return highest;
}

/**
 * Builds an ASCII progress bar.
 * @param completed  Number of completed units
 * @param total      Total units
 * @param width      Bar width in characters (default 8)
 * @returns          e.g. "█████░░░"
 */
export function buildProgressBar(
	completed: number,
	total: number,
	width = 8,
): string {
	if (total === 0) return "░".repeat(width);
	const filled = Math.min(width, Math.round((completed / total) * width));
	return "█".repeat(filled) + "░".repeat(width - filled);
}

/**
 * Derives a display label for the phase progress when task counts are known.
 * Uses phase index as completed/total when task counts are absent.
 */
export function phaseProgress(change: SddChange): {
	completed: number;
	total: number;
} {
	if (change.taskTotal !== undefined && change.taskDone !== undefined) {
		return { completed: change.taskDone, total: change.taskTotal };
	}
	const idx = PHASE_ORDER.indexOf(change.currentPhase);
	return { completed: idx + 1, total: PHASE_ORDER.length };
}

/**
 * Entry point called from the CLI. Returns an empty DashboardResult shell —
 * the actual engram data fetch happens inside the Dashboard Ink component
 * (which runs in Claude's MCP context where engram tools are available).
 *
 * TODO: wire engram data fetch in CLI entry point when a local-cache bridge
 * is available (e.g. ~/.engram/cache.json written by the engram MCP server).
 */
export async function runDashboard(project?: string): Promise<DashboardResult> {
	// Attempt to read a local SDD state cache if it exists.
	// When engram is not reachable from Node.js directly, the caller can
	// pre-populate this file before invoking the dashboard command.
	const cacheFile = process.env.SDD_CACHE_FILE;
	if (cacheFile) {
		try {
			const { default: fs } = await import("fs-extra");
			const raw = (await fs.readJson(cacheFile)) as DashboardResult;
			return raw;
		} catch {
			// Cache miss or malformed — fall through to empty result
		}
	}

	return {
		changes: [],
		recentActivity: [],
		project: project ?? process.env.SDD_PROJECT ?? "unknown",
	};
}
