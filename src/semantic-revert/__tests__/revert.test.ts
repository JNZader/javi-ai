import { describe, expect, it } from "vitest";
import type { CommitInfo } from "../revert.js";
import {
	createRevertPlan,
	detectGroups,
	formatRevertPlan,
	groupByScope,
	groupBySddChange,
	parseGitLog,
} from "../revert.js";

const SAMPLE_COMMITS: CommitInfo[] = [
	{
		hash: "aaa1111",
		message: "feat: add auth middleware for user-auth",
		author: "dev",
		date: "2026-04-10T10:00:00Z",
	},
	{
		hash: "bbb2222",
		message: "feat(auth): add JWT validation",
		author: "dev",
		date: "2026-04-10T11:00:00Z",
	},
	{
		hash: "ccc3333",
		message: "feat(auth): add refresh token rotation",
		author: "dev",
		date: "2026-04-10T12:00:00Z",
	},
	{
		hash: "ddd4444",
		message: "feat: implement sdd/user-auth spec",
		author: "dev",
		date: "2026-04-10T13:00:00Z",
	},
	{
		hash: "eee5555",
		message: "test(auth): add auth middleware tests",
		author: "dev",
		date: "2026-04-10T14:00:00Z",
	},
	{
		hash: "fff6666",
		message: "feat: add dashboard component",
		author: "dev",
		date: "2026-04-10T15:00:00Z",
	},
	{
		hash: "ggg7777",
		message: "fix: resolve sdd/user-auth edge case",
		author: "dev",
		date: "2026-04-10T16:00:00Z",
	},
];

describe("parseGitLog", () => {
	it("parses pipe-delimited git log output", () => {
		const log = `abc1234|feat: add feature|dev|2026-04-10T10:00:00Z
def5678|fix: bug|dev|2026-04-10T11:00:00Z`;
		const commits = parseGitLog(log);
		expect(commits).toHaveLength(2);
		expect(commits[0].hash).toBe("abc1234");
		expect(commits[0].message).toBe("feat: add feature");
	});

	it("handles empty input", () => {
		expect(parseGitLog("")).toEqual([]);
		expect(parseGitLog("   ")).toEqual([]);
	});

	it("skips malformed lines", () => {
		const log = `abc|only two|parts
def1234|good|line|2026-01-01`;
		const commits = parseGitLog(log);
		expect(commits).toHaveLength(1);
	});
});

describe("groupBySddChange", () => {
	it("groups commits matching SDD change name", () => {
		const group = groupBySddChange(SAMPLE_COMMITS, "user-auth");
		expect(group.name).toBe("user-auth");
		expect(group.commits.length).toBeGreaterThanOrEqual(3);
	});

	it("matches sdd/ prefix in messages", () => {
		const group = groupBySddChange(SAMPLE_COMMITS, "user-auth");
		const hashes = group.commits.map((c) => c.hash);
		expect(hashes).toContain("ddd4444");
		expect(hashes).toContain("ggg7777");
	});

	it("matches hyphenated name as words", () => {
		const group = groupBySddChange(SAMPLE_COMMITS, "user-auth");
		const hashes = group.commits.map((c) => c.hash);
		expect(hashes).toContain("aaa1111");
	});

	it("returns empty group for non-matching name", () => {
		const group = groupBySddChange(SAMPLE_COMMITS, "nonexistent-feature");
		expect(group.commits).toHaveLength(0);
	});
});

describe("groupByScope", () => {
	it("groups commits by conventional commit scope", () => {
		const group = groupByScope(SAMPLE_COMMITS, "auth");
		expect(group.commits.length).toBeGreaterThanOrEqual(3);
	});

	it("excludes non-scoped commits", () => {
		const group = groupByScope(SAMPLE_COMMITS, "auth");
		const hashes = group.commits.map((c) => c.hash);
		expect(hashes).not.toContain("fff6666");
	});
});

describe("detectGroups", () => {
	it("auto-detects groups from commit history", () => {
		const groups = detectGroups(SAMPLE_COMMITS);
		expect(groups.length).toBeGreaterThanOrEqual(1);
	});

	it("finds auth scope group", () => {
		const groups = detectGroups(SAMPLE_COMMITS);
		const authGroup = groups.find((g) => g.name === "auth");
		expect(authGroup).toBeDefined();
		expect(authGroup?.commits.length).toBeGreaterThanOrEqual(2);
	});

	it("finds SDD change group", () => {
		const groups = detectGroups(SAMPLE_COMMITS);
		const sddGroup = groups.find((g) => g.name.includes("user-auth"));
		expect(sddGroup).toBeDefined();
	});

	it("filters out single-commit groups", () => {
		const groups = detectGroups([
			{
				hash: "aaa",
				message: "feat(lonely): solo commit",
				author: "dev",
				date: "2026-01-01",
			},
		]);
		expect(groups).toHaveLength(0);
	});
});

describe("createRevertPlan", () => {
	it("creates plan with commits in reverse chronological order", () => {
		const group = groupBySddChange(SAMPLE_COMMITS, "user-auth");
		const plan = createRevertPlan(group);

		expect(plan.dryRun).toBe(true);
		expect(plan.revertCommits.length).toBe(group.commits.length);
		// First commit to revert should be the newest
		expect(plan.revertCommits[0]).toBe("ggg7777");
	});

	it("respects dryRun flag", () => {
		const group = groupBySddChange(SAMPLE_COMMITS, "user-auth");
		const plan = createRevertPlan(group, false);
		expect(plan.dryRun).toBe(false);
	});
});

describe("formatRevertPlan", () => {
	it("formats plan as readable text", () => {
		const group = groupBySddChange(SAMPLE_COMMITS, "user-auth");
		const plan = createRevertPlan(group);
		const output = formatRevertPlan(plan);

		expect(output).toContain("Semantic Revert: user-auth");
		expect(output).toContain("DRY RUN");
		expect(output).toContain("Commits to revert");
	});

	it("shows EXECUTE for non-dry-run", () => {
		const group = groupBySddChange(SAMPLE_COMMITS, "user-auth");
		const plan = createRevertPlan(group, false);
		const output = formatRevertPlan(plan);

		expect(output).toContain("EXECUTE");
	});

	it("includes shortened commit hashes", () => {
		const group = groupBySddChange(SAMPLE_COMMITS, "user-auth");
		const plan = createRevertPlan(group);
		const output = formatRevertPlan(plan);

		expect(output).toContain("ggg7777");
	});
});
