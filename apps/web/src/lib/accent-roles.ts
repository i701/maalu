import { ACCENT, type Accent, isAccent } from "#/lib/m3";

/** Every accent name. */
export const ACCENT_NAMES = Object.keys(ACCENT).filter(isAccent);

/**
 * Each page's accent (its nav colour, `ACCENT` in m3.ts) as the primary family of colour roles, so the
 * page takes on its own colour the way M3's dynamic colour does: the hue comes from the accent and
 * every role sits at a fixed tone, so contrast is the same for all of them. Slate has little chroma
 * of its own and stays grey. Only primary, its container, `inverse-primary` and the secondary
 * container follow; error, status and chart colours and the brand button do not.
 */

const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp = (x: number) => Math.min(1, Math.max(0, x));

export function hexToRgb(hex: string): [number, number, number] {
	const n = Number.parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A colour's hue (degrees) and chroma in OKLCH. */
export function hueAndChroma(hex: string): { hue: number; chroma: number } {
	const [red, green, blue] = hexToRgb(hex);
	const r = lin(red / 255);
	const g = lin(green / 255);
	const b = lin(blue / 255);
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
	return { hue: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360, chroma: Math.hypot(a, bb) };
}

const channel = (v: number) => Math.round(gam(clamp(v)) * 255);

/** OKLCH to sRGB, each channel 0-255; a colour outside sRGB is clipped. */
export function oklchToRgb(L: number, C: number, hue: number): [number, number, number] {
	const a = C * Math.cos((hue * Math.PI) / 180);
	const b = C * Math.sin((hue * Math.PI) / 180);
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		channel(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
		channel(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
		channel(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
	];
}

const toHex = (rgb: readonly number[]) =>
	`#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;

/** [lightness, chroma] of each role, light then dark scheme. */
const TONES = {
	light: {
		primary: [0.5, 0.13],
		onPrimary: [1, 0],
		primaryContainer: [0.93, 0.04],
		onPrimaryContainer: [0.28, 0.07],
		inversePrimary: [0.8, 0.1],
		secondaryContainer: [0.94, 0.03],
		onSecondaryContainer: [0.3, 0.06],
		// the lighter and darker steps MUI wants beside the main colour
		primaryLight: [0.62, 0.12],
		primaryDark: [0.4, 0.12],
	},
	dark: {
		primary: [0.8, 0.11],
		onPrimary: [0.3, 0.08],
		primaryContainer: [0.38, 0.08],
		onPrimaryContainer: [0.92, 0.04],
		inversePrimary: [0.5, 0.13],
		secondaryContainer: [0.3, 0.05],
		onSecondaryContainer: [0.92, 0.03],
		primaryLight: [0.88, 0.09],
		primaryDark: [0.68, 0.11],
	},
} as const;

type Role = keyof typeof TONES.light;

/** The hex of every role of an accent, for one colour scheme. */
export function accentRoles(accent: Accent, scheme: "light" | "dark"): Record<Role, string> {
	const { hue, chroma } = hueAndChroma(ACCENT[accent]);
	const k = Math.min(1, chroma / 0.13); // a grey accent keeps its roles grey
	const at = (role: Role) => {
		const [L, C] = TONES[scheme][role];
		return toHex(oklchToRgb(L, C * k, hue));
	};
	return {
		primary: at("primary"),
		onPrimary: at("onPrimary"),
		primaryContainer: at("primaryContainer"),
		onPrimaryContainer: at("onPrimaryContainer"),
		inversePrimary: at("inversePrimary"),
		secondaryContainer: at("secondaryContainer"),
		onSecondaryContainer: at("onSecondaryContainer"),
		primaryLight: at("primaryLight"),
		primaryDark: at("primaryDark"),
	};
}

const channels = (hex: string) => hexToRgb(hex).join(" ");

/** The CSS variables that give a page its accent: our `--md-sys-color-*` roles and the MUI palette
 * variables (with the space-separated channels MUI uses for ripples and hover tints). */
export function accentVars(accent: Accent, scheme: "light" | "dark"): Record<string, string> {
	const r = accentRoles(accent, scheme);
	return {
		"--md-sys-color-primary": r.primary,
		"--md-sys-color-on-primary": r.onPrimary,
		"--md-sys-color-primary-container": r.primaryContainer,
		"--md-sys-color-on-primary-container": r.onPrimaryContainer,
		"--md-sys-color-inverse-primary": r.inversePrimary,
		"--md-sys-color-secondary-container": r.secondaryContainer,
		"--md-sys-color-on-secondary-container": r.onSecondaryContainer,
		"--mui-palette-primary-main": r.primary,
		"--mui-palette-primary-mainChannel": channels(r.primary),
		"--mui-palette-primary-light": r.primaryLight,
		"--mui-palette-primary-lightChannel": channels(r.primaryLight),
		"--mui-palette-primary-dark": r.primaryDark,
		"--mui-palette-primary-darkChannel": channels(r.primaryDark),
		"--mui-palette-primary-contrastText": r.onPrimary,
		"--mui-palette-primary-contrastTextChannel": channels(r.onPrimary),
	};
}
