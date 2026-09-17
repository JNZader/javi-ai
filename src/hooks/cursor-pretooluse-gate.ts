import { evaluatePreToolUse } from "./pretooluse-runtime.js";

const DENY_REASON = "PreToolUse policy is missing or unreadable";

export function decideCursorPreToolUse(input: {
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

function denyResult(): { stdout: string; exitCode: number } {
	return {
		stdout: JSON.stringify({ decision: "deny", reason: DENY_REASON }),
		exitCode: 2,
	};
}

function toolNameFromParsed(parsed: object): string | undefined {
	const camel = (parsed as { toolName?: unknown }).toolName;
	if (typeof camel === "string" && camel.length > 0) {
		return camel;
	}
	const snake = (parsed as { tool_name?: unknown }).tool_name;
	if (typeof snake === "string" && snake.length > 0) {
		return snake;
	}
	return undefined;
}

function toolInputFromParsed(value: unknown): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (typeof value === "object" && value !== null) {
		return JSON.stringify(value);
	}
	return String(value);
}

export function runCursorPreToolUseHook(
	stdinJson: string,
	policyPath: string,
): { stdout: string; exitCode: number } {
	let parsed: unknown;
	try {
		parsed = JSON.parse(stdinJson);
	} catch {
		return denyResult();
	}

	if (parsed === null || typeof parsed !== "object") {
		return denyResult();
	}

	const toolName = toolNameFromParsed(parsed);
	if (toolName === undefined) {
		return denyResult();
	}

	const record = parsed as { toolInput?: unknown; tool_input?: unknown };
	const toolInput = toolInputFromParsed(
		record.toolInput !== undefined ? record.toolInput : record.tool_input,
	);
	const decision = decideCursorPreToolUse({
		toolName,
		toolInput,
		policyPath,
	});

	if (decision.decision === "deny") {
		return {
			stdout: JSON.stringify(decision),
			exitCode: 2,
		};
	}

	return {
		stdout: JSON.stringify({ decision: "allow" }),
		exitCode: 0,
	};
}
