#!/usr/bin/env node
import fs from "node:fs";

const REQUIRED_FILES = [
	"configs/claude/CLAUDE.md",
	"configs/codex/codex-config.toml",
	"configs/qwen/QWEN.md",
	"configs/copilot/base-rules.instructions.md",
	"configs/copilot/sdd-orchestrator-copilot.md",
	"configs/copilot/sdd-orchestrator.instructions.md",
	"delta/extensions/sdd-apply/EXTENSION.md",
	"delta/extensions/sdd-explore/EXTENSION.md",
	"delta/overrides/sdd-apply/SKILL.md",
	"own/hooks/claude/security-guard.sh",
	"own/plugins/skillguard/manifest.json",
	"own/plugins/merge-checks/PLUGIN.md",
	"own/plugins/mermaid/PLUGIN.md",
	"own/plugins/trim-md/PLUGIN.md",
	"own/skills/agent-governance/SKILL.md",
	"upstream/agent-teams-lite/skills/sdd-apply/SKILL.md",
	"upstream/gentleman-skills/curated/typescript/SKILL.md",
];

const REQUIRED_PREFIXES = [
	"configs/",
	"upstream/",
	"delta/",
	"own/skills/",
	"own/hooks/",
	"own/plugins/",
	"dist/",
];

const FORBIDDEN_PREFIXES = [
	"src/",
	"coverage/",
	"reports/",
	"node_modules/",
	".github/",
	".vscode/",
	".idea/",
];

const FORBIDDEN_PATTERNS = [
	/(^|\/)\.env($|\.)/,
	/(^|\/)credentials(\.|\/|$)/i,
	/(^|\/)secrets?(\/|$)/i,
	/(^|\/)npm-debug\.log$/,
	/\.test\.[cm]?[jt]sx?$/,
	/\.spec\.[cm]?[jt]sx?$/,
	/\.map$/,
];

function readPackedFiles(manifestPath) {
	if (!manifestPath) {
		throw new Error(
			"Usage: node scripts/verify-package-contents.mjs <npm-pack-json-output>",
		);
	}

	const output = fs.readFileSync(manifestPath, "utf-8").trim();
	if (!output) {
		throw new Error(`Package manifest is empty: ${manifestPath}`);
	}

	const parsed = JSON.parse(output);
	const [packument] = parsed;
	if (!packument || !Array.isArray(packument.files)) {
		throw new Error("npm pack did not return a file manifest");
	}
	return packument.files.map((file) => file.path).sort();
}

function fail(messages) {
	console.error("Package content verification failed:");
	for (const message of messages) {
		console.error(`- ${message}`);
	}
	process.exit(1);
}

const files = readPackedFiles(process.argv[2]);
const fileSet = new Set(files);
const errors = [];

for (const requiredFile of REQUIRED_FILES) {
	if (!fileSet.has(requiredFile)) {
		errors.push(`missing required file: ${requiredFile}`);
	}
}

for (const requiredPrefix of REQUIRED_PREFIXES) {
	if (!files.some((file) => file.startsWith(requiredPrefix))) {
		errors.push(`missing required asset tree: ${requiredPrefix}`);
	}
}

const skillCount = files.filter((file) => file.endsWith("/SKILL.md")).length;
if (skillCount === 0) {
	errors.push("missing SKILL.md files");
}

const extensionCount = files.filter((file) => file.endsWith("/EXTENSION.md")).length;
if (extensionCount === 0) {
	errors.push("missing EXTENSION.md files");
}

for (const forbiddenPrefix of FORBIDDEN_PREFIXES) {
	const match = files.find((file) => file.startsWith(forbiddenPrefix));
	if (match) {
		errors.push(`forbidden asset included from ${forbiddenPrefix}: ${match}`);
	}
}

for (const forbiddenPattern of FORBIDDEN_PATTERNS) {
	const match = files.find((file) => forbiddenPattern.test(file));
	if (match) {
		errors.push(`forbidden asset included: ${match}`);
	}
}

if (errors.length > 0) {
	fail(errors);
}

console.log(
	`Package content verification passed: ${files.length} files, ${skillCount} skills, ${extensionCount} extensions.`,
);
