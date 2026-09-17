import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluatePreToolUse } from "./evaluate-pretooluse.mjs";

const DENY_REASON = "PreToolUse policy is missing or unreadable";

function decideCursorPreToolUse(input) {
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

function denyResult() {
	return {
		stdout: JSON.stringify({ decision: "deny", reason: DENY_REASON }),
		exitCode: 2,
	};
}

function toolNameFromParsed(parsed) {
	if (typeof parsed.toolName === "string" && parsed.toolName.length > 0) {
		return parsed.toolName;
	}
	if (typeof parsed.tool_name === "string" && parsed.tool_name.length > 0) {
		return parsed.tool_name;
	}
	return undefined;
}

function toolInputFromParsed(value) {
	if (value === undefined) {
		return undefined;
	}
	if (typeof value === "object" && value !== null) {
		return JSON.stringify(value);
	}
	return String(value);
}

function runCursorPreToolUseHook(stdinJson, policyPath) {
	let parsed;
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

	const toolInput = toolInputFromParsed(
		parsed.toolInput !== undefined ? parsed.toolInput : parsed.tool_input,
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

function defaultPolicyPath() {
	return join(dirname(fileURLToPath(import.meta.url)), "pretooluse.policy");
}

function readStdin() {
	return new Promise((resolve, reject) => {
		const chunks = [];
		process.stdin.setEncoding("utf8");
		process.stdin.on("data", (chunk) => {
			chunks.push(chunk);
		});
		process.stdin.on("end", () => {
			resolve(chunks.join(""));
		});
		process.stdin.on("error", reject);
	});
}

function writeAndExit(result) {
	process.stdout.write(result.stdout);
	process.exit(result.exitCode);
}

const policyPath = process.env.JAVI_AI_PRETOOLUSE_POLICY || defaultPolicyPath();

try {
	const stdinJson = await readStdin();
	writeAndExit(runCursorPreToolUseHook(stdinJson, policyPath));
} catch {
	writeAndExit(denyResult());
}
