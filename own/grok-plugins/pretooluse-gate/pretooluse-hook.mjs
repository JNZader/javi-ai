import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DENY_REASON = "PreToolUse policy is missing or unreadable";

function defaultReadFile(path) {
	return readFileSync(path, "utf8");
}

function evaluatePreToolUse(input) {
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

function decideGrokPreToolUse(input) {
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

function toolInputFromParsed(value) {
	if (value === undefined) {
		return undefined;
	}
	if (typeof value === "object" && value !== null) {
		return JSON.stringify(value);
	}
	return String(value);
}

function runGrokPreToolUseHook(stdinJson, policyPath) {
	let parsed;
	try {
		parsed = JSON.parse(stdinJson);
	} catch {
		return denyResult();
	}

	if (parsed === null || typeof parsed !== "object") {
		return denyResult();
	}

	const toolName = parsed.toolName;
	if (typeof toolName !== "string" || toolName.length === 0) {
		return denyResult();
	}

	const decision = decideGrokPreToolUse({
		toolName,
		toolInput: toolInputFromParsed(parsed.toolInput),
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

function resolvePolicyPath() {
	if (process.env.JAVI_AI_PRETOOLUSE_POLICY) {
		return process.env.JAVI_AI_PRETOOLUSE_POLICY;
	}
	if (process.env.GROK_PLUGIN_ROOT) {
		return join(process.env.GROK_PLUGIN_ROOT, "pretooluse.policy");
	}
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

try {
	const stdinJson = await readStdin();
	writeAndExit(runGrokPreToolUseHook(stdinJson, resolvePolicyPath()));
} catch {
	writeAndExit(denyResult());
}
