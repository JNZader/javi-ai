import { Box, Text, useInput } from "ink";
import React, { useState } from "react";
import { AUTONOMY_LEVELS, DEFAULT_AUTONOMY_LEVEL } from "../constants.js";
import type { AutonomyLevel } from "../types/index.js";
import { theme } from "./theme.js";

interface Props {
	onConfirm: (level: AutonomyLevel) => void;
}

export default function AutonomySelector({ onConfirm }: Props) {
	const defaultIndex = AUTONOMY_LEVELS.findIndex(
		(l) => l.id === DEFAULT_AUTONOMY_LEVEL,
	);
	const [cursor, setCursor] = useState(defaultIndex >= 0 ? defaultIndex : 2);

	useInput((input, key) => {
		if (key.upArrow) setCursor((c) => Math.max(0, c - 1));
		if (key.downArrow)
			setCursor((c) => Math.min(AUTONOMY_LEVELS.length - 1, c + 1));
		if (key.return) onConfirm(AUTONOMY_LEVELS[cursor]!.id);
	});

	return (
		<Box flexDirection="column">
			<Text bold>Select autonomy level:</Text>
			<Text color={theme.muted} dimColor>
				{" "}
				How much authority should your AI assistant have?
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
				{AUTONOMY_LEVELS.map((level, i) => (
					<Box
						key={level.id}
						flexDirection="column"
						marginBottom={i < AUTONOMY_LEVELS.length - 1 ? 1 : 0}
					>
						<Box>
							<Text color={i === cursor ? theme.primary : "white"}>
								{i === cursor ? "▶ " : "  "}
								{i === cursor ? "◉" : "○"} {level.label}
							</Text>
						</Box>
						<Text color={theme.muted} dimColor>
							{"     "}
							{level.description}
						</Text>
					</Box>
				))}
			</Box>

			{/* Current selection hint */}
			<Box marginTop={1} gap={2}>
				<Text color={theme.accent}>
					{AUTONOMY_LEVELS[cursor]!.label}:{" "}
					{AUTONOMY_LEVELS[cursor]!.features.length} features
				</Text>
				<Text color={theme.muted} dimColor>
					↑↓ navigate Enter confirm
				</Text>
			</Box>
		</Box>
	);
}
