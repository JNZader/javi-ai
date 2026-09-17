import { evaluatePreToolUse } from "./pretooluse-runtime.js";

const DENY_REASON = "PreToolUse policy is missing or unreadable";

export function decideAgyPreToolUse(input: {
	toolName: string;
	toolInput?: string;
	policyPath: string;
	readFile?: (path: string) => string;
}): { decision: "allow" | "deny"; reason?: string } {
	const decision = evaluatePreToolUse({
		event: {
			toolName: input.toolName,
			toolInput: input.toolInput,
		},
		policyPath: input.policyPath,
		readFile: input.readFile,
		evaluatePolicy: () => "allow",
	});

	if (decision === "deny") {
		return { decision: "deny", reason: DENY_REASON };
	}

	return { decision: "allow" };
}

export function runAgyPreToolUseHook(
	stdinJson: string,
	policyPath: string,
): string {
	let parsed: unknown;
	try {
		parsed = JSON.parse(stdinJson);
	} catch {
		return JSON.stringify({ decision: "deny" });
	}

	if (parsed === null || typeof parsed !== "object") {
		return JSON.stringify({ decision: "deny" });
	}

	const toolCall = (parsed as { toolCall?: unknown }).toolCall;
	if (toolCall === null || typeof toolCall !== "object") {
		return JSON.stringify({ decision: "deny" });
	}

	const toolName = (toolCall as { name?: unknown }).name;
	if (typeof toolName !== "string" || toolName.length === 0) {
		return JSON.stringify({ decision: "deny" });
	}

	const args = (toolCall as { args?: unknown }).args;
	const toolInput = args === undefined ? undefined : JSON.stringify(args);

	return JSON.stringify(
		decideAgyPreToolUse({
			toolName,
			toolInput,
			policyPath,
		}),
	);
}
