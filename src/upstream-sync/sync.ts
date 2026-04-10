/**
 * Upstream auto-sync — pull community skill repos defined in sources.yaml
 * and update the upstream/ directory automatically.
 *
 * sources.yaml format:
 *   sources:
 *     agent-teams-lite:
 *       url: https://github.com/JNZader/agent-teams-lite.git
 *       path: skills
 *       branch: main
 *     gentleman-skills:
 *       url: https://github.com/gentleman-programming/gentleman-skills.git
 *       path: curated
 *       branch: main
 */

import { execSync } from "node:child_process";
import fs from "fs-extra";
import path from "path";

// ── Types ──

export interface UpstreamSource {
	name: string;
	url: string;
	path: string;
	branch: string;
}

export interface SyncState {
	name: string;
	lastCommit: string;
	lastSyncAt: string;
	skillCount: number;
}

export interface SyncResult {
	source: string;
	status: "updated" | "up-to-date" | "new" | "error";
	skillCount: number;
	commit?: string;
	error?: string;
}

// ── Parsing ──

export function parseSourcesYaml(content: string): UpstreamSource[] {
	const sources: UpstreamSource[] = [];
	const lines = content.split("\n");

	let currentSource: string | null = null;
	const partials: Record<string, Partial<UpstreamSource>> = {};

	for (const line of lines) {
		const trimmed = line.trimEnd();

		// Skip top-level "sources:" header
		if (trimmed === "sources:") continue;

		// Source name (2-space indent, ends with colon)
		const nameMatch = trimmed.match(/^ {2}([\w-]+):\s*$/);
		if (nameMatch) {
			currentSource = nameMatch[1];
			partials[currentSource] = { name: currentSource };
			continue;
		}

		if (!currentSource) continue;

		// Fields (4-space indent)
		const fieldMatch = trimmed.match(/^ {4}(\w+):\s*(.+)$/);
		if (fieldMatch) {
			const [, key, value] = fieldMatch;
			const cleaned = value.replace(/['"]/g, "").trim();
			const partial = partials[currentSource]!;
			if (key === "url") partial.url = cleaned;
			if (key === "path") partial.path = cleaned;
			if (key === "branch") partial.branch = cleaned;
		}
	}

	for (const [name, partial] of Object.entries(partials)) {
		if (partial.url && partial.path) {
			sources.push({
				name,
				url: partial.url,
				path: partial.path,
				branch: partial.branch ?? "main",
			});
		}
	}

	return sources;
}

export function serializeSourcesYaml(sources: UpstreamSource[]): string {
	const lines = ["sources:"];
	for (const src of sources) {
		lines.push(`  ${src.name}:`);
		lines.push(`    url: ${src.url}`);
		lines.push(`    path: ${src.path}`);
		lines.push(`    branch: ${src.branch}`);
	}
	return `${lines.join("\n")}\n`;
}

// ── Git operations ──

function gitCloneOrPull(url: string, branch: string, cloneDir: string): string {
	if (fs.pathExistsSync(path.join(cloneDir, ".git"))) {
		execSync(`git -C "${cloneDir}" fetch origin ${branch} --depth=1`, {
			timeout: 30_000,
			stdio: "pipe",
		});
		execSync(`git -C "${cloneDir}" checkout FETCH_HEAD`, {
			timeout: 10_000,
			stdio: "pipe",
		});
	} else {
		fs.ensureDirSync(path.dirname(cloneDir));
		execSync(
			`git clone --depth=1 --branch "${branch}" "${url}" "${cloneDir}"`,
			{ timeout: 60_000, stdio: "pipe" },
		);
	}

	return execSync(`git -C "${cloneDir}" rev-parse HEAD`, {
		encoding: "utf-8",
		timeout: 5_000,
	}).trim();
}

// ── Sync ──

export async function syncSource(
	source: UpstreamSource,
	upstreamDir: string,
	cacheDir: string,
): Promise<SyncResult> {
	const cloneDir = path.join(cacheDir, source.name);
	const destDir = path.join(upstreamDir, source.name);

	try {
		const commit = gitCloneOrPull(source.url, source.branch, cloneDir);
		const srcPath = path.join(cloneDir, source.path);

		if (!(await fs.pathExists(srcPath))) {
			return {
				source: source.name,
				status: "error",
				skillCount: 0,
				error: `Path "${source.path}" not found in repo`,
			};
		}

		const isNew = !(await fs.pathExists(destDir));
		await fs.ensureDir(destDir);
		await fs.copy(srcPath, destDir, { overwrite: true });

		// Count skill directories
		const entries = await fs.readdir(destDir);
		let skillCount = 0;
		for (const entry of entries) {
			if (entry.startsWith(".") || entry === "_shared") continue;
			const stat = await fs.stat(path.join(destDir, entry));
			if (stat.isDirectory()) skillCount++;
		}

		return {
			source: source.name,
			status: isNew ? "new" : "updated",
			skillCount,
			commit,
		};
	} catch (err) {
		return {
			source: source.name,
			status: "error",
			skillCount: 0,
			error: err instanceof Error ? err.message : String(err),
		};
	}
}

export async function syncAll(
	sourcesPath: string,
	upstreamDir: string,
	cacheDir: string,
): Promise<SyncResult[]> {
	const content = await fs.readFile(sourcesPath, "utf-8");
	const sources = parseSourcesYaml(content);
	const results: SyncResult[] = [];

	for (const source of sources) {
		const result = await syncSource(source, upstreamDir, cacheDir);
		results.push(result);
	}

	return results;
}

// ── State tracking ──

export async function readSyncState(statePath: string): Promise<SyncState[]> {
	if (!(await fs.pathExists(statePath))) return [];
	try {
		return await fs.readJson(statePath);
	} catch {
		return [];
	}
}

export async function writeSyncState(
	statePath: string,
	results: SyncResult[],
): Promise<void> {
	const states: SyncState[] = results
		.filter((r) => r.status !== "error")
		.map((r) => ({
			name: r.source,
			lastCommit: r.commit ?? "",
			lastSyncAt: new Date().toISOString(),
			skillCount: r.skillCount,
		}));
	await fs.writeJson(statePath, states, { spaces: 2 });
}

// ── GitHub Action template ──

export function generateGitHubAction(): string {
	return `name: Upstream Sync
on:
  schedule:
    - cron: '0 6 * * 1' # Weekly Monday 6am UTC
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec javi-ai upstream-sync
      - name: Create PR if changes
        uses: peter-evans/create-pull-request@v6
        with:
          title: 'chore: sync upstream skill repos'
          branch: chore/upstream-sync
          commit-message: 'chore: sync upstream skill repos'
`;
}
