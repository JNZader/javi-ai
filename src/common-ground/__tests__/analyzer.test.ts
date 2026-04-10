import fs from "fs-extra";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { analyzeCommonGround, formatCommonGround } from "../analyzer.js";

let tmpDir: string;

beforeEach(async () => {
	tmpDir = path.join(os.tmpdir(), `common-ground-test-${Date.now()}`);
	await fs.ensureDir(tmpDir);
});

afterEach(async () => {
	await fs.remove(tmpDir);
});

describe("analyzeCommonGround", () => {
	it("detects pnpm as package manager", async () => {
		await fs.writeFile(path.join(tmpDir, "pnpm-lock.yaml"), "");
		const result = await analyzeCommonGround(tmpDir);
		const pm = result.assumptions.find((a) => a.key === "package-manager");
		expect(pm).toBeDefined();
		expect(pm?.value).toBe("pnpm");
		expect(pm?.confidence).toBe("high");
	});

	it("detects yarn as package manager", async () => {
		await fs.writeFile(path.join(tmpDir, "yarn.lock"), "");
		const result = await analyzeCommonGround(tmpDir);
		const pm = result.assumptions.find((a) => a.key === "package-manager");
		expect(pm?.value).toBe("yarn");
	});

	it("detects bun as package manager", async () => {
		await fs.writeFile(path.join(tmpDir, "bun.lockb"), "");
		const result = await analyzeCommonGround(tmpDir);
		const pm = result.assumptions.find((a) => a.key === "package-manager");
		expect(pm?.value).toBe("bun");
	});

	it("detects npm from package-lock.json", async () => {
		await fs.writeFile(path.join(tmpDir, "package-lock.json"), "{}");
		const result = await analyzeCommonGround(tmpDir);
		const pm = result.assumptions.find((a) => a.key === "package-manager");
		expect(pm?.value).toBe("npm");
	});

	it("detects TypeScript from tsconfig.json", async () => {
		await fs.writeFile(path.join(tmpDir, "tsconfig.json"), "{}");
		const result = await analyzeCommonGround(tmpDir);
		const ts = result.assumptions.find((a) => a.key === "typescript");
		expect(ts).toBeDefined();
		expect(ts?.value).toBe("yes");
	});

	it("detects Python from pyproject.toml", async () => {
		await fs.writeFile(path.join(tmpDir, "pyproject.toml"), "");
		const result = await analyzeCommonGround(tmpDir);
		const py = result.assumptions.find((a) => a.key === "python");
		expect(py?.value).toBe("yes");
	});

	it("detects Go from go.mod", async () => {
		await fs.writeFile(path.join(tmpDir, "go.mod"), "");
		const result = await analyzeCommonGround(tmpDir);
		const go = result.assumptions.find((a) => a.key === "go");
		expect(go?.value).toBe("yes");
	});

	it("detects Rust from Cargo.toml", async () => {
		await fs.writeFile(path.join(tmpDir, "Cargo.toml"), "");
		const result = await analyzeCommonGround(tmpDir);
		const rust = result.assumptions.find((a) => a.key === "rust");
		expect(rust?.value).toBe("yes");
	});

	it("detects ESM module system", async () => {
		await fs.writeJson(path.join(tmpDir, "package.json"), { type: "module" });
		const result = await analyzeCommonGround(tmpDir);
		const mod = result.assumptions.find((a) => a.key === "module-system");
		expect(mod?.value).toBe("ESM");
	});

	it("detects CJS module system by default", async () => {
		await fs.writeJson(path.join(tmpDir, "package.json"), { name: "test" });
		const result = await analyzeCommonGround(tmpDir);
		const mod = result.assumptions.find((a) => a.key === "module-system");
		expect(mod?.value).toBe("CJS (default)");
		expect(mod?.confidence).toBe("medium");
	});

	it("detects Next.js framework", async () => {
		await fs.writeJson(path.join(tmpDir, "package.json"), {
			dependencies: { next: "15.0.0", react: "19.0.0" },
		});
		const result = await analyzeCommonGround(tmpDir);
		const fw = result.assumptions.find((a) => a.key === "framework");
		expect(fw?.value).toContain("Next.js");
	});

	it("detects React framework", async () => {
		await fs.writeJson(path.join(tmpDir, "package.json"), {
			dependencies: { react: "19.0.0" },
		});
		const result = await analyzeCommonGround(tmpDir);
		const fw = result.assumptions.find((a) => a.key === "framework");
		expect(fw?.value).toContain("React");
	});

	it("detects vitest test runner from config file", async () => {
		await fs.writeFile(path.join(tmpDir, "vitest.config.ts"), "");
		const result = await analyzeCommonGround(tmpDir);
		const tr = result.assumptions.find((a) => a.key === "test-runner");
		expect(tr?.value).toBe("vitest");
		expect(tr?.confidence).toBe("high");
	});

	it("detects jest test runner from package.json deps", async () => {
		await fs.writeJson(path.join(tmpDir, "package.json"), {
			devDependencies: { jest: "^29.0.0" },
		});
		const result = await analyzeCommonGround(tmpDir);
		const tr = result.assumptions.find((a) => a.key === "test-runner");
		expect(tr?.value).toBe("jest");
		expect(tr?.confidence).toBe("medium");
	});

	it("detects pytest from conftest.py", async () => {
		await fs.writeFile(path.join(tmpDir, "conftest.py"), "");
		const result = await analyzeCommonGround(tmpDir);
		const tr = result.assumptions.find((a) => a.key === "test-runner");
		expect(tr?.value).toBe("pytest");
	});

	it("detects biome linter", async () => {
		await fs.writeJson(path.join(tmpDir, "biome.json"), {});
		const result = await analyzeCommonGround(tmpDir);
		const lint = result.assumptions.find((a) => a.key === "linter");
		expect(lint?.value).toBe("biome");
	});

	it("detects eslint linter", async () => {
		await fs.writeJson(path.join(tmpDir, ".eslintrc.json"), {});
		const result = await analyzeCommonGround(tmpDir);
		const lint = result.assumptions.find((a) => a.key === "linter");
		expect(lint?.value).toBe("eslint");
	});

	it("detects prettier formatter", async () => {
		await fs.writeFile(path.join(tmpDir, ".prettierrc"), "{}");
		const result = await analyzeCommonGround(tmpDir);
		const fmt = result.assumptions.find((a) => a.key === "formatter");
		expect(fmt?.value).toBe("prettier");
	});

	it("detects GitHub Actions CI", async () => {
		await fs.ensureDir(path.join(tmpDir, ".github", "workflows"));
		const result = await analyzeCommonGround(tmpDir);
		const ci = result.assumptions.find((a) => a.key === "ci-platform");
		expect(ci?.value).toBe("GitHub Actions");
	});

	it("detects husky git hooks", async () => {
		await fs.ensureDir(path.join(tmpDir, ".husky"));
		const result = await analyzeCommonGround(tmpDir);
		const hooks = result.assumptions.find((a) => a.key === "git-hooks");
		expect(hooks?.value).toBe("husky");
	});

	it("detects Nx monorepo", async () => {
		await fs.writeJson(path.join(tmpDir, "nx.json"), {});
		const result = await analyzeCommonGround(tmpDir);
		const mono = result.assumptions.find((a) => a.key === "monorepo");
		expect(mono?.value).toBe("Nx");
	});

	it("detects Turborepo monorepo", async () => {
		await fs.writeJson(path.join(tmpDir, "turbo.json"), {});
		const result = await analyzeCommonGround(tmpDir);
		const mono = result.assumptions.find((a) => a.key === "monorepo");
		expect(mono?.value).toBe("Turborepo");
	});

	it("detects Docker containerization", async () => {
		await fs.writeFile(path.join(tmpDir, "Dockerfile"), "FROM node:20");
		const result = await analyzeCommonGround(tmpDir);
		const docker = result.assumptions.find((a) => a.key === "containerization");
		expect(docker?.value).toBe("Docker");
	});

	it("detects node version from .nvmrc", async () => {
		await fs.writeFile(path.join(tmpDir, ".nvmrc"), "20.11.0\n");
		const result = await analyzeCommonGround(tmpDir);
		const nv = result.assumptions.find((a) => a.key === "node-version");
		expect(nv?.value).toBe("20.11.0");
	});

	it("detects Claude Code AI config", async () => {
		await fs.writeFile(path.join(tmpDir, "CLAUDE.md"), "# Instructions");
		const result = await analyzeCommonGround(tmpDir);
		const ai = result.assumptions.find((a) => a.key === "ai-agent-config");
		expect(ai?.value).toBe("Claude Code");
	});

	it("returns empty assumptions for empty directory", async () => {
		const result = await analyzeCommonGround(tmpDir);
		expect(result.assumptions).toHaveLength(0);
	});

	it("detects multiple assumptions in a real-like project", async () => {
		await fs.writeFile(path.join(tmpDir, "pnpm-lock.yaml"), "");
		await fs.writeFile(path.join(tmpDir, "tsconfig.json"), "{}");
		await fs.writeJson(path.join(tmpDir, "package.json"), {
			type: "module",
			dependencies: { react: "19.0.0" },
			devDependencies: { vitest: "^2.0.0" },
		});
		await fs.writeJson(path.join(tmpDir, "biome.json"), {});
		await fs.ensureDir(path.join(tmpDir, ".github", "workflows"));

		const result = await analyzeCommonGround(tmpDir);
		expect(result.assumptions.length).toBeGreaterThanOrEqual(6);

		const keys = result.assumptions.map((a) => a.key);
		expect(keys).toContain("package-manager");
		expect(keys).toContain("typescript");
		expect(keys).toContain("module-system");
		expect(keys).toContain("framework");
		expect(keys).toContain("linter");
		expect(keys).toContain("ci-platform");
	});
});

describe("formatCommonGround", () => {
	it("formats assumptions grouped by category", async () => {
		await fs.writeFile(path.join(tmpDir, "pnpm-lock.yaml"), "");
		await fs.writeFile(path.join(tmpDir, "tsconfig.json"), "{}");
		const result = await analyzeCommonGround(tmpDir);
		const formatted = formatCommonGround(result);

		expect(formatted).toContain("## Common Ground:");
		expect(formatted).toContain("### tooling");
		expect(formatted).toContain("### language");
		expect(formatted).toContain("pnpm");
	});

	it("shows fallback message for empty project", async () => {
		const result = await analyzeCommonGround(tmpDir);
		const formatted = formatCommonGround(result);
		expect(formatted).toContain("No assumptions detected");
	});
});
