/**
 * Material 3 colour roles: neutral (grey) surfaces, so the page reads as clean white or black, with
 * MUI's default blue as the primary accent only (a theme picker can replace it later). One source for both the MUI palette
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
	surface: "#ffffff",
	onSurface: "#1a1b1e",
	onSurfaceVariant: "#47484c",
	surfaceDim: "#dcdce0",
	surfaceBright: "#ffffff",
	surfaceContainerLowest: "#ffffff",
	surfaceContainerLow: "#f6f6f8",
	surfaceContainer: "#f0f0f3",
	surfaceContainerHigh: "#eaeaed",
	surfaceContainerHighest: "#e4e4e8",
	surfaceVariant: "#e1e1e5",
	inverseSurface: "#2f3033",
	inverseOnSurface: "#f1f0f4",
	outline: "#77777b",
	outlineVariant: "#c9c9cd",
	primary: "#1976d2",
	onPrimary: "#ffffff",
	primaryContainer: "#d3e4ff",
	onPrimaryContainer: "#001c3b",
	inversePrimary: "#a5c8ff",
	secondary: "#5d5e62",
	onSecondary: "#ffffff",
	secondaryContainer: "#e4e4e8",
	onSecondaryContainer: "#1a1b1e",
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
	surface: "#0a0a0b",
	onSurface: "#e5e5e8",
	onSurfaceVariant: "#c4c4c8",
	surfaceDim: "#0a0a0b",
	surfaceBright: "#2e2e32",
	surfaceContainerLowest: "#050506",
	surfaceContainerLow: "#121214",
	surfaceContainer: "#17171a",
	surfaceContainerHigh: "#1f1f23",
	surfaceContainerHighest: "#28282c",
	surfaceVariant: "#3b3b40",
	inverseSurface: "#e5e5e8",
	inverseOnSurface: "#2f3033",
	outline: "#8e8e93",
	outlineVariant: "#3b3b40",
	primary: "#90caf9",
	onPrimary: "#0b2e4f",
	primaryContainer: "#0d4a8a",
	onPrimaryContainer: "#d3e4ff",
	inversePrimary: "#1976d2",
	secondary: "#c4c4c8",
	onSecondary: "#2e2e32",
	secondaryContainer: "#38383d",
	onSecondaryContainer: "#e5e5e8",
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

/** Deep two-stop gradients for stat cards: dark enough for white text in light and dark mode. */
export const GRADIENT = {
	blue: ["#1565c0", "#0d3c78"],
	navy: ["#24406b", "#0e4a8f"],
	emerald: ["#0f8a64", "#04483a"],
	rose: ["#b3263f", "#5f0f26"],
	violet: ["#6d4bd1", "#35207f"],
	amber: ["#b45309", "#6b2d04"],
} as const;
export type Gradient = keyof typeof GRADIENT;
