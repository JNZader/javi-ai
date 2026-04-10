import { Box } from "ink";
import React, { useEffect } from "react";
import { runList } from "../commands/list.js";
import Header from "./Header.js";

interface ListProps {
	autoExit?: boolean;
}

export default function List({ autoExit = false }: ListProps) {
	useEffect(() => {
		void runList().then(() => {
			if (autoExit) {
				process.exit(0);
			}
		});
	}, [autoExit]);

	return (
		<Box flexDirection="column" padding={1}>
			<Header subtitle="available skills" />
		</Box>
	);
}
