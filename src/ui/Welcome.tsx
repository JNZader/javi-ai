import { Box, Text } from "ink";
import React, { useEffect } from "react";
import Header from "./Header.js";
import { theme } from "./theme.js";

interface Props {
	onDone: () => void;
}

export default function Welcome({ onDone }: Props) {
	useEffect(() => {
		const timer = setTimeout(onDone, 1500);
		return () => clearTimeout(timer);
	}, [onDone]);

	return (
		<Box flexDirection="column" padding={1}>
			<Header />

			<Box flexDirection="column" marginTop={1} marginLeft={2}>
				<Text>Supercharge your AI coding CLIs with:</Text>
				<Box marginTop={1} flexDirection="column">
					<Text>
						<Text color={theme.accent}>◆ Skills </Text>
						<Text color={theme.muted}> 35 curated coding patterns</Text>
					</Text>
					<Text>
						<Text color={theme.primary}>◆ SDD </Text>
						<Text color={theme.muted}> Spec-Driven Development workflow</Text>
					</Text>
					<Text>
						<Text color={theme.success}>◆ Memory </Text>
						<Text color={theme.muted}> Persistent context via engram</Text>
					</Text>
					<Text>
						<Text color={theme.warning}>◆ Agents </Text>
						<Text color={theme.muted}> Domain orchestrators</Text>
					</Text>
				</Box>
				<Box marginTop={1}>
					<Text color={theme.muted} dimColor>
						Detecting your system...
					</Text>
				</Box>
			</Box>
		</Box>
	);
}
