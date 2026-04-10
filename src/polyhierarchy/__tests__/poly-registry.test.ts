import { describe, expect, it } from "vitest";
import {
	type PolyContext,
	PolyRegistry,
	type SkillRef,
} from "../poly-registry.js";

describe("PolyRegistry", () => {
	// ── Registration ──

	it("registers a skill with one context", () => {
		const reg = new PolyRegistry();
		reg.register("adversarial-review", ["quality"]);
		expect(reg.getContextsFor("adversarial-review")).toEqual(["quality"]);
	});

	it("registers a skill with multiple contexts", () => {
		const reg = new PolyRegistry();
		reg.register("adversarial-review", ["quality", "workflow", "review"]);
		const contexts = reg.getContextsFor("adversarial-review");
		expect(contexts).toHaveLength(3);
		expect(contexts).toContain("quality");
		expect(contexts).toContain("workflow");
		expect(contexts).toContain("review");
	});

	it("deduplicates contexts on registration", () => {
		const reg = new PolyRegistry();
		reg.register("skill-a", ["quality", "quality", "review"]);
		expect(reg.getContextsFor("skill-a")).toHaveLength(2);
	});

	it("returns empty array for unregistered skill", () => {
		const reg = new PolyRegistry();
		expect(reg.getContextsFor("nope")).toEqual([]);
	});

	it("addContext appends without duplicating", () => {
		const reg = new PolyRegistry();
		reg.register("skill-a", ["quality"]);
		reg.addContext("skill-a", "workflow");
		reg.addContext("skill-a", "quality"); // duplicate
		expect(reg.getContextsFor("skill-a")).toEqual(["quality", "workflow"]);
	});

	it("addContext throws for unregistered skill", () => {
		const reg = new PolyRegistry();
		expect(() => reg.addContext("nope", "quality")).toThrow("not registered");
	});

	it("removeContext removes a context", () => {
		const reg = new PolyRegistry();
		reg.register("skill-a", ["quality", "workflow"]);
		reg.removeContext("skill-a", "quality");
		expect(reg.getContextsFor("skill-a")).toEqual(["workflow"]);
	});

	it("removeContext is no-op for non-existent context", () => {
		const reg = new PolyRegistry();
		reg.register("skill-a", ["quality"]);
		reg.removeContext("skill-a", "nope");
		expect(reg.getContextsFor("skill-a")).toEqual(["quality"]);
	});

	// ── Querying ──

	it("getSkillsInContext returns all skills in a context", () => {
		const reg = new PolyRegistry();
		reg.register("adversarial-review", ["quality", "workflow"]);
		reg.register("blast-radius", ["quality", "analysis"]);
		reg.register("debug-mode", ["workflow"]);

		const quality = reg.getSkillsInContext("quality");
		expect(quality).toHaveLength(2);
		expect(quality).toContain("adversarial-review");
		expect(quality).toContain("blast-radius");

		const workflow = reg.getSkillsInContext("workflow");
		expect(workflow).toHaveLength(2);
		expect(workflow).toContain("adversarial-review");
		expect(workflow).toContain("debug-mode");
	});

	it("getSkillsInContext returns empty for unknown context", () => {
		const reg = new PolyRegistry();
		expect(reg.getSkillsInContext("nope")).toEqual([]);
	});

	it("getAllContexts returns all unique contexts", () => {
		const reg = new PolyRegistry();
		reg.register("a", ["quality", "workflow"]);
		reg.register("b", ["workflow", "analysis"]);
		const all = reg.getAllContexts();
		expect(all).toHaveLength(3);
		expect(all).toContain("quality");
		expect(all).toContain("workflow");
		expect(all).toContain("analysis");
	});

	it("getAllSkills returns all registered skill names", () => {
		const reg = new PolyRegistry();
		reg.register("a", ["quality"]);
		reg.register("b", ["workflow"]);
		expect(reg.getAllSkills()).toEqual(["a", "b"]);
	});

	// ── Metadata ──

	it("register with metadata preserves it", () => {
		const reg = new PolyRegistry();
		reg.register("skill-a", ["quality"], {
			sourcePath: "/home/user/.claude/skills/skill-a/SKILL.md",
			version: "1.0.0",
		});
		const ref = reg.getRef("skill-a");
		expect(ref).toBeDefined();
		expect(ref!.metadata.sourcePath).toBe(
			"/home/user/.claude/skills/skill-a/SKILL.md",
		);
		expect(ref!.metadata.version).toBe("1.0.0");
	});

	it("getRef returns undefined for unregistered skill", () => {
		const reg = new PolyRegistry();
		expect(reg.getRef("nope")).toBeUndefined();
	});

	// ── Unregister ──

	it("unregister removes skill from all contexts", () => {
		const reg = new PolyRegistry();
		reg.register("skill-a", ["quality", "workflow"]);
		reg.unregister("skill-a");
		expect(reg.getContextsFor("skill-a")).toEqual([]);
		expect(reg.getSkillsInContext("quality")).toEqual([]);
		expect(reg.getSkillsInContext("workflow")).toEqual([]);
	});

	it("unregister is no-op for unregistered skill", () => {
		const reg = new PolyRegistry();
		expect(() => reg.unregister("nope")).not.toThrow();
	});

	// ── Serialization ──

	it("toJSON / fromJSON roundtrip preserves all data", () => {
		const reg = new PolyRegistry();
		reg.register("adversarial-review", ["quality", "workflow"], {
			sourcePath: "/path/to/skill",
			version: "2.0.0",
		});
		reg.register("debug-mode", ["workflow"], {
			sourcePath: "/path/to/debug",
		});

		const json = reg.toJSON();
		const restored = PolyRegistry.fromJSON(json);

		expect(restored.getAllSkills()).toEqual(reg.getAllSkills());
		expect(restored.getContextsFor("adversarial-review")).toEqual(
			reg.getContextsFor("adversarial-review"),
		);
		expect(restored.getRef("adversarial-review")?.metadata.version).toBe(
			"2.0.0",
		);
		expect(restored.toJSON()).toBe(json);
	});

	it("fromJSON with empty string returns empty registry", () => {
		const restored = PolyRegistry.fromJSON("[]");
		expect(restored.getAllSkills()).toEqual([]);
	});

	it("fromJSON with invalid JSON throws", () => {
		expect(() => PolyRegistry.fromJSON("{invalid")).toThrow();
	});

	// ── Context graph ──

	it("getContextGraph returns adjacency map of co-occurring contexts", () => {
		const reg = new PolyRegistry();
		reg.register("a", ["quality", "workflow"]);
		reg.register("b", ["quality", "analysis"]);
		reg.register("c", ["workflow"]);

		const graph = reg.getContextGraph();
		// quality co-occurs with workflow (via a) and analysis (via b)
		expect(graph.get("quality")).toContain("workflow");
		expect(graph.get("quality")).toContain("analysis");
		// workflow co-occurs with quality (via a)
		expect(graph.get("workflow")).toContain("quality");
		// analysis co-occurs with quality (via b)
		expect(graph.get("analysis")).toContain("quality");
	});
});
