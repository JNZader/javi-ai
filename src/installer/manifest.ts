import fs from "fs-extra";
import path from "path";
import { MANIFEST_PATH } from "../constants.js";
import type { Manifest } from "../types/index.js";

const DEFAULT_MANIFEST: Manifest = {
	version: "0.1.0",
	installedAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	clis: [],
	skills: {},
};

export async function readManifest(): Promise<Manifest> {
	try {
		const raw = await fs.readFile(MANIFEST_PATH, "utf-8");
		return JSON.parse(raw) as Manifest;
	} catch {
		return { ...DEFAULT_MANIFEST, clis: [], skills: {} };
	}
}

export async function writeManifest(manifest: Manifest): Promise<void> {
	await fs.ensureDir(path.dirname(MANIFEST_PATH));
	await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
}
