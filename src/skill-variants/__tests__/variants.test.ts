import fs from "fs-extra";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	listVariants,
	loadVariantContent,
	resolveVariant,
} from "../variants.js";

let tmpDir: string;

beforeEach(async () => {
	tmpDir = path.join(os.tmpdir(), `skill-variants-test-${Date.now()}`);
	await fs.ensureDir(tmpDir);
});

afterEach(async () => {
	await fs.remove(tmpDir);
});

async function createSkill(
	name: string,
	content: string,
	variants?: Record<string, string>,
) {
	const skillDir = path.join(tmpDir, name);
	await fs.ensureDir(skillDir);
	await fs.writeFile(path.join(skillDir, "SKILL.md"), content);

	if (variants) {
		const variantsDir = path.join(skillDir, "variants");
		await fs.ensureDir(variantsDir);
		for (const [varName, varContent] of Object.entries(variants)) {
			await fs.writeFile(path.join(variantsDir, `${varName}.md`), varContent);
		}
	}

	return skillDir;
}

describe("listVariants", () => {
	it("returns only default when no variants dir exists", async () => {
		const dir = await createSkill(
			"test-skill",
			"---\nname: test-skill\ndescription: A test\n---\n\n# Test",
		);
		const variants = await listVariants(dir);
		expect(variants).toHaveLength(1);
		expect(variants[0].name).toBe("default");
		expect(variants[0].isDefault).toBe(true);
		expect(variants[0].description).toBe("A test");
	});

	it("lists default plus variant files", async () => {
		const dir = await createSkill(
			"review",
			"---\nname: review\ndescription: Code review\n---\n\n# Review",
			{
				brutalist:
					"---\ndescription: Ultra-strict review\n---\n\n# Brutalist Review",
				mentor: "---\ndescription: Educational review\n---\n\n# Mentor Review",
			},
		);
		const variants = await listVariants(dir);
		expect(variants).toHaveLength(3);
		expect(variants.map((v) => v.name).sort()).toEqual([
			"brutalist",
			"default",
			"mentor",
		]);
	});

	it("skips non-md files in variants dir", async () => {
		const dir = await createSkill("test", "---\nname: test\n---\n\n# T");
		await fs.ensureDir(path.join(dir, "variants"));
		await fs.writeFile(
			path.join(dir, "variants", "notes.txt"),
			"not a variant",
		);
		await fs.writeFile(path.join(dir, "variants", "fast.md"), "# Fast variant");

		const variants = await listVariants(dir);
		expect(variants).toHaveLength(2);
		expect(variants.map((v) => v.name)).toContain("fast");
		expect(variants.map((v) => v.name)).not.toContain("notes");
	});

	it("returns empty array for non-existent dir", async () => {
		const variants = await listVariants(path.join(tmpDir, "nope"));
		expect(variants).toEqual([]);
	});

	it("uses fallback description for variants without frontmatter", async () => {
		const dir = await createSkill("plain", "---\nname: plain\n---\n\n# Plain", {
			quick: "# Quick mode - no frontmatter here",
		});
		const variants = await listVariants(dir);
		const quick = variants.find((v) => v.name === "quick");
		expect(quick?.description).toBe("quick variant");
	});
});

describe("resolveVariant", () => {
	it("resolves default variant to SKILL.md", async () => {
		const dir = await createSkill("test", "---\nname: test\n---\n\n# Test");
		const result = await resolveVariant(dir);
		expect(result?.variant).toBe("default");
		expect(result?.content).toContain("# Test");
	});

	it("resolves named variant from variants dir", async () => {
		const dir = await createSkill(
			"review",
			"---\nname: review\n---\n\n# Review",
			{ brutalist: "# Brutalist mode" },
		);
		const result = await resolveVariant(dir, "brutalist");
		expect(result?.variant).toBe("brutalist");
		expect(result?.content).toContain("# Brutalist");
	});

	it("returns null for non-existent variant", async () => {
		const dir = await createSkill("test", "---\nname: test\n---\n\n# Test");
		const result = await resolveVariant(dir, "nonexistent");
		expect(result).toBeNull();
	});

	it("returns null when SKILL.md missing for default", async () => {
		const emptyDir = path.join(tmpDir, "empty-skill");
		await fs.ensureDir(emptyDir);
		const result = await resolveVariant(emptyDir);
		expect(result).toBeNull();
	});

	it("includes skill name from directory", async () => {
		const dir = await createSkill(
			"my-skill",
			"---\nname: my-skill\n---\n\n# Content",
		);
		const result = await resolveVariant(dir);
		expect(result?.skillName).toBe("my-skill");
	});
});

describe("loadVariantContent", () => {
	it("loads default variant as-is", async () => {
		const content = "---\nname: test\n---\n\n# Test Skill";
		const dir = await createSkill("test", content);
		const loaded = await loadVariantContent(dir, "default");
		expect(loaded).toBe(content);
	});

	it("loads variant with own frontmatter as-is", async () => {
		const varContent =
			"---\nname: review-brutalist\ndescription: Harsh\n---\n\n# Harsh Review";
		const dir = await createSkill(
			"review",
			"---\nname: review\n---\n\n# Review",
			{ brutalist: varContent },
		);
		const loaded = await loadVariantContent(dir, "brutalist");
		expect(loaded).toBe(varContent);
	});

	it("inherits base frontmatter for variants without own", async () => {
		const dir = await createSkill(
			"review",
			"---\nname: review\ndescription: Code review\nversion: 1.0\n---\n\n# Review",
			{ brutalist: "# Brutalist Rules\n\nBe harsh." },
		);
		const loaded = await loadVariantContent(dir, "brutalist");
		expect(loaded).toContain("name: review");
		expect(loaded).toContain("variant: brutalist");
		expect(loaded).toContain("# Brutalist Rules");
	});

	it("returns null for non-existent variant", async () => {
		const dir = await createSkill("test", "---\nname: test\n---\n\n# Test");
		const loaded = await loadVariantContent(dir, "ghost");
		expect(loaded).toBeNull();
	});
});
