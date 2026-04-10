/**
 * Semantic revert for SDD changes — undo entire changes by logical unit
 * rather than individual git commits.
 *
 * Groups commits belonging to the same SDD change (by commit message
 * convention or branch pattern) and reverts them as a single unit.
 */

import { execSync } from "node:child_process";

// ── Types ──

export interface CommitInfo {
	hash: string;
	message: string;
	author: string;
	date: string;
}

export interface SemanticGroup {
	name: string;
	commits: CommitInfo[];
	pattern: string;
}

export interface RevertPlan {
	group: SemanticGroup;
	revertCommits: string[];
	dryRun: boolean;
}

export interface RevertResult {
	success: boolean;
	reverted: string[];
	errors: string[];
}

// ── Commit parsing ──

export function parseGitLog(logOutput: string): CommitInfo[] {
	const commits: CommitInfo[] = [];
	const entries = logOutput.trim().split("\n");

	for (const entry of entries) {
		if (!entry.trim()) continue;
		// Format: hash|message|author|date
		const parts = entry.split("|");
		if (parts.length >= 4) {
			commits.push({
				hash: parts[0].trim(),
				message: parts[1].trim(),
				author: parts[2].trim(),
				date: parts[3].trim(),
			});
		}
	}

	return commits;
}

// ── Grouping ──

/**
 * Group commits by SDD change name.
 * Matches commit messages containing sdd change references:
 * - "feat: add X for change-name"
 * - "sdd/change-name"
 * - Commits between sdd-propose and sdd-archive markers
 */
export function groupBySddChange(
	commits: CommitInfo[],
	changeName: string,
): SemanticGroup {
	const pattern = changeName.toLowerCase();
	const matching = commits.filter((c) => {
		const msg = c.message.toLowerCase();
		return (
			msg.includes(pattern) ||
			msg.includes(`sdd/${pattern}`) ||
			msg.includes(pattern.replace(/-/g, " "))
		);
	});

	return {
		name: changeName,
		commits: matching,
		pattern,
	};
}

/**
 * Group commits by conventional commit scope.
 * e.g., "feat(auth):" groups all auth-scoped commits.
 */
export function groupByScope(
	commits: CommitInfo[],
	scope: string,
): SemanticGroup {
	const pattern = `(${scope})`;
	const matching = commits.filter((c) =>
		c.message.toLowerCase().includes(pattern.toLowerCase()),
	);

	return {
		name: scope,
		commits: matching,
		pattern,
	};
}

/**
 * Auto-detect semantic groups from commit history.
 */
export function detectGroups(commits: CommitInfo[]): SemanticGroup[] {
	const groups = new Map<string, CommitInfo[]>();

	for (const commit of commits) {
		// Extract scope from conventional commit
		const scopeMatch = commit.message.match(/^\w+\(([^)]+)\)/);
		if (scopeMatch) {
			const scope = scopeMatch[1];
			const list = groups.get(scope) ?? [];
			list.push(commit);
			groups.set(scope, list);
		}

		// Extract SDD change name
		const sddMatch = commit.message.match(/sdd\/([a-z0-9-]+)/i);
		if (sddMatch) {
			const name = `sdd/${sddMatch[1]}`;
			const list = groups.get(name) ?? [];
			list.push(commit);
			groups.set(name, list);
		}
	}

	return [...groups.entries()]
		.filter(([, commits]) => commits.length >= 2)
		.map(([name, commits]) => ({
			name,
			commits,
			pattern: name,
		}));
}

// ── Revert planning ──

export function createRevertPlan(
	group: SemanticGroup,
	dryRun: boolean = true,
): RevertPlan {
	// Revert in reverse chronological order (newest first)
	const sorted = [...group.commits].sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
	);

	return {
		group,
		revertCommits: sorted.map((c) => c.hash),
		dryRun,
	};
}

// ── Execution ──

export function executeRevert(plan: RevertPlan, cwd: string): RevertResult {
	const reverted: string[] = [];
	const errors: string[] = [];

	if (plan.dryRun) {
		return {
			success: true,
			reverted: plan.revertCommits,
			errors: [],
		};
	}

	for (const hash of plan.revertCommits) {
		try {
			execSync(`git revert --no-commit ${hash}`, {
				cwd,
				timeout: 10_000,
				stdio: "pipe",
			});
			reverted.push(hash);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			errors.push(`Failed to revert ${hash}: ${msg}`);
			// Abort on first failure
			try {
				execSync("git revert --abort", { cwd, stdio: "pipe" });
			} catch {
				// ignore abort failure
			}
			break;
		}
	}

	return {
		success: errors.length === 0,
		reverted,
		errors,
	};
}

// ── Formatting ──

export function formatRevertPlan(plan: RevertPlan): string {
	const lines: string[] = [];
	const mode = plan.dryRun ? "DRY RUN" : "EXECUTE";

	lines.push(`## Semantic Revert: ${plan.group.name} (${mode})`);
	lines.push("");
	lines.push(`Commits to revert (${plan.revertCommits.length}):`);

	for (const hash of plan.revertCommits) {
		const commit = plan.group.commits.find((c) => c.hash === hash);
		const msg = commit?.message ?? "unknown";
		lines.push(`  ${hash.slice(0, 7)} ${msg}`);
	}

	return lines.join("\n");
}
