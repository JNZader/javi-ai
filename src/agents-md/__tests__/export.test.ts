import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	type AgentsMdEntry,
	exportToAgentsMd,
	renderAgentsMdBlock,
	renderAgentsMdFile,
} from "../export.js";

let tmpDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agents-md-test-"));
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

const SAMPLE_SKILL = `---
name: react-19
description: React 19 patterns with React Compiler
version: 1.0.0
phase: build
---

# React 19

## Purpose

Modern React patterns without useMemo/useCallback.

## Critical Rules

1. **Never use useMemo or useCallback** — React Compiler handles this
2. **Use Server Components by default**
`;

// ── renderAgentsMdBlock ──

describe("renderAgentsMdBlock", () => {
	it("wraps skill in XML-like block with name attribute", () => {
		const block = renderAgentsMdBlock("react-19", SAMPLE_SKILL);
		expect(block).toContain('<skill name="react-19">');
		expect(block).toContain("</skill>");
		expect(block).toContain("React 19");
	});

	it("strips frontmatter from content", () => {
		const block = renderAgentsMdBlock("react-19", SAMPLE_SKILL);
		expect(block).not.toContain("---");
		expect(block).not.toContain("name: react-19");
	});

	it("preserves markdown content", () => {
		const block = renderAgentsMdBlock("react-19", SAMPLE_SKILL);
		expect(block).toContain("## Purpose");
		expect(block).toContain("## Critical Rules");
		expect(block).toContain("Never use useMemo");
	});
});

// ── renderAgentsMdFile ──

describe("renderAgentsMdFile", () => {
	it("produces complete AGENTS.md with header", () => {
		const entries: AgentsMdEntry[] = [
			{ name: "react-19", content: SAMPLE_SKILL },
			{
				name: "typescript",
				content:
					"---\nname: typescript\n---\n# TypeScript\n\nStrict mode patterns.",
			},
		];
		const md = renderAgentsMdFile(entries, "my-project");
		expect(md).toContain("# AGENTS.md");
		expect(md).toContain("my-project");
		expect(md).toContain('<skill name="react-19">');
		expect(md).toContain('<skill name="typescript">');
	});

	it("includes skill count in header", () => {
		const entries: AgentsMdEntry[] = [
			{ name: "a", content: "---\nname: a\n---\n# A" },
			{ name: "b", content: "---\nname: b\n---\n# B" },
			{ name: "c", content: "---\nname: c\n---\n# C" },
		];
		const md = renderAgentsMdFile(entries);
		expect(md).toContain("3 skills");
	});

	it("handles empty entries", () => {
		const md = renderAgentsMdFile([]);
		expect(md).toContain("AGENTS.md");
		expect(md).toContain("0 skills");
	});
});

// ── exportToAgentsMd ──

describe("exportToAgentsMd", () => {
	it("reads skills from directory and writes AGENTS.md", () => {
		// Create fake skills
		for (const name of ["react-19", "typescript"]) {
			const dir = path.join(tmpDir, name);
			fs.mkdirSync(dir);
			fs.writeFileSync(
				path.join(dir, "SKILL.md"),
				`---\nname: ${name}\n---\n# ${name}\n\nContent for ${name}.`,
			);
		}

		const outputPath = path.join(tmpDir, "AGENTS.md");
		const result = exportToAgentsMd(tmpDir, outputPath);

		expect(result.skillCount).toBe(2);
		expect(result.outputPath).toBe(outputPath);
		expect(fs.existsSync(outputPath)).toBe(true);

		const content = fs.readFileSync(outputPath, "utf-8");
		expect(content).toContain("react-19");
		expect(content).toContain("typescript");
	});

	it("skips _shared directory", () => {
		fs.mkdirSync(path.join(tmpDir, "_shared"));
		fs.writeFileSync(
			path.join(tmpDir, "_shared", "SKILL.md"),
			"---\nname: shared\n---\n# Shared",
		);
		fs.mkdirSync(path.join(tmpDir, "real-skill"));
		fs.writeFileSync(
			path.join(tmpDir, "real-skill", "SKILL.md"),
			"---\nname: real\n---\n# Real",
		);

		const result = exportToAgentsMd(tmpDir, path.join(tmpDir, "AGENTS.md"));
		expect(result.skillCount).toBe(1);
	});

	it("filters by skill names when provided", () => {
		for (const name of ["a", "b", "c"]) {
			const dir = path.join(tmpDir, name);
			fs.mkdirSync(dir);
			fs.writeFileSync(
				path.join(dir, "SKILL.md"),
				`---\nname: ${name}\n---\n# ${name}`,
			);
		}

		const result = exportToAgentsMd(tmpDir, path.join(tmpDir, "AGENTS.md"), [
			"a",
			"c",
		]);
		expect(result.skillCount).toBe(2);

		const content = fs.readFileSync(path.join(tmpDir, "AGENTS.md"), "utf-8");
		expect(content).toContain('<skill name="a">');
		expect(content).toContain('<skill name="c">');
		expect(content).not.toContain('<skill name="b">');
	});

	it("returns 0 skills for empty directory", () => {
		const result = exportToAgentsMd(tmpDir, path.join(tmpDir, "AGENTS.md"));
		expect(result.skillCount).toBe(0);
	});

	it("handles nonexistent source directory", () => {
		const result = exportToAgentsMd(
			"/nonexistent",
			path.join(tmpDir, "AGENTS.md"),
		);
		expect(result.skillCount).toBe(0);
	});
});
