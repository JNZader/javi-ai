import fs from "fs-extra";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SyncResult, UpstreamSource } from "../sync.js";
import {
	generateGitHubAction,
	parseSourcesYaml,
	readSyncState,
	serializeSourcesYaml,
	writeSyncState,
} from "../sync.js";

let tmpDir: string;

beforeEach(async () => {
	tmpDir = path.join(os.tmpdir(), `upstream-sync-test-${Date.now()}`);
	await fs.ensureDir(tmpDir);
});

afterEach(async () => {
	await fs.remove(tmpDir);
});

const SAMPLE_YAML = `sources:
  agent-teams-lite:
    url: https://github.com/JNZader/agent-teams-lite.git
    path: skills
    branch: main
  gentleman-skills:
    url: https://github.com/gentleman-programming/gentleman-skills.git
    path: curated
    branch: main
  custom-repo:
    url: https://github.com/example/custom.git
    path: src/skills
    branch: develop
`;

describe("parseSourcesYaml", () => {
	it("parses all sources from yaml", () => {
		const sources = parseSourcesYaml(SAMPLE_YAML);
		expect(sources).toHaveLength(3);
	});

	it("parses source names correctly", () => {
		const sources = parseSourcesYaml(SAMPLE_YAML);
		expect(sources.map((s) => s.name)).toEqual([
			"agent-teams-lite",
			"gentleman-skills",
			"custom-repo",
		]);
	});

	it("parses URLs correctly", () => {
		const sources = parseSourcesYaml(SAMPLE_YAML);
		expect(sources[0].url).toBe(
			"https://github.com/JNZader/agent-teams-lite.git",
		);
	});

	it("parses paths correctly", () => {
		const sources = parseSourcesYaml(SAMPLE_YAML);
		expect(sources[0].path).toBe("skills");
		expect(sources[2].path).toBe("src/skills");
	});

	it("parses branches correctly", () => {
		const sources = parseSourcesYaml(SAMPLE_YAML);
		expect(sources[0].branch).toBe("main");
		expect(sources[2].branch).toBe("develop");
	});

	it("defaults branch to main when not specified", () => {
		const yaml = `sources:
  test:
    url: https://example.com/repo.git
    path: skills
`;
		const sources = parseSourcesYaml(yaml);
		expect(sources[0].branch).toBe("main");
	});

	it("returns empty array for empty content", () => {
		expect(parseSourcesYaml("")).toEqual([]);
	});

	it("returns empty array for invalid yaml", () => {
		expect(parseSourcesYaml("not: valid: yaml:")).toEqual([]);
	});

	it("skips sources without url", () => {
		const yaml = `sources:
  no-url:
    path: skills
    branch: main
`;
		expect(parseSourcesYaml(yaml)).toEqual([]);
	});

	it("skips sources without path", () => {
		const yaml = `sources:
  no-path:
    url: https://example.com/repo.git
    branch: main
`;
		expect(parseSourcesYaml(yaml)).toEqual([]);
	});
});

describe("serializeSourcesYaml", () => {
	it("serializes sources to yaml format", () => {
		const sources: UpstreamSource[] = [
			{
				name: "test-repo",
				url: "https://github.com/test/repo.git",
				path: "skills",
				branch: "main",
			},
		];
		const yaml = serializeSourcesYaml(sources);
		expect(yaml).toContain("sources:");
		expect(yaml).toContain("  test-repo:");
		expect(yaml).toContain("    url: https://github.com/test/repo.git");
		expect(yaml).toContain("    path: skills");
		expect(yaml).toContain("    branch: main");
	});

	it("roundtrips correctly", () => {
		const sources = parseSourcesYaml(SAMPLE_YAML);
		const serialized = serializeSourcesYaml(sources);
		const reparsed = parseSourcesYaml(serialized);
		expect(reparsed).toEqual(sources);
	});
});

describe("readSyncState", () => {
	it("returns empty array for non-existent file", async () => {
		const state = await readSyncState(path.join(tmpDir, "nope.json"));
		expect(state).toEqual([]);
	});

	it("reads valid state file", async () => {
		const statePath = path.join(tmpDir, "state.json");
		const data = [
			{
				name: "test",
				lastCommit: "abc123",
				lastSyncAt: "2026-01-01T00:00:00Z",
				skillCount: 5,
			},
		];
		await fs.writeJson(statePath, data);
		const state = await readSyncState(statePath);
		expect(state).toHaveLength(1);
		expect(state[0].name).toBe("test");
		expect(state[0].lastCommit).toBe("abc123");
	});

	it("returns empty array for corrupt file", async () => {
		const statePath = path.join(tmpDir, "bad.json");
		await fs.writeFile(statePath, "not json");
		const state = await readSyncState(statePath);
		expect(state).toEqual([]);
	});
});

describe("writeSyncState", () => {
	it("writes sync results to state file", async () => {
		const statePath = path.join(tmpDir, "state.json");
		const results: SyncResult[] = [
			{ source: "repo-a", status: "updated", skillCount: 10, commit: "abc" },
			{ source: "repo-b", status: "new", skillCount: 5, commit: "def" },
		];
		await writeSyncState(statePath, results);

		const state = await fs.readJson(statePath);
		expect(state).toHaveLength(2);
		expect(state[0].name).toBe("repo-a");
		expect(state[0].lastCommit).toBe("abc");
		expect(state[1].name).toBe("repo-b");
	});

	it("excludes errored results from state", async () => {
		const statePath = path.join(tmpDir, "state.json");
		const results: SyncResult[] = [
			{ source: "good", status: "updated", skillCount: 3, commit: "aaa" },
			{
				source: "bad",
				status: "error",
				skillCount: 0,
				error: "clone failed",
			},
		];
		await writeSyncState(statePath, results);

		const state = await fs.readJson(statePath);
		expect(state).toHaveLength(1);
		expect(state[0].name).toBe("good");
	});
});

describe("generateGitHubAction", () => {
	it("generates valid yaml action", () => {
		const action = generateGitHubAction();
		expect(action).toContain("name: Upstream Sync");
		expect(action).toContain("schedule:");
		expect(action).toContain("workflow_dispatch:");
		expect(action).toContain("javi-ai upstream-sync");
		expect(action).toContain("create-pull-request");
	});

	it("includes cron schedule", () => {
		const action = generateGitHubAction();
		expect(action).toContain("cron:");
	});
});
