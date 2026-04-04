import { Box, Text, useApp, useInput } from "ink";
import Spinner from "ink-spinner";
import React, { useEffect, useState } from "react";
import type { UninstallItem, UninstallResult } from "../commands/uninstall.js";
import { buildUninstallPlan, runUninstall } from "../commands/uninstall.js";
import type { CLI } from "../types/index.js";
import Header from "./Header.js";
import { theme } from "./theme.js";

type Stage = "loading" | "confirm" | "uninstalling" | "done" | "no-install";

interface UninstallProps {
	autoConfirm?: boolean;
}

export default function Uninstall({ autoConfirm = false }: UninstallProps) {
	const { exit } = useApp();
	const [stage, setStage] = useState<Stage>("loading");
	const [clis, setClis] = useState<CLI[]>([]);
	const [items, setItems] = useState<UninstallItem[]>([]);
	const [result, setResult] = useState<UninstallResult | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		buildUninstallPlan()
			.then((plan) => {
				if (plan.clis.length === 0) {
					setStage("no-install");
					if (autoConfirm) setTimeout(() => exit(), 50);
				} else {
					setClis(plan.clis);
					setItems(plan.items);
					if (autoConfirm) {
						setStage("uninstalling");
					} else {
						setStage("confirm");
					}
				}
			})
			.catch((e) => {
				setError(String(e));
				setStage("no-install");
				if (autoConfirm) setTimeout(() => exit(), 50);
			});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Auto-confirm: start uninstall when plan is loaded
	useEffect(() => {
		if (stage === "uninstalling" && autoConfirm && items.length > 0) {
			void doUninstall();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stage, autoConfirm, items]);

	const doUninstall = async () => {
		setStage("uninstalling");
		try {
			const res = await runUninstall(items);
			setResult(res);
			setStage("done");
			if (autoConfirm) setTimeout(() => exit(), 50);
		} catch (e) {
			setError(String(e));
			setStage("done");
			if (autoConfirm) setTimeout(() => exit(), 50);
		}
	};

	useInput(
		(input, key) => {
			if (stage === "confirm") {
				if (input.toLowerCase() === "y" || key.return) {
					void doUninstall();
				} else if (input.toLowerCase() === "n" || key.escape) {
					exit();
				}
			}
			if (stage === "no-install" || stage === "done") {
				if (key.return || key.escape) exit();
			}
		},
		{ isActive: !autoConfirm },
	);

	const subtitle =
		stage === "uninstalling"
			? "uninstalling..."
			: stage === "done"
				? "complete"
				: "uninstall";

	return (
		<Box flexDirection="column" padding={1}>
			<Header subtitle={subtitle} />

			{stage === "loading" && (
				<Text color={theme.warning}>
					<Spinner type="dots" />
					{" Building uninstall plan..."}
				</Text>
			)}

			{stage === "no-install" && (
				<Box flexDirection="column">
					{error ? (
						<Text color={theme.error}>✗ Error: {error}</Text>
					) : (
						<Text color={theme.error}>✗ No javi-ai installation found.</Text>
					)}
					<Box marginTop={1}>
						<Text color={theme.muted} dimColor>
							Press Enter to exit
						</Text>
					</Box>
				</Box>
			)}

			{stage === "confirm" && (
				<Box flexDirection="column">
					<Text>
						The following will be removed for:{" "}
						<Text bold color={theme.primary}>
							{clis.join(", ")}
						</Text>
					</Text>
					<Box marginTop={1} flexDirection="column">
						{items.map((item, i) => (
							<Text key={i} color={theme.error}>
								{" "}
								✗ {item.label}
							</Text>
						))}
					</Box>
					<Box marginTop={1}>
						<Text color={theme.muted} dimColor>
							Note: Your AI CLIs (claude, opencode, etc.) will NOT be removed.
						</Text>
					</Box>
					<Box marginTop={1}>
						<Text>Continue? </Text>
						<Text bold color={theme.error}>
							[y/N]{" "}
						</Text>
					</Box>
				</Box>
			)}

			{stage === "uninstalling" && (
				<Text color={theme.warning}>
					<Spinner type="dots" />
					{" Removing javi-ai managed files..."}
				</Text>
			)}

			{stage === "done" && result && (
				<Box flexDirection="column">
					<Text
						bold
						color={result.errors.length > 0 ? theme.warning : theme.success}
					>
						Uninstall complete
					</Text>
					<Box marginTop={1} flexDirection="column">
						{result.removed.map((r, i) => (
							<Text key={i} color={theme.success}>
								{" "}
								✓ {r}
							</Text>
						))}
						{result.restored.map((r, i) => (
							<Text key={`r-${i}`} color={theme.primary}>
								{" "}
								↩ {r}
							</Text>
						))}
						{result.errors.map((e, i) => (
							<Text key={`e-${i}`} color={theme.error}>
								{" "}
								✗ {e}
							</Text>
						))}
					</Box>
					<Box marginTop={1}>
						<Text color={theme.muted} dimColor>
							Press Enter to exit
						</Text>
					</Box>
				</Box>
			)}

			{stage === "done" && error && !result && (
				<Box flexDirection="column">
					<Text color={theme.error}>✗ Uninstall failed: {error}</Text>
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
