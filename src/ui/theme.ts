export const theme = {
	primary: "cyan",
	success: "green",
	warning: "yellow",
	error: "red",
	muted: "gray",
	accent: "magenta",
} as const;

export type ThemeColor = (typeof theme)[keyof typeof theme];
