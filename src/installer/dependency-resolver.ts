import type { SkillManifest } from "../types/index.js";

export class CircularDependencyError extends Error {
	constructor(public readonly chain: string[]) {
		super(`Circular dependency detected: ${chain.join(" → ")}`);
		this.name = "CircularDependencyError";
	}
}

/**
 * Topological sort (Kahn's BFS) for skill dependencies.
 * Returns skills in install order (dependencies first).
 * Throws CircularDependencyError if a cycle is detected.
 * Missing dependencies are warned and skipped (non-blocking).
 */
export function resolveDependencyOrder(
	requested: string[],
	availableSkills: Map<string, SkillManifest>,
): { ordered: string[]; missing: string[] } {
	const missing: string[] = [];
	const dependenciesBySkill = new Map<string, string[]>();
	const dependentsBySkill = new Map<string, string[]>();
	const inDegree = new Map<string, number>();

	// Build graph for requested skills + their transitive deps.
	const toVisit = [...requested];
	const visited = new Set<string>();

	while (toVisit.length > 0) {
		const skill = toVisit.pop()!;
		if (visited.has(skill)) continue;
		visited.add(skill);

		const manifest = availableSkills.get(skill);
		if (!manifest) {
			missing.push(skill);
			dependenciesBySkill.set(skill, []);
			inDegree.set(skill, inDegree.get(skill) ?? 0);
			continue;
		}

		const deps = (manifest.dependencies ?? []).filter((dep) => {
			if (!availableSkills.has(dep)) {
				missing.push(dep);
				return false;
			}
			return true;
		});

		dependenciesBySkill.set(skill, deps);
		inDegree.set(skill, deps.length);

		for (const dep of deps) {
			if (!dependentsBySkill.has(dep)) dependentsBySkill.set(dep, []);
			dependentsBySkill.get(dep)!.push(skill);
			if (!inDegree.has(dep)) inDegree.set(dep, 0);
			toVisit.push(dep);
		}
	}

	// Kahn's algorithm: start with nodes that have no dependencies.
	const queue = [...inDegree.entries()]
		.filter(([skill, degree]) => degree === 0 && visited.has(skill))
		.map(([skill]) => skill);

	const ordered: string[] = [];

	while (queue.length > 0) {
		const skill = queue.shift()!;
		ordered.push(skill);

		for (const dependent of dependentsBySkill.get(skill) ?? []) {
			const newDegree = (inDegree.get(dependent) ?? 1) - 1;
			inDegree.set(dependent, newDegree);
			if (newDegree === 0) queue.push(dependent);
		}
	}

	// Cycle detection.
	if (ordered.length < visited.size) {
		const cycle = [...visited].filter((skill) => !ordered.includes(skill));
		throw new CircularDependencyError(cycle);
	}

	return { ordered, missing: [...new Set(missing)] };
}
