/**
 * Material 3 colour roles: a soft cool-grey page (#f5f5f8) with white cards and a white sidebar on it
 * (near-black and a step lighter in dark mode), and a muted violet as the one accent. One source for both the MUI palette
 * (theme.ts) and the `--md-sys-color-*` CSS variables used for roles MUI has no slot for, such as
 * the surface containers and the secondary/tertiary containers.
 *
 * Regenerate with Material Theme Builder for a different seed colour.
 */
type Roles = {
	surface: string;
	onSurface: string;
	onSurfaceVariant: string;
	surfaceDim: string;
	surfaceBright: string;
	surfaceContainerLowest: string;
	surfaceContainerLow: string;
	surfaceContainer: string;
	surfaceContainerHigh: string;
	surfaceContainerHighest: string;
	surfaceVariant: string;
	inverseSurface: string;
	inverseOnSurface: string;
	outline: string;
	outlineVariant: string;
	primary: string;
	onPrimary: string;
	primaryContainer: string;
	onPrimaryContainer: string;
	inversePrimary: string;
	secondary: string;
	onSecondary: string;
	secondaryContainer: string;
	onSecondaryContainer: string;
	tertiary: string;
	onTertiary: string;
	tertiaryContainer: string;
	onTertiaryContainer: string;
	error: string;
	onError: string;
	errorContainer: string;
	onErrorContainer: string;
};

export const M3_LIGHT: Roles = {
	surface: "#f5f5f8",
	onSurface: "#1b1b1f",
	onSurfaceVariant: "#5d5c66",
	surfaceDim: "#e2e1e8",
	surfaceBright: "#ffffff",
	surfaceContainerLowest: "#ffffff",
	surfaceContainerLow: "#ffffff",
	surfaceContainer: "#f1f0f6",
	surfaceContainerHigh: "#eae9f0",
	surfaceContainerHighest: "#e3e2ea",
	surfaceVariant: "#e2e1e9",
	inverseSurface: "#303034",
	inverseOnSurface: "#f3f2f7",
	outline: "#79787f",
	outlineVariant: "#dddce4",
	primary: "#5b4ec4",
	onPrimary: "#ffffff",
	primaryContainer: "#e7e3ff",
	onPrimaryContainer: "#1b1060",
	inversePrimary: "#c6bfff",
	secondary: "#5f5d70",
	onSecondary: "#ffffff",
	secondaryContainer: "#ebe8f8",
	onSecondaryContainer: "#26224a",
	tertiary: "#515e7d",
	onTertiary: "#ffffff",
	tertiaryContainer: "#d8e2ff",
	onTertiaryContainer: "#394764",
	error: "#ba1a1a",
	onError: "#ffffff",
	errorContainer: "#ffdad6",
	onErrorContainer: "#93000a",
};

export const M3_DARK: Roles = {
	surface: "#0f0f12",
	onSurface: "#e5e4ea",
	onSurfaceVariant: "#c6c5ce",
	surfaceDim: "#0f0f12",
	surfaceBright: "#303036",
	surfaceContainerLowest: "#0a0a0c",
	surfaceContainerLow: "#18181c",
	surfaceContainer: "#1e1e23",
	surfaceContainerHigh: "#25252b",
	surfaceContainerHighest: "#2d2d34",
	surfaceVariant: "#3c3b44",
	inverseSurface: "#e5e4ea",
	inverseOnSurface: "#303034",
	outline: "#8f8e97",
	outlineVariant: "#34333b",
	primary: "#c6bfff",
	onPrimary: "#2b1f7a",
	primaryContainer: "#42379e",
	onPrimaryContainer: "#e7e3ff",
	inversePrimary: "#5b4ec4",
	secondary: "#c8c5da",
	onSecondary: "#302d44",
	secondaryContainer: "#2f2c45",
	onSecondaryContainer: "#e7e3ff",
	tertiary: "#b8c6ea",
	onTertiary: "#22304c",
	tertiaryContainer: "#394764",
	onTertiaryContainer: "#d8e2ff",
	error: "#ffb4ab",
	onError: "#690005",
	errorContainer: "#93000a",
	onErrorContainer: "#ffdad6",
};

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** `{ "--md-sys-color-surface-container": "#e9eff0", ... }` */
export function colorVars(roles: Roles): Record<string, string> {
	return Object.fromEntries(
		Object.entries(roles).map(([name, value]) => [`--md-sys-color-${kebab(name)}`, value]),
	);
}

/** Accent hues for icon tiles (one hue per category). Tinted per colour mode where used. */
export const ACCENT = {
	violet: "#8B5CF6",
	orange: "#F97316",
	amber: "#EAB308",
	blue: "#3B82F6",
	green: "#10B981",
	lime: "#84CC16",
	pink: "#EC4899",
	slate: "#64748B",
} as const;
export type Accent = keyof typeof ACCENT;

/** Hues for the pastel stat tiles, each a soft wash over the card colour (`tintFill`) with its icon
 * in a deeper step (`tintInk`), so dark text reads on it in both colour modes. */
export const TINT = {
	blue: "#3B82F6",
	navy: "#6366F1",
	emerald: "#10B981",
	rose: "#F43F5E",
	violet: "#8B5CF6",
	amber: "#EAB308",
} as const;
export type Tint = keyof typeof TINT;

export const tintFill = (tint: Tint) =>
	`color-mix(in oklab, ${TINT[tint]} 14%, var(--md-sys-color-surface-container-low))`;
export const tintInk = (tint: Tint) =>
	`color-mix(in oklab, ${TINT[tint]} 75%, var(--md-sys-color-on-surface))`;
/** The tile's figure: the same hue, deep enough in light mode (pale enough in dark) to read as text. */
export const tintText = (tint: Tint) =>
	`color-mix(in oklab, ${TINT[tint]} 58%, var(--md-sys-color-on-surface))`;

/**
 * Chart colours, validated with the dataviz palette checker (lightness band, colour-blind
 * separation of the income/expense pair, contrast). Dark mode has its own, darker steps: the
 * same hues do not fit its lightness band. Income and expense are green and orange rather than
 * green and red, because red/green fail for deutan colour vision.
 */
export const CHART_LIGHT = { income: "#10B981", expense: "#F97316", line: "#3B82F6" } as const;
export const CHART_DARK = { income: "#059669", expense: "#EA580C", line: "#3B82F6" } as const;

/** `{ "--chart-income": "#10B981", ... }` */
export function chartVars(colors: Record<string, string>): Record<string, string> {
	return Object.fromEntries(
		Object.entries(colors).map(([name, value]) => [`--chart-${name}`, value]),
	);
}
