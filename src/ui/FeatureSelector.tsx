import { Box, Text, useInput } from "ink";
import React, { useState } from "react";
import type { CLI, Feature } from "../types/index.js";
import { theme } from "./theme.js";

const FEATURES: { id: Feature; label: string; description: string }[] = [
	{
		id: "skills",
		label: "Skills",
		description: "Upstream + own skills (SKILL.md files)",
	},
	{
		id: "orchestrators",
		label: "Orchestrators",
		description: "Domain orchestrators and agents",
	},
	{
		id: "configs",
		label: "Configs",
		description: "CLI configurations (CLAUDE.md, opencode.json, etc.)",
	},
	{ id: "hooks", label: "Hooks", description: "Post-tool hooks (Claude only)" },
	{
		id: "plugins",
		label: "Plugins",
		description: "Optional plugins (Claude only)",
	},
	{
		id: "agents",
		label: "PSF Agents (90+)",
		description: "Full specialist agent library",
	},
];

interface Props {
	selectedClis: CLI[];
	initialFeatures?: Feature[];
	onConfirm: (features: Feature[]) => void;
}

export default function FeatureSelector({
	selectedClis,
	initialFeatures,
	onConfirm,
}: Props) {
	const [cursor, setCursor] = useState(0);
	const [selected, setSelected] = useState<Set<Feature>>(
		new Set(initialFeatures ?? ["skills", "orchestrators", "configs", "hooks"]),
	);

	useInput((input, key) => {
		if (key.upArrow) setCursor((c) => Math.max(0, c - 1));
		if (key.downArrow) setCursor((c) => Math.min(FEATURES.length - 1, c + 1));
		if (input === " ") {
			const feature = FEATURES[cursor].id;
			setSelected((prev) => {
				const next = new Set(prev);
				next.has(feature) ? next.delete(feature) : next.add(feature);
				return next;
			});
		}
		if (key.return) onConfirm([...selected]);
	});

	return (
		<Box flexDirection="column">
			<Text bold>Select features to install:</Text>
			<Text color={theme.muted} dimColor>
				{" "}
				CLIs: {selectedClis.join(", ")}
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
				{FEATURES.map((f, i) => (
					<Box key={f.id}>
						<Text color={i === cursor ? theme.primary : "white"}>
							{i === cursor ? "▶ " : "  "}
							{selected.has(f.id) ? "◉" : "○"} {f.label}
						</Text>
						<Text color={theme.muted} dimColor>
							{" "}
							{f.description}
						</Text>
					</Box>
				))}
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
