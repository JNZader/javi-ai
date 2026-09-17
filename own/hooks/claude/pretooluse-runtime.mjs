import { pathToFileURL } from "node:url";
import { evaluatePreToolUse } from "./evaluate-pretooluse.mjs";

export { evaluatePreToolUse };

function isDirectCli() {
	const entry = process.argv[1];
	if (!entry) {
		return false;
	}
	try {
		return import.meta.url === pathToFileURL(entry).href;
	} catch {
		return false;
	}
}

if (isDirectCli()) {
	const policyPath = process.argv[2];
	if (!policyPath) {
		process.exit(2);
	}

	const decision = evaluatePreToolUse({
		event: {
			toolName: process.env.TOOL_NAME ?? "",
			toolInput: process.env.TOOL_INPUT,
		},
		policyPath,
		evaluatePolicy: () => "allow",
	});

	process.exit(decision === "deny" ? 2 : 0);
}
