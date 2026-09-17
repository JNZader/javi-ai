import { readFileSync } from "node:fs";

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
