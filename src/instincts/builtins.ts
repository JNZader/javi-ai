/**
 * Built-in instincts — always-active behavioral rules that cannot be
 * disabled. These are foundational quality guardrails that apply
 * regardless of which skills are loaded.
 */

import type { Instinct } from "./instinct.js";

export const BUILTIN_INSTINCTS: Instinct[] = [
	{
		id: "builtin-anti-lazy-output",
		rule: "Never produce truncated output. Never use placeholder comments like '// rest of code here' or '// ... existing code'. Never skip code blocks. Output every line of code that was requested.",
		confidence: 1.0,
		source: "built-in",
		tags: ["output-quality", "completeness"],
		createdAt: "2026-01-01T00:00:00Z",
		usedCount: 0,
		lastUsedAt: null,
	},
	{
		id: "builtin-read-before-edit",
		rule: "Always read a file before modifying it. Never edit code you haven't seen. If unsure about the current state, read first.",
		confidence: 1.0,
		source: "built-in",
		tags: ["safety", "verification"],
		createdAt: "2026-01-01T00:00:00Z",
		usedCount: 0,
		lastUsedAt: null,
	},
	{
		id: "builtin-verify-before-commit",
		rule: "Run tests or type-check before committing. Never commit code that you haven't verified compiles and passes basic checks.",
		confidence: 1.0,
		source: "built-in",
		tags: ["safety", "testing"],
		createdAt: "2026-01-01T00:00:00Z",
		usedCount: 0,
		lastUsedAt: null,
	},
	{
		id: "builtin-no-secrets-in-code",
		rule: "Never hardcode API keys, passwords, tokens, or secrets in source code. Use environment variables or secret managers.",
		confidence: 1.0,
		source: "built-in",
		tags: ["security"],
		createdAt: "2026-01-01T00:00:00Z",
		usedCount: 0,
		lastUsedAt: null,
	},
	{
		id: "builtin-conventional-commits",
		rule: "Use conventional commit format: feat/fix/test/refactor/docs/chore prefix. Keep messages concise and descriptive.",
		confidence: 1.0,
		source: "built-in",
		tags: ["git", "conventions"],
		createdAt: "2026-01-01T00:00:00Z",
		usedCount: 0,
		lastUsedAt: null,
	},
];

export function getBuiltinInstincts(): Instinct[] {
	return [...BUILTIN_INSTINCTS];
}

export function isBuiltinInstinct(instinct: Instinct): boolean {
	return instinct.id.startsWith("builtin-");
}
