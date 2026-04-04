import fs from "fs-extra";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTONOMY_LEVELS, DEFAULT_AUTONOMY_LEVEL } from "../constants.js";

// Mock constants for manifest path
vi.mock("../constants.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../constants.js")>();
	return {
		...actual,
		MANIFEST_PATH: path.join(
			os.tmpdir(),
			`.javi-ai-autonomy-test-${Date.now()}`,
			"manifest.json",
		),
		BACKUP_DIR: path.join(
			os.tmpdir(),
			`.javi-ai-autonomy-test-${Date.now()}`,
			"backups",
		),
		CLI_OPTIONS: [
			{
				id: "claude",
				label: "Claude Code",
				configPath: path.join(os.tmpdir(), ".claude-autonomy-test"),
				skillsPath: path.join(
					os.tmpdir(),
					`.javi-ai-autonomy-skills-${Date.now()}`,
				),
				pluginsPath: path.join(os.tmpdir(), ".claude-autonomy-test", "plugins"),
				available: true,
			},
		],
	};
});

const { MANIFEST_PATH } = await import("../constants.js");
const { readManifest, writeManifest } = await import(
	"../installer/manifest.js"
);

describe("AUTONOMY_LEVELS constant", () => {
	it("defines all four levels in order", () => {
		const ids = AUTONOMY_LEVELS.map((l) => l.id);
		expect(ids).toEqual(["observer", "advisor", "assistant", "partner"]);
	});

	it("observer level has no hooks or orchestrators", () => {
		const observer = AUTONOMY_LEVELS.find((l) => l.id === "observer")!;
		expect(observer.features).not.toContain("hooks");
		expect(observer.features).not.toContain("orchestrators");
		expect(observer.features).toContain("skills");
		expect(observer.features).toContain("configs");
	});

	it("advisor level has orchestrators but no hooks", () => {
		const advisor = AUTONOMY_LEVELS.find((l) => l.id === "advisor")!;
		expect(advisor.features).toContain("orchestrators");
		expect(advisor.features).not.toContain("hooks");
		expect(advisor.features).toContain("skills");
		expect(advisor.features).toContain("configs");
	});

	it("assistant level includes hooks and plugins but not agents", () => {
		const assistant = AUTONOMY_LEVELS.find((l) => l.id === "assistant")!;
		expect(assistant.features).toContain("hooks");
		expect(assistant.features).toContain("plugins");
		expect(assistant.features).not.toContain("agents");
	});

	it("partner level includes all features including agents", () => {
		const partner = AUTONOMY_LEVELS.find((l) => l.id === "partner")!;
		expect(partner.features).toContain("skills");
		expect(partner.features).toContain("orchestrators");
		expect(partner.features).toContain("configs");
		expect(partner.features).toContain("hooks");
		expect(partner.features).toContain("plugins");
		expect(partner.features).toContain("agents");
	});

	it("levels have escalating feature counts", () => {
		const counts = AUTONOMY_LEVELS.map((l) => l.features.length);
		for (let i = 1; i < counts.length; i++) {
			expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]!);
		}
	});

	it("each level has a non-empty label and description", () => {
		for (const level of AUTONOMY_LEVELS) {
			expect(level.label.length).toBeGreaterThan(0);
			expect(level.description.length).toBeGreaterThan(0);
		}
	});

	it("DEFAULT_AUTONOMY_LEVEL is assistant", () => {
		expect(DEFAULT_AUTONOMY_LEVEL).toBe("assistant");
	});
});

describe("Manifest autonomy level persistence", () => {
	afterEach(async () => {
		await fs.remove(path.dirname(MANIFEST_PATH)).catch(() => undefined);
	});

	it("saves autonomy level to manifest", async () => {
		const manifest = await readManifest();
		manifest.autonomyLevel = "observer";
		await writeManifest(manifest);

		const reloaded = await readManifest();
		expect(reloaded.autonomyLevel).toBe("observer");
	});

	it("manifest without autonomyLevel field is valid (backward compat)", async () => {
		const manifest = await readManifest();
		// autonomyLevel is optional — should not be set by default
		expect(manifest.autonomyLevel).toBeUndefined();
	});

	it("can update autonomy level from observer to partner", async () => {
		const manifest = await readManifest();
		manifest.autonomyLevel = "observer";
		await writeManifest(manifest);

		const updated = await readManifest();
		updated.autonomyLevel = "partner";
		await writeManifest(updated);

		const final = await readManifest();
		expect(final.autonomyLevel).toBe("partner");
	});
});

describe("runInstall() autonomy level → manifest", () => {
	let tempSkillsPath: string;

	beforeEach(async () => {
		tempSkillsPath = path.join(
			os.tmpdir(),
			`.javi-ai-autonomy-install-${Date.now()}`,
		);
		await fs.ensureDir(tempSkillsPath);
	});

	afterEach(async () => {
		await fs.remove(tempSkillsPath).catch(() => undefined);
		await fs.remove(path.dirname(MANIFEST_PATH)).catch(() => undefined);
	});

	it("observer level installs no hooks (features filter respected)", async () => {
		const { runInstall } = await import("../installer/index.js");
		const steps: string[] = [];

		await runInstall(
			{
				clis: ["claude"],
				features: AUTONOMY_LEVELS.find((l) => l.id === "observer")!.features,
				dryRun: true,
				backup: false,
				autonomyLevel: "observer",
			},
			(step) => steps.push(step.id),
		);

		// In dry-run: no hooks step should be triggered for observer
		expect(steps.some((s) => s.includes("hooks"))).toBe(false);
	});

	it("partner level triggers hooks step", async () => {
		const { runInstall } = await import("../installer/index.js");
		const steps: string[] = [];

		await runInstall(
			{
				clis: ["claude"],
				features: AUTONOMY_LEVELS.find((l) => l.id === "partner")!.features,
				dryRun: true,
				backup: false,
				autonomyLevel: "partner",
			},
			(step) => steps.push(step.id),
		);

		expect(steps.some((s) => s.includes("hooks"))).toBe(true);
	});
});
