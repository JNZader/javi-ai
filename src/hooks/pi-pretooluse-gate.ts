import { evaluatePreToolUse } from "./pretooluse-runtime.js";

export function decidePiToolCall(input: {
	toolName: string;
	toolInput?: string;
	policyPath: string;
	readFile?: (path: string) => string;
}): { block: true; reason: string } | { block: false } {
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
		return {
			block: true,
			reason: "PreToolUse policy is missing or unreadable",
		};
	}

	return { block: false };
}
