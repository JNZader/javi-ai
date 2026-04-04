import { Box, Text, useApp, useInput } from "ink";
import Spinner from "ink-spinner";
import React, { useEffect, useState } from "react";
import { runSync } from "../commands/sync.js";
import type { SyncOptions, SyncStep } from "../types/index.js";
import Header from "./Header.js";
import Progress from "./Progress.js";
import { theme } from "./theme.js";

type Stage = "syncing" | "done";

interface SyncProps {
	options: SyncOptions;
	autoExit?: boolean;
}

export default function Sync({ options, autoExit = false }: SyncProps) {
	const { exit } = useApp();
	const [stage, setStage] = useState<Stage>("syncing");
	const [steps, setSteps] = useState<SyncStep[]>([]);
	const [startTime] = useState(Date.now());
	const [configDir, setConfigDir] = useState<string>("");

	useEffect(() => {
		runSync(options, (step) => {
			setSteps((prev) => {
				const idx = prev.findIndex((s) => s.id === step.id);
				if (idx >= 0) {
					const next = [...prev];
					next[idx] = step;
					return next;
				}
				return [...prev, step];
			});
		})
			.then((result) => {
				setConfigDir(result.configDir);
				setStage("done");
				if (autoExit) setTimeout(() => exit(), 50);
			})
			.catch(() => {
				setStage("done");
				if (autoExit) setTimeout(() => exit(), 50);
			});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useInput(
		(_, key) => {
			if (stage === "done" && (key.return || key.escape)) {
				exit();
			}
		},
		{ isActive: !autoExit },
	);

	const done = steps.filter((s) => s.status === "done").length;
	const errors = steps.filter((s) => s.status === "error");
	const skipped = steps.filter((s) => s.status === "skipped").length;
	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

	const subtitle = stage === "syncing" ? "syncing..." : "sync complete";

	return (
		<Box flexDirection="column" padding={1}>
			<Header subtitle={subtitle} dryRun={options.dryRun} />

			{stage === "syncing" && (
				<Box flexDirection="column">
					<Box marginBottom={1}>
						<Text color={theme.warning}>
							<Spinner type="dots" />
							{" Syncing AI config..."}
						</Text>
					</Box>
					<Progress steps={steps} onDone={() => setStage("done")} />
				</Box>
			)}

			{stage === "done" && (
				<Box flexDirection="column">
					{/* Title */}
					<Text bold color={errors.length > 0 ? theme.warning : theme.success}>
						{options.dryRun ? "○ Dry run complete" : "✓ Sync complete"}
						<Text color={theme.muted}> {elapsed}s</Text>
					</Text>

					{/* Config dir */}
					{configDir && (
						<Box marginTop={1}>
							<Text color={theme.muted}> Source: </Text>
							<Text color={theme.primary}>{configDir}</Text>
						</Box>
					)}

					{/* Options */}
					<Box marginTop={1} flexDirection="column">
						<Text color={theme.muted}>
							{" "}
							Target: <Text color={theme.primary}>{options.target}</Text>
						</Text>
						<Text color={theme.muted}>
							{" "}
							Mode: <Text color={theme.primary}>{options.mode}</Text>
						</Text>
					</Box>

					{/* Results */}
					<Box marginTop={1} flexDirection="column">
						{steps.map((step) => (
							<Box key={step.id} marginLeft={2}>
								<Text
									color={
										step.status === "done"
											? theme.success
											: step.status === "error"
												? theme.error
												: step.status === "skipped"
													? theme.muted
													: theme.warning
									}
								>
									{step.status === "done"
										? "✓"
										: step.status === "error"
											? "✗"
											: "–"}{" "}
									{step.label}
									{step.detail && (
										<Text color={theme.muted} dimColor>
											{" "}
											{step.detail}
										</Text>
									)}
								</Text>
							</Box>
						))}
					</Box>

					{/* Summary */}
					<Box marginTop={1}>
						<Text color={theme.success}> ✓ {done} done</Text>
						{skipped > 0 && (
							<Text color={theme.muted}> – {skipped} skipped</Text>
						)}
						{errors.length > 0 && (
							<Text color={theme.error}> ✗ {errors.length} errors</Text>
						)}
					</Box>

					{/* Exit hint */}
					<Box marginTop={1}>
						<Text color={theme.muted} dimColor>
							Press Enter to exit
						</Text>
					</Box>
				</Box>
			)}
		</Box>
	);
}
