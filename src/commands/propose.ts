import path from "node:path";
import chalk from "chalk";
import fs from "fs-extra";
import { CLAUDE_SKILLS_DIR, PROPOSED_DIR } from "../constants.js";

export async function runPropose(args: string[]): Promise<void> {
	const [subcommand, skillName] = args;

	if (!subcommand || subcommand === "list") {
		await listProposed();
	} else if (subcommand === "approve" && skillName) {
		await approveProposed(skillName);
	} else if (subcommand === "reject" && skillName) {
		await rejectProposed(skillName);
	} else {
		console.log(chalk.yellow("Usage:"));
		console.log("  javi-ai propose list");
		console.log("  javi-ai propose approve <skill-name>");
		console.log("  javi-ai propose reject <skill-name>");
	}
}

async function listProposed(): Promise<void> {
	await fs.ensureDir(PROPOSED_DIR);
	const files = await fs.readdir(PROPOSED_DIR);
	const proposals = files.filter((f) => f.endsWith(".md"));

	if (proposals.length === 0) {
		console.log(
			chalk.gray(
				"No proposed skills. Run /analyze-session to extract patterns.",
			),
		);
		return;
	}

	console.log(chalk.bold(`\nProposed skills (${proposals.length}):\n`));
	for (const file of proposals) {
		const name = file.replace(".md", "");
		console.log(`  ${chalk.cyan(name)}`);
		console.log(
			`    Approve: ${chalk.green(`javi-ai propose approve ${name}`)}`,
		);
		console.log(
			`    Reject:  ${chalk.red(`javi-ai propose reject ${name}`)}\n`,
		);
	}
}

async function approveProposed(skillName: string): Promise<void> {
	const srcPath = path.join(PROPOSED_DIR, `${skillName}.md`);
	if (!(await fs.pathExists(srcPath))) {
		console.error(chalk.red(`Proposed skill not found: ${skillName}`));
		process.exit(1);
	}

	const destDir = path.join(CLAUDE_SKILLS_DIR, skillName);
	await fs.ensureDir(destDir);
	await fs.copy(srcPath, path.join(destDir, "SKILL.md"));
	await fs.remove(srcPath);

	console.log(
		chalk.green(`✓ Installed: ~/.claude/skills/${skillName}/SKILL.md`),
	);
	console.log(chalk.gray("  Tip: reload Claude Code to activate the skill."));
}

async function rejectProposed(skillName: string): Promise<void> {
	const srcPath = path.join(PROPOSED_DIR, `${skillName}.md`);
	if (!(await fs.pathExists(srcPath))) {
		console.error(chalk.red(`Proposed skill not found: ${skillName}`));
		process.exit(1);
	}

	await fs.remove(srcPath);
	console.log(chalk.gray(`✗ Rejected and removed: ${skillName}`));
}
