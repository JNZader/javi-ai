import { Box, useApp } from "ink";
import React, { useEffect, useState } from "react";
import { AUTONOMY_LEVELS, DEFAULT_AUTONOMY_LEVEL } from "../constants.js";
import { runInstall } from "../installer/index.js";
import type {
	AutonomyLevel,
	CLI,
	Feature,
	InstallStep,
} from "../types/index.js";
import AutonomySelector from "./AutonomySelector.js";
import CLISelector from "./CLISelector.js";
import FeatureSelector from "./FeatureSelector.js";
import Header from "./Header.js";
import Progress from "./Progress.js";
import Summary from "./Summary.js";
import Welcome from "./Welcome.js";

type Stage =
	| "welcome"
	| "select-cli"
	| "select-autonomy"
	| "select-features"
	| "installing"
	| "done";

const DEFAULT_FEATURES: Feature[] = [
	"skills",
	"orchestrators",
	"configs",
	"hooks",
];

interface AppProps {
	dryRun?: boolean;
	preselectedClis?: CLI[];
	skillFilter?: string[];
	autoConfirm?: boolean;
}

export default function App({
	dryRun = false,
	preselectedClis,
	skillFilter,
	autoConfirm = false,
}: AppProps) {
	const { exit } = useApp();
	const [stage, setStage] = useState<Stage>(
		autoConfirm && preselectedClis
			? "installing"
			: preselectedClis
				? "select-autonomy"
				: "welcome",
	);
	const [selectedClis, setSelectedClis] = useState<CLI[]>(
		preselectedClis ?? [],
	);
	const [selectedFeatures, setSelectedFeatures] =
		useState<Feature[]>(DEFAULT_FEATURES);
	const [selectedAutonomy, setSelectedAutonomy] = useState<AutonomyLevel>(
		DEFAULT_AUTONOMY_LEVEL,
	);
	const [steps, setSteps] = useState<InstallStep[]>([]);
	const [startTime] = useState<number>(Date.now());

	// Auto-confirm: run install immediately when entering 'installing' stage
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
	useEffect(() => {
		if (stage === "installing" && autoConfirm) {
			void doInstall(DEFAULT_FEATURES, DEFAULT_AUTONOMY_LEVEL);
		}
	}, []);

	const doInstall = async (
		features: Feature[],
		autonomyLevel: AutonomyLevel,
	) => {
		setSelectedFeatures(features);
		setSelectedAutonomy(autonomyLevel);
		setStage("installing");

		await runInstall(
			{
				clis: selectedClis,
				features,
				dryRun,
				backup: true,
				autonomyLevel,
				skillFilter,
			},
			(step) =>
				setSteps((prev) => {
					const idx = prev.findIndex((s) => s.id === step.id);
					if (idx >= 0) {
						const next = [...prev];
						next[idx] = step;
						return next;
					}
					return [...prev, step];
				}),
		);

		setStage("done");
		if (autoConfirm) exit();
	};

	const handleCLIConfirm = (clis: CLI[]) => {
		setSelectedClis(clis);
		setStage("select-autonomy");
	};

	const handleAutonomyConfirm = (level: AutonomyLevel) => {
		setSelectedAutonomy(level);
		const levelDef = AUTONOMY_LEVELS.find((l) => l.id === level);
		if (levelDef) {
			setSelectedFeatures(levelDef.features);
		}
		setStage("select-features");
	};

	const handleFeatureConfirm = async (features: Feature[]) => {
		await doInstall(features, selectedAutonomy);
	};

	const subtitle =
		stage === "installing"
			? "installing..."
			: stage === "done"
				? "complete"
				: undefined;

	return (
		<Box flexDirection="column" padding={1}>
			{stage !== "welcome" && <Header subtitle={subtitle} dryRun={dryRun} />}

			{stage === "welcome" && <Welcome onDone={() => setStage("select-cli")} />}
			{stage === "select-cli" && <CLISelector onConfirm={handleCLIConfirm} />}
			{stage === "select-autonomy" && (
				<AutonomySelector onConfirm={handleAutonomyConfirm} />
			)}
			{stage === "select-features" && (
				<FeatureSelector
					selectedClis={selectedClis}
					initialFeatures={selectedFeatures}
					onConfirm={handleFeatureConfirm}
				/>
			)}
			{stage === "installing" && (
				<Progress
					steps={steps}
					selectedClis={selectedClis}
					onDone={() => setStage("done")}
				/>
			)}
			{stage === "done" && (
				<Summary
					steps={steps}
					dryRun={dryRun}
					selectedClis={selectedClis}
					elapsedMs={Date.now() - startTime}
					autoExit={autoConfirm}
				/>
			)}
		</Box>
	);
}
