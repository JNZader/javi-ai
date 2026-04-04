import { Box, Text, useApp, useInput } from "ink";
import Spinner from "ink-spinner";
import { useCallback, useEffect, useState } from "react";
import {
	buildProgressBar,
	phaseProgress,
	runDashboard,
} from "../commands/dashboard.js";
import type { DashboardResult, SddChange, SddPhase } from "../types/index.js";
import Header from "./Header.js";
import { theme } from "./theme.js";

// TODO: wire engram data fetch in CLI entry point.
// The component currently calls runDashboard() which returns an empty shell
// unless SDD_CACHE_FILE env var points to a pre-populated JSON cache.

const PHASE_LABELS: Record<SddPhase, string> = {
	explore: "explore ",
	proposal: "propose ",
	spec: "spec    ",
	design: "design  ",
	tasks: "tasks   ",
	apply: "apply   ",
	verify: "verify  ",
	archive: "archive ",
};

function phaseColor(phase: SddPhase): string {
	if (phase === "archive") return theme.muted;
	if (phase === "verify") return theme.success;
	if (phase === "apply") return theme.warning;
	return theme.primary;
}

function statusLabel(change: SddChange): string {
	if (change.currentPhase === "archive") return "✅ done     ";
	if (change.awaitingApproval) return "⏸ awaiting ";
	return "▶ in prog  ";
}

function statusColor(change: SddChange): string {
	if (change.currentPhase === "archive") return theme.success;
	if (change.awaitingApproval) return theme.warning;
	return theme.primary;
}

/** Truncate a string to maxLen, padding/ellipsising as needed */
function col(s: string, maxLen: number): string {
	if (s.length > maxLen) return `${s.slice(0, maxLen - 1)}…`;
	return s.padEnd(maxLen);
}

interface DashboardProps {
	project?: string;
	autoExit?: boolean;
	/** Injected data — used in tests or when the caller pre-fetches engram data */
	initialData?: DashboardResult;
}

export default function Dashboard({
	project,
	autoExit = false,
	initialData,
}: DashboardProps) {
	const { exit } = useApp();
	const [result, setResult] = useState<DashboardResult | null>(
		initialData ?? null,
	);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(!initialData);

	const load = useCallback(() => {
		setLoading(true);
		setError(null);
		runDashboard(project)
			.then((r) => {
				setResult(r);
				setLoading(false);
				if (autoExit) setTimeout(() => exit(), 50);
			})
			.catch((e: unknown) => {
				setError(String(e));
				setLoading(false);
				if (autoExit) setTimeout(() => exit(), 50);
			});
	}, [project, autoExit, exit]);

	useEffect(() => {
		if (!initialData) load();
	}, [load, initialData]);

	useInput(
		(input, key) => {
			if (input.toLowerCase() === "r") load();
			if (input.toLowerCase() === "q" || key.return || key.escape) exit();
		},
		{ isActive: !autoExit },
	);

	const projectName = result?.project ?? project ?? "unknown";

	return (
		<Box flexDirection="column" padding={1}>
			<Header subtitle="sdd dashboard" />

			{/* Subtitle row */}
			<Box marginBottom={1}>
				<Text color={theme.muted}>project: </Text>
				<Text bold color={theme.primary}>
					{projectName}
				</Text>
				{!autoExit && <Text color={theme.muted}>{"   [r]efresh  [q]uit"}</Text>}
			</Box>

			{loading && (
				<Text color={theme.warning}>
					<Spinner type="dots" />
					{" Loading SDD changes..."}
				</Text>
			)}

			{error && <Text color={theme.error}>✗ Error: {error}</Text>}

			{result && (
				<Box flexDirection="column">
					{/* Table header */}
					<Text color={theme.muted}>
						{"  "}
						{col("Change", 28)}
						{"  "}
						{col("Phase", 9)}
						{"  "}
						{"Progress       "}
						{"  "}
						{"Status"}
					</Text>
					<Text color={theme.muted}>{`  ${"─".repeat(68)}`}</Text>

					{result.changes.length === 0 ? (
						<Box marginTop={1}>
							<Text color={theme.muted} dimColor>
								{"  No SDD changes found."}
							</Text>
							<Text color={theme.muted} dimColor>
								{" Set SDD_CACHE_FILE or wire engram fetch."}
							</Text>
						</Box>
					) : (
						result.changes.map((change) => {
							const { completed, total } = phaseProgress(change);
							const bar = buildProgressBar(completed, total, 8);
							return (
								<Box key={change.name}>
									<Text>
										{"  "}
										<Text>{col(change.name, 28)}</Text>
										{"  "}
										<Text color={phaseColor(change.currentPhase)}>
											{PHASE_LABELS[change.currentPhase]}
										</Text>
										{"  "}
										<Text color={theme.accent}>{bar}</Text>{" "}
										<Text color={theme.muted}>
											{`${String(completed).padStart(2)}/${String(total).padEnd(2)}`}
										</Text>
										{"  "}
										<Text color={statusColor(change) as any}>
											{statusLabel(change)}
										</Text>
									</Text>
								</Box>
							);
						})
					)}

					{/* Recent Activity */}
					{result.recentActivity.length > 0 && (
						<Box flexDirection="column" marginTop={1}>
							<Text color={theme.muted} bold>
								{"  Recent Activity"}
							</Text>
							<Text color={theme.muted}>{`  ${"─".repeat(68)}`}</Text>
							{result.recentActivity.slice(0, 5).map((entry, i) => (
								<Box key={`activity-${i}-${entry.change}-${entry.phase}`}>
									<Text color={theme.muted}>
										{"  "}
										{col(entry.change, 26)}
										{"  "}
										<Text color={phaseColor(entry.phase)}>
											{col(PHASE_LABELS[entry.phase].trim(), 9)}
										</Text>
										{"  "}
										{entry.timestamp.slice(0, 10)}
									</Text>
								</Box>
							))}
						</Box>
					)}
				</Box>
			)}

			{!loading && (
				<Box marginTop={1}>
					<Text color={theme.muted} dimColor>
						Press r to refresh, q to quit
					</Text>
				</Box>
			)}
		</Box>
	);
}
