import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

function defaultReadFile(path) {
	return readFileSync(path, "utf8");
}

export function evaluatePreToolUse(input) {
	const readFile = input.readFile ?? defaultReadFile;
	let policyText;
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
