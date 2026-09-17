import { evaluatePreToolUse } from "./pretooluse-runtime.js";

const DENY_REASON = "PreToolUse policy is missing or unreadable";

export function decideGrokPreToolUse(input: {
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

function toolInputFromParsed(value: unknown): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (typeof value === "object" && value !== null) {
		return JSON.stringify(value);
	}
	return String(value);
}

export function runGrokPreToolUseHook(
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

	const toolName = (parsed as { toolName?: unknown }).toolName;
	if (typeof toolName !== "string" || toolName.length === 0) {
		return denyResult();
	}

	const toolInput = toolInputFromParsed(
		(parsed as { toolInput?: unknown }).toolInput,
	);
	const decision = decideGrokPreToolUse({
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
