import { describe, expect, it, vi } from "vitest";
import type { SddChange, SddPhase } from "../../types/index.js";
import {
	APPROVAL_PHASES,
	buildProgressBar,
	detectPhase,
	PHASE_ORDER,
	phaseProgress,
	runDashboard,
} from "../dashboard.js";

// ── detectPhase ──

describe("detectPhase", () => {
	it("returns explore when no artifacts found", () => {
		expect(detectPhase([])).toBe("explore");
	});

	it("returns the highest phase present", () => {
		expect(detectPhase(["explore", "proposal", "spec"])).toBe("spec");
	});

	it("maps apply-progress to apply", () => {
		expect(detectPhase(["explore", "apply-progress"])).toBe("apply");
	});

	it("returns archive when all phases present", () => {
		expect(
			detectPhase([
				"explore",
				"proposal",
				"spec",
				"design",
				"tasks",
				"apply-progress",
				"verify",
				"archive",
			]),
		).toBe("archive");
	});

	it("handles single artifact", () => {
		expect(detectPhase(["proposal"])).toBe("proposal");
	});

	it("ignores unknown artifact types", () => {
		expect(detectPhase(["explore", "unknown-type", "random"])).toBe("explore");
	});

	it("handles out-of-order input", () => {
		expect(detectPhase(["design", "explore", "spec"])).toBe("design");
	});
});

// ── buildProgressBar ──

describe("buildProgressBar", () => {
	it("returns full bar when completed equals total", () => {
		expect(buildProgressBar(10, 10, 8)).toBe("████████");
	});

	it("returns empty bar when completed is 0", () => {
		expect(buildProgressBar(0, 10, 8)).toBe("░░░░░░░░");
	});

	it("returns empty bar when total is 0", () => {
		expect(buildProgressBar(0, 0, 8)).toBe("░░░░░░░░");
	});

	it("returns half bar when half complete", () => {
		expect(buildProgressBar(5, 10, 8)).toBe("████░░░░");
	});

	it("respects custom width", () => {
		expect(buildProgressBar(1, 2, 4)).toBe("██░░");
	});

	it("clamps to max width when completed > total", () => {
		expect(buildProgressBar(20, 10, 8)).toBe("████████");
	});

	it("handles fractional progress correctly", () => {
		// 3/8 = 0.375 → rounds to 3
		expect(buildProgressBar(3, 8, 8)).toBe("███░░░░░");
	});
});

// ── phaseProgress ──

describe("phaseProgress", () => {
	it("uses task counts when available", () => {
		const change: SddChange = {
			name: "feature-x",
			currentPhase: "apply",
			completedPhases: [],
			taskTotal: 10,
			taskDone: 7,
			awaitingApproval: false,
			lastActivity: "2026-01-01T00:00:00Z",
		};
		expect(phaseProgress(change)).toEqual({ completed: 7, total: 10 });
	});

	it("falls back to phase index when no task counts", () => {
		const change: SddChange = {
			name: "feature-x",
			currentPhase: "spec",
			completedPhases: [],
			awaitingApproval: false,
			lastActivity: "2026-01-01T00:00:00Z",
		};
		const specIdx = PHASE_ORDER.indexOf("spec"); // 2
		expect(phaseProgress(change)).toEqual({
			completed: specIdx + 1,
			total: PHASE_ORDER.length,
		});
	});

	it("explore phase is index 1 / total", () => {
		const change: SddChange = {
			name: "new-thing",
			currentPhase: "explore",
			completedPhases: [],
			awaitingApproval: false,
			lastActivity: "2026-01-01T00:00:00Z",
		};
		expect(phaseProgress(change)).toEqual({
			completed: 1,
			total: PHASE_ORDER.length,
		});
	});

	it("archive phase gives full progress", () => {
		const change: SddChange = {
			name: "done-thing",
			currentPhase: "archive",
			completedPhases: [],
			awaitingApproval: false,
			lastActivity: "2026-01-01T00:00:00Z",
		};
		expect(phaseProgress(change)).toEqual({
			completed: PHASE_ORDER.length,
			total: PHASE_ORDER.length,
		});
	});
});

