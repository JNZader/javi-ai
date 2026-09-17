import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluatePreToolUse } from "./evaluate-pretooluse.mjs";

const DENY_REASON = "PreToolUse policy is missing or unreadable";

function decideAgyPreToolUse(input) {
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

function runAgyPreToolUseHook(stdinJson, policyPath) {
	let parsed;
	try {
		parsed = JSON.parse(stdinJson);
	} catch {
		return JSON.stringify({ decision: "deny" });
	}

	if (parsed === null || typeof parsed !== "object") {
		return JSON.stringify({ decision: "deny" });
	}

	const toolCall = parsed.toolCall;
	if (toolCall === null || typeof toolCall !== "object") {
		return JSON.stringify({ decision: "deny" });
	}

	const toolName = toolCall.name;
	if (typeof toolName !== "string" || toolName.length === 0) {
		return JSON.stringify({ decision: "deny" });
	}

	const args = toolCall.args;
	const toolInput = args === undefined ? undefined : JSON.stringify(args);

	return JSON.stringify(
		decideAgyPreToolUse({
			toolName,
			toolInput,
			policyPath,
		}),
	);
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

const policyPath = process.env.JAVI_AI_PRETOOLUSE_POLICY || defaultPolicyPath();

try {
	const stdinJson = await readStdin();
	process.stdout.write(runAgyPreToolUseHook(stdinJson, policyPath));
	process.exit(0);
} catch {
	process.stdout.write(JSON.stringify({ decision: "deny" }));
	process.exit(0);
}
