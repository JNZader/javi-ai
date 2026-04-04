import fs from "fs-extra";

type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function deepMerge(target: JsonObject, source: JsonObject): JsonObject {
	const result = { ...target };
	for (const key of Object.keys(source)) {
		if (DANGEROUS_KEYS.has(key)) continue;
		const sv = source[key];
		const tv = target[key];
		if (
			sv !== null &&
			typeof sv === "object" &&
			!Array.isArray(sv) &&
			tv !== null &&
			typeof tv === "object" &&
			!Array.isArray(tv)
		) {
			result[key] = deepMerge(tv as JsonObject, sv as JsonObject);
		} else if (Array.isArray(sv) && Array.isArray(tv)) {
			// deduplicate by JSON value
			const merged = [...tv];
			for (const item of sv) {
				const itemStr = JSON.stringify(item);
				if (!merged.some((m) => JSON.stringify(m) === itemStr)) {
					merged.push(item);
				}
			}
			result[key] = merged;
		} else {
			result[key] = sv;
		}
	}
	return result;
}

export async function mergeJsonFile(
	targetPath: string,
	sourcePath: string,
	backupPath?: string,
): Promise<void> {
	const sourceContent = await fs.readFile(sourcePath, "utf-8");
	const source = JSON.parse(sourceContent) as JsonObject;

	if (await fs.pathExists(targetPath)) {
		if (backupPath) {
			await fs.copy(targetPath, backupPath);
		}
		const targetContent = await fs.readFile(targetPath, "utf-8");
		const target = JSON.parse(targetContent) as JsonObject;
		const merged = deepMerge(target, source);
		await fs.writeFile(targetPath, JSON.stringify(merged, null, 2), "utf-8");
	} else {
		await fs.ensureDir(targetPath.substring(0, targetPath.lastIndexOf("/")));
		await fs.copy(sourcePath, targetPath);
	}
}