// ── PHASE_ORDER / APPROVAL_PHASES ──

describe("PHASE_ORDER", () => {
	it("has 8 phases", () => {
		expect(PHASE_ORDER).toHaveLength(8);
	});

	it("starts with explore and ends with archive", () => {
		expect(PHASE_ORDER[0]).toBe("explore");
		expect(PHASE_ORDER[PHASE_ORDER.length - 1]).toBe("archive");
	});
});

describe("APPROVAL_PHASES", () => {
	it("includes proposal, spec, design, tasks", () => {
		expect(APPROVAL_PHASES).toContain("proposal");
		expect(APPROVAL_PHASES).toContain("spec");
		expect(APPROVAL_PHASES).toContain("design");
		expect(APPROVAL_PHASES).toContain("tasks");
	});

	it("does not include apply, verify, archive", () => {
		expect(APPROVAL_PHASES).not.toContain("apply");
		expect(APPROVAL_PHASES).not.toContain("verify");
		expect(APPROVAL_PHASES).not.toContain("archive");
	});
});

// ── runDashboard ──

describe("runDashboard", () => {
	it("returns empty result when no cache", async () => {
		delete process.env.SDD_CACHE_FILE;
		const result = await runDashboard("my-project");
		expect(result.changes).toEqual([]);
		expect(result.recentActivity).toEqual([]);
		expect(result.project).toBe("my-project");
	});

	it("uses SDD_PROJECT env var as fallback", async () => {
		delete process.env.SDD_CACHE_FILE;
		process.env.SDD_PROJECT = "env-project";
		const result = await runDashboard();
		expect(result.project).toBe("env-project");
		delete process.env.SDD_PROJECT;
	});

	it("returns 'unknown' when no project specified", async () => {
		delete process.env.SDD_CACHE_FILE;
		delete process.env.SDD_PROJECT;
		const result = await runDashboard();
		expect(result.project).toBe("unknown");
	});

	it("loads data from SDD_CACHE_FILE when it exists", async () => {
		const fs = await import("fs-extra");
		const os = await import("node:os");
		const path = await import("node:path");

		const tmpFile = path.join(os.tmpdir(), `sdd-test-${Date.now()}.json`);
		const mockData = {
			changes: [
				{
					name: "test-change",
					currentPhase: "apply" as SddPhase,
					completedPhases: ["explore", "proposal"] as SddPhase[],
					taskTotal: 5,
					taskDone: 3,
					awaitingApproval: false,
					lastActivity: "2026-01-01T00:00:00Z",
				},
			],
			recentActivity: [],
			project: "cached-project",
		};

		await fs.writeJson(tmpFile, mockData);
		process.env.SDD_CACHE_FILE = tmpFile;

		try {
			const result = await runDashboard();
			expect(result.project).toBe("cached-project");
			expect(result.changes).toHaveLength(1);
			expect(result.changes[0]!.name).toBe("test-change");
			expect(result.changes[0]!.taskDone).toBe(3);
		} finally {
			delete process.env.SDD_CACHE_FILE;
			await fs.remove(tmpFile);
		}
	});

	it("falls back to empty when cache file is malformed", async () => {
		const fs = await import("fs-extra");
		const os = await import("node:os");
		const path = await import("node:path");

		const tmpFile = path.join(os.tmpdir(), `sdd-bad-test-${Date.now()}.json`);
		await fs.writeFile(tmpFile, "not valid json{{{");
		process.env.SDD_CACHE_FILE = tmpFile;

		try {
			const result = await runDashboard("fallback-project");
			expect(result.changes).toEqual([]);
			expect(result.project).toBe("fallback-project");
		} finally {
			delete process.env.SDD_CACHE_FILE;
			await fs.remove(tmpFile);
		}
	});
});
