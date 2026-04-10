/**
 * Polyhierarchy registry — allows a skill to exist in multiple
 * contexts (categories) without file duplication. The single source
 * of truth stays in one location; contexts are metadata references.
 */

export type PolyContext = string;

export type SkillMetadata = {
	sourcePath?: string;
	version?: string;
	[key: string]: string | undefined;
};

export type SkillRef = {
	name: string;
	contexts: PolyContext[];
	metadata: SkillMetadata;
};

export class PolyRegistry {
	private refs: Map<string, SkillRef> = new Map();

	// ── Registration ──

	register(
		name: string,
		contexts: PolyContext[],
		metadata: SkillMetadata = {},
	): void {
		const unique = [...new Set(contexts)];
		this.refs.set(name, { name, contexts: unique, metadata });
	}

	addContext(name: string, context: PolyContext): void {
		const ref = this.refs.get(name);
		if (!ref) throw new Error(`Skill "${name}" not registered`);
		if (!ref.contexts.includes(context)) {
			ref.contexts.push(context);
		}
	}

	removeContext(name: string, context: PolyContext): void {
		const ref = this.refs.get(name);
		if (!ref) return;
		ref.contexts = ref.contexts.filter((c) => c !== context);
	}

	unregister(name: string): void {
		this.refs.delete(name);
	}

	// ── Querying ──

	getContextsFor(name: string): PolyContext[] {
		return this.refs.get(name)?.contexts ?? [];
	}

	getSkillsInContext(context: PolyContext): string[] {
		const result: string[] = [];
		for (const ref of this.refs.values()) {
			if (ref.contexts.includes(context)) {
				result.push(ref.name);
			}
		}
		return result;
	}

	getAllContexts(): PolyContext[] {
		const set = new Set<PolyContext>();
		for (const ref of this.refs.values()) {
			for (const ctx of ref.contexts) {
				set.add(ctx);
			}
		}
		return [...set];
	}

	getAllSkills(): string[] {
		return [...this.refs.keys()];
	}

	getRef(name: string): SkillRef | undefined {
		return this.refs.get(name);
	}

	/**
	 * Build a co-occurrence graph: for each context, which other contexts
	 * share at least one skill with it.
	 */
	getContextGraph(): Map<PolyContext, PolyContext[]> {
		const graph = new Map<PolyContext, Set<PolyContext>>();

		for (const ref of this.refs.values()) {
			for (const ctx of ref.contexts) {
				if (!graph.has(ctx)) graph.set(ctx, new Set());
				for (const other of ref.contexts) {
					if (other !== ctx) graph.get(ctx)!.add(other);
				}
			}
		}

		const result = new Map<PolyContext, PolyContext[]>();
		for (const [ctx, neighbors] of graph) {
			result.set(ctx, [...neighbors]);
		}
		return result;
	}

	// ── Serialization ──

	toJSON(): string {
		const entries: SkillRef[] = [];
		for (const ref of this.refs.values()) {
			entries.push(ref);
		}
		return JSON.stringify(entries);
	}

	static fromJSON(json: string): PolyRegistry {
		const entries = JSON.parse(json) as SkillRef[];
		const reg = new PolyRegistry();
		for (const entry of entries) {
			reg.refs.set(entry.name, entry);
		}
		return reg;
	}
}
