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
	const graph = new Map<string, string[]>(); // skill → its deps
	const inDegree = new Map<string, number>();

	// Build graph for requested skills + their transitive deps
	const toVisit = [...requested];
	const visited = new Set<string>();

	while (toVisit.length > 0) {
		const skill = toVisit.pop()!;
		if (visited.has(skill)) continue;
		visited.add(skill);

		const manifest = availableSkills.get(skill);
		if (!manifest) {
			missing.push(skill);
			graph.set(skill, []);
			inDegree.set(skill, inDegree.get(skill) ?? 0);
			continue;
		}

		const deps = (manifest.dependencies ?? []).filter((d) => {
			if (!availableSkills.has(d)) {
				missing.push(d);
				return false;
			}
			return true;
		});

		graph.set(skill, deps);
		inDegree.set(skill, inDegree.get(skill) ?? 0);

		for (const dep of deps) {
			inDegree.set(dep, (inDegree.get(dep) ?? 0) + 1);
			toVisit.push(dep);
		}
	}

	// Kahn's algorithm
	const queue = [...inDegree.entries()]
		.filter(([, deg]) => deg === 0)
		.map(([skill]) => skill);

	const ordered: string[] = [];

	while (queue.length > 0) {
		const skill = queue.shift()!;
		ordered.push(skill);

		for (const dependent of [...graph.entries()]
			.filter(([, deps]) => deps.includes(skill))
			.map(([s]) => s)) {
			const newDeg = (inDegree.get(dependent) ?? 1) - 1;
			inDegree.set(dependent, newDeg);
			if (newDeg === 0) queue.push(dependent);
		}
	}

	// Cycle detection
	if (ordered.length < visited.size) {
		const cycle = [...visited].filter((s) => !ordered.includes(s));
		throw new CircularDependencyError(cycle);
	}

	return { ordered, missing: [...new Set(missing)] };
}
