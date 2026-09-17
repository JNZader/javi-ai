import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { fileURLToPath } from "node:url";
import { decidePiToolCall } from "../../src/hooks/pi-pretooluse-gate.ts";

const defaultPolicyPath = fileURLToPath(
	new URL("./pretooluse.policy", import.meta.url),
);

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
