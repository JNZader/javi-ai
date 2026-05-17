import { describe, expect, it } from "vitest";
import type { SkillManifest } from "../types/index.js";
import {
	CircularDependencyError,
	resolveDependencyOrder,
} from "./dependency-resolver.js";

function skill(name: string, dependencies: string[] = []): SkillManifest {
	return {
		name,
		version: "0",
		source: "own",
		installedAt: "2026-05-17T00:00:00.000Z",
		dependencies,
	};
}

describe("resolveDependencyOrder", () => {
	it("orders dependencies before dependents when all skills are requested", () => {
		const available = new Map<string, SkillManifest>([
			["worktree-flow", skill("worktree-flow")],
			["cost-tracking", skill("cost-tracking")],
			["session-memory", skill("session-memory")],
			["sdd-explore", skill("sdd-explore")],
			["sdd-apply", skill("sdd-apply", ["worktree-flow", "cost-tracking"])],
		]);

		const result = resolveDependencyOrder([...available.keys()], available);

		expect(result.missing).toEqual([]);
		expect(result.ordered).toHaveLength(available.size);
		expect(result.ordered.indexOf("worktree-flow")).toBeLessThan(
			result.ordered.indexOf("sdd-apply"),
		);
		expect(result.ordered.indexOf("cost-tracking")).toBeLessThan(
			result.ordered.indexOf("sdd-apply"),
		);
	});

	it("adds transitive dependencies for filtered skills", () => {
		const available = new Map<string, SkillManifest>([
			["base", skill("base")],
			["middle", skill("middle", ["base"])],
			["top", skill("top", ["middle"])],
		]);

		const result = resolveDependencyOrder(["top"], available);

		expect(result.ordered).toEqual(["base", "middle", "top"]);
	});

	it("reports missing dependencies without blocking known skills", () => {
		const available = new Map<string, SkillManifest>([
			["top", skill("top", ["missing-skill"])],
		]);

		const result = resolveDependencyOrder(["top"], available);

		expect(result.ordered).toEqual(["top"]);
		expect(result.missing).toEqual(["missing-skill"]);
	});

	it("throws on actual cycles", () => {
		const available = new Map<string, SkillManifest>([
			["a", skill("a", ["b"])],
			["b", skill("b", ["a"])],
		]);

		expect(() => resolveDependencyOrder(["a"], available)).toThrow(
			CircularDependencyError,
		);
	});
});
