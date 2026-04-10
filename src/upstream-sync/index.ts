export type {
	SyncResult,
	SyncState,
	UpstreamSource,
} from "./sync.js";
export {
	generateGitHubAction,
	parseSourcesYaml,
	readSyncState,
	serializeSourcesYaml,
	syncAll,
	syncSource,
	writeSyncState,
} from "./sync.js";
