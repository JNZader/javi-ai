import { readFileSync } from "node:fs";

export type PreToolUseDecision = "allow" | "deny";

export interface PreToolUseEvent {
	toolName: string;
	toolInput?: string;
}

export interface EvaluatePreToolUseInput {
	event: PreToolUseEvent;
	policyPath: string;
	readFile?: (path: string) => string;
	evaluatePolicy?: (
		policyText: string,
		event: PreToolUseEvent,
	) => PreToolUseDecision;
}

function defaultReadFile(path: string): string {
	return readFileSync(path, "utf8");
}

export function evaluatePreToolUse(
	input: EvaluatePreToolUseInput,
): PreToolUseDecision {
	const readFile = input.readFile ?? defaultReadFile;
	let policyText: string;
	try {
		policyText = readFile(input.policyPath);
	} catch {
		return "deny";
	}

	if (input.evaluatePolicy === undefined) {
		return "deny";
	}

	try {
		return input.evaluatePolicy(policyText, input.event);
	} catch {
		return "deny";
	}
}
