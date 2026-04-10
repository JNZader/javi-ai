import fs from "fs-extra";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	advanceStep,
	BUILTIN_CHAINS,
	createExecution,
	getChain,
	listChains,
	loadChainRegistry,
	parseChainRegistry,
} from "../chains.js";

let tmpDir: string;

beforeEach(async () => {
	tmpDir = path.join(os.tmpdir(), `workflow-chains-test-${Date.now()}`);
	await fs.ensureDir(tmpDir);
});

afterEach(async () => {
	await fs.remove(tmpDir);
});

describe("BUILTIN_CHAINS", () => {
	it("has feature-dev chain", () => {
		expect(BUILTIN_CHAINS["feature-dev"]).toBeDefined();
		expect(BUILTIN_CHAINS["feature-dev"].steps.length).toBeGreaterThan(0);
	});

	it("has quick-fix chain", () => {
		expect(BUILTIN_CHAINS["quick-fix"]).toBeDefined();
	});

	it("has quality-gate chain", () => {
		expect(BUILTIN_CHAINS["quality-gate"]).toBeDefined();
	});

	it("all chains have valid step structure", () => {
		for (const chain of Object.values(BUILTIN_CHAINS)) {
			for (const step of chain.steps) {
				expect(step.id).toBeTruthy();
				expect(step.skill).toBeTruthy();
				expect(step.description).toBeTruthy();
			}
		}
	});
});

describe("listChains", () => {
	it("lists builtin chains by default", () => {
		const chains = listChains();
		expect(chains.length).toBe(3);
		expect(chains.map((c) => c.name)).toContain("feature-dev");
	});

	it("lists from registry when provided", () => {
		const registry = {
			version: "1.0.0",
			chains: {
				custom: {
					name: "custom",
					description: "A custom chain",
					steps: [{ id: "s1", skill: "test", description: "Test" }],
				},
			},
		};
		const chains = listChains(registry);
		expect(chains).toHaveLength(1);
		expect(chains[0].name).toBe("custom");
		expect(chains[0].stepCount).toBe(1);
	});
});

describe("getChain", () => {
	it("finds builtin chain by name", () => {
		const chain = getChain("feature-dev");
		expect(chain).not.toBeNull();
		expect(chain?.name).toBe("feature-dev");
	});

	it("returns null for unknown chain", () => {
		expect(getChain("nonexistent")).toBeNull();
	});

	it("prefers registry over builtins", () => {
		const registry = {
			version: "1.0.0",
			chains: {
				"feature-dev": {
					name: "feature-dev",
					description: "Custom override",
					steps: [{ id: "s1", skill: "custom", description: "Custom" }],
				},
			},
		};
		const chain = getChain("feature-dev", registry);
		expect(chain?.description).toBe("Custom override");
	});
});

describe("createExecution", () => {
	it("creates initial execution state", () => {
		const chain = BUILTIN_CHAINS["quick-fix"];
		const exec = createExecution(chain);

		expect(exec.chain).toBe("quick-fix");
		expect(exec.currentStep).toBe(0);
		expect(exec.totalSteps).toBe(chain.steps.length);
		expect(exec.status).toBe("running");
		expect(exec.completed).toEqual([]);
		expect(exec.failed).toEqual([]);
	});
});

describe("advanceStep", () => {
	it("advances on success", () => {
		const chain = BUILTIN_CHAINS["quick-fix"];
		const exec = createExecution(chain);
		advanceStep(exec, true);

		expect(exec.currentStep).toBe(1);
		expect(exec.completed).toHaveLength(1);
		expect(exec.status).toBe("running");
	});

	it("stops on failure with stop policy", () => {
		const chain = BUILTIN_CHAINS["quick-fix"];
		const exec = createExecution(chain);
		advanceStep(exec, false, "stop");

		expect(exec.status).toBe("failed");
		expect(exec.failed).toHaveLength(1);
	});

	it("skips on failure with skip policy", () => {
		const chain = BUILTIN_CHAINS["quick-fix"];
		const exec = createExecution(chain);
		advanceStep(exec, false, "skip");

		expect(exec.status).toBe("running");
		expect(exec.skipped).toHaveLength(1);
		expect(exec.currentStep).toBe(1);
	});

	it("completes after all steps pass", () => {
		const chain = BUILTIN_CHAINS["quick-fix"];
		const exec = createExecution(chain);
		for (let i = 0; i < chain.steps.length; i++) {
			advanceStep(exec, true);
		}

		expect(exec.status).toBe("completed");
		expect(exec.completed).toHaveLength(chain.steps.length);
	});
});

describe("parseChainRegistry", () => {
	it("parses chain registry yaml", () => {
		const yaml = `version: "2.0.0"
chains:
  deploy:
    description: "Deploy pipeline"
    steps:
      - id: build
        skill: build-tool
        description: "Build the project"
      - id: test
        skill: test-runner
        description: "Run tests"
        onFailure: stop
`;
		const registry = parseChainRegistry(yaml);
		expect(registry.version).toBe("2.0.0");
		expect(registry.chains.deploy).toBeDefined();
		expect(registry.chains.deploy.steps).toHaveLength(2);
		expect(registry.chains.deploy.steps[0].id).toBe("build");
		expect(registry.chains.deploy.steps[0].skill).toBe("build-tool");
		expect(registry.chains.deploy.steps[1].onFailure).toBe("stop");
	});

	it("parses multiple chains", () => {
		const yaml = `chains:
  chain-a:
    description: "Chain A"
    steps:
      - id: s1
        skill: skill-a
        description: "Step 1"
  chain-b:
    description: "Chain B"
    steps:
      - id: s1
        skill: skill-b
        description: "Step 1"
`;
		const registry = parseChainRegistry(yaml);
		expect(Object.keys(registry.chains)).toHaveLength(2);
	});
});

describe("loadChainRegistry", () => {
	it("returns null for non-existent file", async () => {
		const result = await loadChainRegistry(path.join(tmpDir, "nope.yaml"));
		expect(result).toBeNull();
	});

	it("loads and parses registry file", async () => {
		const regPath = path.join(tmpDir, "chains.yaml");
		await fs.writeFile(
			regPath,
			`chains:
  test:
    description: "Test chain"
    steps:
      - id: s1
        skill: test
        description: "Test step"
`,
		);
		const result = await loadChainRegistry(regPath);
		expect(result).not.toBeNull();
		expect(result?.chains.test).toBeDefined();
	});
});
