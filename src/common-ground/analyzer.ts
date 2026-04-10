import fs from "fs-extra";
import path from "path";

export interface Assumption {
	category: string;
	key: string;
	value: string;
	confidence: "high" | "medium" | "low";
	source: string;
}

export interface CommonGroundResult {
	projectDir: string;
	assumptions: Assumption[];
}

interface DetectorConfig {
	category: string;
	key: string;
	detect: (dir: string) => Promise<Assumption | null>;
}

const fileExists = async (dir: string, file: string): Promise<boolean> =>
	fs.pathExists(path.join(dir, file));

const readJsonField = async (
	dir: string,
	file: string,
	field: string,
): Promise<string | undefined> => {
	try {
		const content = await fs.readJson(path.join(dir, file));
		return content[field];
	} catch {
		return undefined;
	}
};

const DETECTORS: DetectorConfig[] = [
	// --- Package Manager ---
	{
		category: "tooling",
		key: "package-manager",
		detect: async (dir) => {
			if (await fileExists(dir, "pnpm-lock.yaml"))
				return a(
					"tooling",
					"package-manager",
					"pnpm",
					"high",
					"pnpm-lock.yaml",
				);
			if (await fileExists(dir, "bun.lockb"))
				return a("tooling", "package-manager", "bun", "high", "bun.lockb");
			if (await fileExists(dir, "yarn.lock"))
				return a("tooling", "package-manager", "yarn", "high", "yarn.lock");
			if (await fileExists(dir, "package-lock.json"))
				return a(
					"tooling",
					"package-manager",
					"npm",
					"high",
					"package-lock.json",
				);
			if (await fileExists(dir, "package.json"))
				return a(
					"tooling",
					"package-manager",
					"npm (assumed)",
					"low",
					"package.json",
				);
			return null;
		},
	},
	// --- Language ---
	{
		category: "language",
		key: "typescript",
		detect: async (dir) => {
			if (await fileExists(dir, "tsconfig.json"))
				return a("language", "typescript", "yes", "high", "tsconfig.json");
			return null;
		},
	},
	{
		category: "language",
		key: "python",
		detect: async (dir) => {
			if (await fileExists(dir, "pyproject.toml"))
				return a("language", "python", "yes", "high", "pyproject.toml");
			if (await fileExists(dir, "requirements.txt"))
				return a("language", "python", "yes", "high", "requirements.txt");
			if (await fileExists(dir, "setup.py"))
				return a("language", "python", "yes", "high", "setup.py");
			return null;
		},
	},
	{
		category: "language",
		key: "go",
		detect: async (dir) => {
			if (await fileExists(dir, "go.mod"))
				return a("language", "go", "yes", "high", "go.mod");
			return null;
		},
	},
	{
		category: "language",
		key: "rust",
		detect: async (dir) => {
			if (await fileExists(dir, "Cargo.toml"))
				return a("language", "rust", "yes", "high", "Cargo.toml");
			return null;
		},
	},
	// --- Module System ---
	{
		category: "language",
		key: "module-system",
		detect: async (dir) => {
			if (!(await fileExists(dir, "package.json"))) return null;
			const type = await readJsonField(dir, "package.json", "type");
			if (type === "module")
				return a(
					"language",
					"module-system",
					"ESM",
					"high",
					'package.json "type": "module"',
				);
			if (type === "commonjs")
				return a("language", "module-system", "CJS", "high", "package.json");
			return a(
				"language",
				"module-system",
				"CJS (default)",
				"medium",
				"package.json",
			);
		},
	},
	// --- Framework ---
	{
		category: "framework",
		key: "framework",
		detect: async (dir) => {
			const hasPkg = await fileExists(dir, "package.json");
			if (!hasPkg) return null;
			try {
				const pkg = await fs.readJson(path.join(dir, "package.json"));
				const allDeps = {
					...pkg.dependencies,
					...pkg.devDependencies,
				};
				if (allDeps.next)
					return a(
						"framework",
						"framework",
						`Next.js ${allDeps.next}`,
						"high",
						"package.json",
					);
				if (allDeps["@angular/core"])
					return a(
						"framework",
						"framework",
						`Angular ${allDeps["@angular/core"]}`,
						"high",
						"package.json",
					);
				if (allDeps.react)
					return a(
						"framework",
						"framework",
						`React ${allDeps.react}`,
						"high",
						"package.json",
					);
				if (allDeps.vue)
					return a(
						"framework",
						"framework",
						`Vue ${allDeps.vue}`,
						"high",
						"package.json",
					);
				if (allDeps.svelte)
					return a(
						"framework",
						"framework",
						`Svelte ${allDeps.svelte}`,
						"high",
						"package.json",
					);
				if (allDeps.django)
					return a("framework", "framework", "Django", "high", "package.json");
			} catch {
				// skip
			}
			return null;
		},
	},
	// --- Test Runner ---
	{
		category: "testing",
		key: "test-runner",
		detect: async (dir) => {
			if (await fileExists(dir, "vitest.config.ts"))
				return a(
					"testing",
					"test-runner",
					"vitest",
					"high",
					"vitest.config.ts",
				);
			if (await fileExists(dir, "vitest.config.js"))
				return a(
					"testing",
					"test-runner",
					"vitest",
					"high",
					"vitest.config.js",
				);
			if (await fileExists(dir, "jest.config.ts"))
				return a("testing", "test-runner", "jest", "high", "jest.config.ts");
			if (await fileExists(dir, "jest.config.js"))
				return a("testing", "test-runner", "jest", "high", "jest.config.js");
			try {
				const pkg = await fs.readJson(path.join(dir, "package.json"));
				if (pkg.devDependencies?.vitest || pkg.dependencies?.vitest)
					return a(
						"testing",
						"test-runner",
						"vitest",
						"medium",
						"package.json deps",
					);
				if (pkg.devDependencies?.jest || pkg.dependencies?.jest)
					return a(
						"testing",
						"test-runner",
						"jest",
						"medium",
						"package.json deps",
					);
				if (pkg.devDependencies?.mocha)
					return a(
						"testing",
						"test-runner",
						"mocha",
						"medium",
						"package.json deps",
					);
			} catch {
				// skip
			}
			if (await fileExists(dir, "pytest.ini"))
				return a("testing", "test-runner", "pytest", "high", "pytest.ini");
			if (await fileExists(dir, "conftest.py"))
				return a("testing", "test-runner", "pytest", "high", "conftest.py");
			return null;
		},
	},
	// --- Linter ---
	{
		category: "tooling",
		key: "linter",
		detect: async (dir) => {
			if (await fileExists(dir, "biome.json"))
				return a("tooling", "linter", "biome", "high", "biome.json");
			if (await fileExists(dir, "biome.jsonc"))
				return a("tooling", "linter", "biome", "high", "biome.jsonc");
			if (await fileExists(dir, ".eslintrc.json"))
				return a("tooling", "linter", "eslint", "high", ".eslintrc.json");
			if (await fileExists(dir, ".eslintrc.js"))
				return a("tooling", "linter", "eslint", "high", ".eslintrc.js");
			if (await fileExists(dir, "eslint.config.js"))
				return a(
					"tooling",
					"linter",
					"eslint (flat config)",
					"high",
					"eslint.config.js",
				);
			if (await fileExists(dir, ".ruff.toml"))
				return a("tooling", "linter", "ruff", "high", ".ruff.toml");
			return null;
		},
	},
	// --- Formatter ---
	{
		category: "tooling",
		key: "formatter",
		detect: async (dir) => {
			if (await fileExists(dir, ".prettierrc"))
				return a("tooling", "formatter", "prettier", "high", ".prettierrc");
			if (await fileExists(dir, ".prettierrc.json"))
				return a(
					"tooling",
					"formatter",
					"prettier",
					"high",
					".prettierrc.json",
				);
			if (await fileExists(dir, "prettier.config.js"))
				return a(
					"tooling",
					"formatter",
					"prettier",
					"high",
					"prettier.config.js",
				);
			// biome also formats — already detected in linter
			return null;
		},
	},
	// --- CI/CD ---
	{
		category: "ci",
		key: "ci-platform",
		detect: async (dir) => {
			if (await fileExists(dir, ".github/workflows"))
				return a(
					"ci",
					"ci-platform",
					"GitHub Actions",
					"high",
					".github/workflows/",
				);
			if (await fileExists(dir, ".gitlab-ci.yml"))
				return a("ci", "ci-platform", "GitLab CI", "high", ".gitlab-ci.yml");
			if (await fileExists(dir, "Jenkinsfile"))
				return a("ci", "ci-platform", "Jenkins", "high", "Jenkinsfile");
			if (await fileExists(dir, ".circleci/config.yml"))
				return a(
					"ci",
					"ci-platform",
					"CircleCI",
					"high",
					".circleci/config.yml",
				);
			return null;
		},
	},
	// --- Git Hooks ---
	{
		category: "tooling",
		key: "git-hooks",
		detect: async (dir) => {
			if (await fileExists(dir, ".husky"))
				return a("tooling", "git-hooks", "husky", "high", ".husky/");
			if (await fileExists(dir, "lefthook.yml"))
				return a("tooling", "git-hooks", "lefthook", "high", "lefthook.yml");
			if (await fileExists(dir, ".lefthook.yml"))
				return a("tooling", "git-hooks", "lefthook", "high", ".lefthook.yml");
			return null;
		},
	},
	// --- Monorepo ---
	{
		category: "architecture",
		key: "monorepo",
		detect: async (dir) => {
			if (await fileExists(dir, "nx.json"))
				return a("architecture", "monorepo", "Nx", "high", "nx.json");
			if (await fileExists(dir, "turbo.json"))
				return a("architecture", "monorepo", "Turborepo", "high", "turbo.json");
			if (await fileExists(dir, "lerna.json"))
				return a("architecture", "monorepo", "Lerna", "high", "lerna.json");
			if (await fileExists(dir, "pnpm-workspace.yaml"))
				return a(
					"architecture",
					"monorepo",
					"pnpm workspace",
					"high",
					"pnpm-workspace.yaml",
				);
			return null;
		},
	},
	// --- Containerization ---
	{
		category: "infrastructure",
		key: "containerization",
		detect: async (dir) => {
			if (await fileExists(dir, "Dockerfile"))
				return a(
					"infrastructure",
					"containerization",
					"Docker",
					"high",
					"Dockerfile",
				);
			if (await fileExists(dir, "docker-compose.yml"))
				return a(
					"infrastructure",
					"containerization",
					"Docker Compose",
					"high",
					"docker-compose.yml",
				);
			if (await fileExists(dir, "docker-compose.yaml"))
				return a(
					"infrastructure",
					"containerization",
					"Docker Compose",
					"high",
					"docker-compose.yaml",
				);
			return null;
		},
	},
	// --- Node Version ---
	{
		category: "tooling",
		key: "node-version",
		detect: async (dir) => {
			for (const f of [".nvmrc", ".node-version", ".tool-versions"]) {
				if (await fileExists(dir, f)) {
					try {
						const content = (
							await fs.readFile(path.join(dir, f), "utf-8")
						).trim();
						const version =
							f === ".tool-versions"
								? (content
										.split("\n")
										.find((l) => l.startsWith("nodejs"))
										?.split(/\s+/)[1] ?? content)
								: content;
						return a("tooling", "node-version", version, "high", f);
					} catch {
						return a("tooling", "node-version", "specified", "medium", f);
					}
				}
			}
			return null;
		},
	},
	// --- AI Agent Config ---
	{
		category: "ai",
		key: "ai-agent-config",
		detect: async (dir) => {
			if (await fileExists(dir, "CLAUDE.md"))
				return a("ai", "ai-agent-config", "Claude Code", "high", "CLAUDE.md");
			if (await fileExists(dir, "AGENTS.md"))
				return a(
					"ai",
					"ai-agent-config",
					"OpenCode/AGENTS.md",
					"high",
					"AGENTS.md",
				);
			if (await fileExists(dir, ".cursorrules"))
				return a("ai", "ai-agent-config", "Cursor", "high", ".cursorrules");
			if (await fileExists(dir, ".github/copilot-instructions.md"))
				return a(
					"ai",
					"ai-agent-config",
					"Copilot",
					"high",
					".github/copilot-instructions.md",
				);
			return null;
		},
	},
];

