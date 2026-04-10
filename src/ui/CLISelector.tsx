import { Box, Text, useInput } from "ink";
import { useMemo, useState } from "react";
import { CLI_OPTIONS } from "../constants.js";
import { detectAgents } from "../installer/agent-detector.js";
import type { CLI } from "../types/index.js";
import { theme } from "./theme.js";

interface Props {
	onConfirm: (clis: CLI[]) => void;
}

export default function CLISelector({ onConfirm }: Props) {
	const detection = useMemo(() => detectAgents(), []);
	const detectedIds = useMemo(
		() => new Set(detection.filter((d) => d.detected).map((d) => d.id)),
		[detection],
	);
	const detectionMap = useMemo(
		() => new Map(detection.map((d) => [d.id, d])),
		[detection],
	);

	const [cursor, setCursor] = useState(0);
	const [selected, setSelected] = useState<Set<CLI>>(
		() => new Set(detectedIds),
	);

	useInput((input, key) => {
		if (key.upArrow) setCursor((c) => Math.max(0, c - 1));
		if (key.downArrow)
			setCursor((c) => Math.min(CLI_OPTIONS.length - 1, c + 1));
		if (input === " ") {
			const cli = CLI_OPTIONS[cursor].id;
			setSelected((prev) => {
				const next = new Set(prev);
				next.has(cli) ? next.delete(cli) : next.add(cli);
				return next;
			});
		}
		if (key.return && selected.size > 0) {
			onConfirm([...selected]);
		}
	});

	const detectedCount = detectedIds.size;

	return (
		<Box flexDirection="column">
			<Text bold>Select AI CLIs to configure:</Text>
			<Text color={theme.muted} dimColor>
				{detectedCount} detected on your system (auto-selected)
			</Text>

			{/* Left-bordered list */}
			<Box
				marginTop={1}
				flexDirection="column"
				borderStyle="single"
				borderLeft
				borderRight={false}
				borderTop={false}
				borderBottom={false}
				borderColor={theme.muted}
				paddingLeft={1}
			>
				{CLI_OPTIONS.map((cli, i) => {
					const det = detectionMap.get(cli.id);
					const isDetected = det?.detected ?? false;
					const badge = isDetected
						? det?.reason === "binary"
							? " (bin)"
							: " (cfg)"
						: "";
					return (
						<Box key={cli.id} gap={1}>
							<Text color={i === cursor ? theme.primary : "white"}>
								{i === cursor ? "▶ " : "  "}
								{selected.has(cli.id) ? "◉" : "○"} {cli.label}
							</Text>
							{isDetected && (
								<Text color={theme.accent} dimColor>
									{badge}
								</Text>
							)}
						</Box>
					);
				})}
			</Box>

			{/* Count + hints */}
			<Box marginTop={1} gap={2}>
				<Text color={selected.size > 0 ? theme.accent : theme.muted}>
					{selected.size} selected
				</Text>
				<Text color={theme.muted} dimColor>
					↑↓ navigate Space select Enter confirm
				</Text>
			</Box>
		</Box>
	);
}
