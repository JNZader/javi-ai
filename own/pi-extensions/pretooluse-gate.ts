import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { fileURLToPath } from "node:url";
import { evaluatePreToolUse } from "./evaluate-pretooluse.mjs";

const defaultPolicyPath = fileURLToPath(
	new URL("./pretooluse.policy", import.meta.url),
);

function decidePiToolCall(input: {
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

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", (event) => {
		const policyPath =
			process.env.JAVI_AI_PRETOOLUSE_POLICY ?? defaultPolicyPath;
		const decision = decidePiToolCall({
			toolName: event.toolName,
			toolInput: JSON.stringify(event.input),
			policyPath,
		});
		if (decision.block) {
			return { block: true, reason: decision.reason };
		}
	});
}