function a(
	category: string,
	key: string,
	value: string,
	confidence: Assumption["confidence"],
	source: string,
): Assumption {
	return { category, key, value, confidence, source };
}

/**
 * Analyze a project directory and surface hidden assumptions.
 */
export async function analyzeCommonGround(
	projectDir: string,
): Promise<CommonGroundResult> {
	const resolved = path.resolve(projectDir);
	const assumptions: Assumption[] = [];

	for (const detector of DETECTORS) {
		const result = await detector.detect(resolved);
		if (result) assumptions.push(result);
	}

	return { projectDir: resolved, assumptions };
}

/**
 * Format assumptions as a readable string.
 */
export function formatCommonGround(result: CommonGroundResult): string {
	const lines: string[] = [`## Common Ground: ${result.projectDir}`, ""];

	const byCategory = new Map<string, Assumption[]>();
	for (const assumption of result.assumptions) {
		const list = byCategory.get(assumption.category) ?? [];
		list.push(assumption);
		byCategory.set(assumption.category, list);
	}

	for (const [category, items] of byCategory) {
		lines.push(`### ${category}`);
		for (const item of items) {
			const conf =
				item.confidence === "high"
					? ""
					: item.confidence === "medium"
						? " (?)"
						: " (??)";
			lines.push(`- **${item.key}**: ${item.value}${conf}  ← ${item.source}`);
		}
		lines.push("");
	}

	if (result.assumptions.length === 0) {
		lines.push("No assumptions detected. Is this a project directory?");
	}

	return lines.join("\n");
}
