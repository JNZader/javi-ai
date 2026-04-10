/**
 * Instinct layer — lightweight behavioral rules (< 5 lines) that sit
 * between full skills and raw config. Instincts have confidence scores
 * and can be imported/exported between projects.
 *
 * An instinct is a single behavioral nudge, not a full workflow.
 * Examples:
 *   "Always run tests before committing"
 *   "Prefer composition over inheritance"
 *   "Use early returns to reduce nesting"
 */

// ── Types ──

export interface Instinct {
	id: string;
	rule: string; // The behavioral rule (1-5 lines max)
	confidence: number; // 0.0-1.0, how well this instinct has performed
	source: "user" | "learned" | "imported" | "built-in";
	tags: string[];
	createdAt: string;
	usedCount: number;
	lastUsedAt: string | null;
}

export interface InstinctCollection {
	version: string;
	project: string;
	instincts: Instinct[];
}

// ── Constants ──

const MAX_RULE_LINES = 5;
const MAX_RULE_CHARS = 500;

// ── Validation ──

export function validateRule(rule: string): {
	valid: boolean;
	reason?: string;
} {
	const trimmed = rule.trim();
	if (!trimmed) return { valid: false, reason: "Rule cannot be empty" };
	if (trimmed.length > MAX_RULE_CHARS) {
		return {
			valid: false,
			reason: `Rule exceeds ${MAX_RULE_CHARS} chars (${trimmed.length}). Instincts should be brief.`,
		};
	}
	const lines = trimmed.split("\n").filter((l) => l.trim());
	if (lines.length > MAX_RULE_LINES) {
		return {
			valid: false,
			reason: `Rule has ${lines.length} lines (max ${MAX_RULE_LINES}). Use a full skill for complex rules.`,
		};
	}
	return { valid: true };
}

// ── Creation ──

let _counter = 0;

export function createInstinct(params: {
	rule: string;
	source?: Instinct["source"];
	tags?: string[];
	confidence?: number;
}): Instinct {
	_counter++;
	return {
		id: `inst-${Date.now()}-${_counter}`,
		rule: params.rule.trim(),
		confidence: params.confidence ?? 0.5,
		source: params.source ?? "user",
		tags: params.tags ?? [],
		createdAt: new Date().toISOString(),
		usedCount: 0,
		lastUsedAt: null,
	};
}

// ── Collection management ──

export function createCollection(project: string): InstinctCollection {
	return { version: "1.0.0", project, instincts: [] };
}

export function addInstinct(
	collection: InstinctCollection,
	instinct: Instinct,
): void {
	collection.instincts.push(instinct);
}

export function removeInstinct(
	collection: InstinctCollection,
	id: string,
): boolean {
	const idx = collection.instincts.findIndex((i) => i.id === id);
	if (idx === -1) return false;
	collection.instincts.splice(idx, 1);
	return true;
}

export function findByTag(
	collection: InstinctCollection,
	tag: string,
): Instinct[] {
	return collection.instincts.filter((i) => i.tags.includes(tag));
}

export function recordUsage(instinct: Instinct): void {
	instinct.usedCount++;
	instinct.lastUsedAt = new Date().toISOString();
}

export function boostConfidence(instinct: Instinct, delta = 0.1): void {
	instinct.confidence = Math.min(1.0, instinct.confidence + delta);
}

export function penalizeConfidence(instinct: Instinct, delta = 0.1): void {
	instinct.confidence = Math.max(0.0, instinct.confidence - delta);
}

export function getActiveInstincts(
	collection: InstinctCollection,
	minConfidence = 0.3,
): Instinct[] {
	return collection.instincts
		.filter((i) => i.confidence >= minConfidence)
		.sort((a, b) => b.confidence - a.confidence);
}

// ── Serialization ──

export function toJSON(collection: InstinctCollection): string {
	return JSON.stringify(collection, null, 2);
}

export function fromJSON(json: string): InstinctCollection {
	return JSON.parse(json) as InstinctCollection;
}

// ── Formatting ──

export function formatInstincts(instincts: Instinct[]): string {
	if (instincts.length === 0) return "No active instincts.\n";
	return instincts
		.map(
			(i) =>
				`[${(i.confidence * 100).toFixed(0)}%] ${i.rule}${i.tags.length ? ` (${i.tags.join(", ")})` : ""}`,
		)
		.join("\n");
}
