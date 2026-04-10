#!/usr/bin/env node
import path from "node:path";
import { PassThrough } from "node:stream";
import { render } from "ink";
import meow from "meow";
import { runList } from "./commands/list.js";
import { runPropose } from "./commands/propose.js";
import {
	analyzeCommonGround,
	formatCommonGround,
} from "./common-ground/index.js";
import { HOME } from "./constants.js";
import { listVariants } from "./skill-variants/index.js";
import type { CLI, SyncMode, SyncTarget } from "./types/index.js";
import App from "./ui/App.js";
import Dashboard from "./ui/Dashboard.js";
import Doctor from "./ui/Doctor.js";
import Sync from "./ui/Sync.js";
import Uninstall from "./ui/Uninstall.js";
import Update from "./ui/Update.js";

const cli = meow(
	`
  Usage
    $ javi-ai [command] [options]

  Commands
    install     Install AI development layer (default)
    list        List all available skills grouped by source
    doctor      Show health report of current installation
    update      Re-install configured CLIs with fresh assets
    uninstall   Remove javi-ai managed files
    sync        Compile .ai-config/ into per-CLI config files
    dashboard   Show SDD change status dashboard
    propose     Manage proposed skills (list, approve, reject)
    common-ground  Surface project assumptions before coding
    variants       List available variants for a skill

  Options
    --dry-run       Preview without making changes
    --cli           Comma-separated list of CLIs (claude,opencode,gemini,qwen,codex,copilot)
    --skills        Comma-separated list of skills to install (cherry-pick)
    --yes           Non-interactive mode (auto-confirm, skip selectors)
    --version       Show version
    --help          Show this help

  Sync Options
    --target        CLI target: claude, opencode, gemini, codex, copilot, all (default: all)
    --mode          Sync mode: overwrite, merge (default: overwrite)
    --project-dir   Project directory to sync (default: .)

  Examples
    $ javi-ai
    $ javi-ai install --dry-run
    $ javi-ai install --cli claude,opencode
    $ javi-ai install --skills react-19,typescript
    $ javi-ai list
    $ javi-ai doctor
    $ javi-ai update
    $ javi-ai uninstall
    $ javi-ai sync
    $ javi-ai sync --target claude
    $ javi-ai sync --mode merge
    $ javi-ai sync --dry-run --project-dir /path/to/project
    $ javi-ai dashboard
    $ javi-ai dashboard --project my-project
    $ javi-ai propose list
    $ javi-ai propose approve <skill-name>
    $ javi-ai propose reject <skill-name>
`,
	{
		importMeta: import.meta,
		flags: {
			dryRun: { type: "boolean", default: false },
			yes: { type: "boolean", default: false, shortFlag: "y" },
			cli: { type: "string", default: "" },
			skills: { type: "string", default: "" },
			target: { type: "string", default: "all" },
			mode: { type: "string", default: "overwrite" },
			projectDir: { type: "string", default: "." },
			project: { type: "string", default: "" },
		},
	},
);

const subcommand = cli.input[0] ?? "install";

// When stdin doesn't support raw mode (pipes, subprocesses, CI), provide a fake
// stdin stream so Ink doesn't crash trying to enable raw mode on a non-TTY pipe.
const isTTY = process.stdin.isTTY === true;
const nonInteractive = cli.flags.yes || process.env.CI === "1" || !isTTY;
const fakeStdin = new PassThrough() as unknown as NodeJS.ReadStream;
Object.defineProperty(fakeStdin, "isTTY", { value: false });
const inkStdin = isTTY ? process.stdin : fakeStdin;

switch (subcommand) {
	case "doctor": {
		render(<Doctor autoExit={nonInteractive} />, {
			stdin: inkStdin,
			exitOnCtrlC: !nonInteractive,
		});
		break;
	}

	case "update": {
		render(<Update dryRun={cli.flags.dryRun} autoConfirm={nonInteractive} />, {
			stdin: inkStdin,
			exitOnCtrlC: !nonInteractive,
		});
		break;
	}

	case "uninstall": {
		render(<Uninstall autoConfirm={nonInteractive} />, {
			stdin: inkStdin,
			exitOnCtrlC: !nonInteractive,
		});
		break;
	}

	case "sync": {
		render(
			<Sync
				options={{
					target: cli.flags.target as SyncTarget,
					mode: cli.flags.mode as SyncMode,
					projectDir: cli.flags.projectDir,
					dryRun: cli.flags.dryRun,
				}}
				autoExit={nonInteractive}
			/>,
			{ stdin: inkStdin, exitOnCtrlC: !nonInteractive },
		);
		break;
	}

	case "dashboard": {
		render(
			<Dashboard
				project={cli.flags.project || undefined}
				autoExit={nonInteractive}
			/>,
			{ stdin: inkStdin, exitOnCtrlC: !nonInteractive },
		);
		break;
	}

	case "list": {
		await runList();
		break;
	}

	case "common-ground": {
		const dir = cli.input[1] ?? ".";
		const result = await analyzeCommonGround(dir);
		console.log(formatCommonGround(result));
		break;
	}

	case "variants": {
		const skillName = cli.input[1];
		if (!skillName) {
			console.error("Usage: javi-ai variants <skill-name>");
			process.exit(1);
		}
		const skillDir = path.join(HOME, ".claude", "skills", skillName);
		const vars = await listVariants(skillDir);
		if (vars.length === 0) {
			console.log(`No variants found for ${skillName}`);
		} else {
			console.log(`Variants for ${skillName}:`);
			for (const v of vars) {
				const badge = v.isDefault ? " (default)" : "";
				console.log(`  - ${v.name}${badge}: ${v.description}`);
			}
		}
		break;
	}

	case "propose": {
		await runPropose(cli.input.slice(1));
		break;
	}
	default: {
		const preselectedClis = cli.flags.cli
			? (cli.flags.cli.split(",").map((s) => s.trim()) as CLI[])
			: undefined;

		const skillFilter = cli.flags.skills
			? cli.flags.skills.split(",").map((s) => s.trim())
			: undefined;

		render(
			<App
				dryRun={cli.flags.dryRun}
				preselectedClis={preselectedClis}
				skillFilter={skillFilter}
				autoConfirm={nonInteractive}
			/>,
			{ stdin: inkStdin, exitOnCtrlC: !nonInteractive },
		);
		break;
	}
}
