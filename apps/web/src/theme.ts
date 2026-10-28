import { createTheme } from "@mui/material/styles";
import { createElement } from "react";
import LoadingIndicator from "#/components/LoadingIndicator";
import SheetTransition from "#/components/SheetTransition";
import { CHART_DARK, CHART_LIGHT, M3_DARK, M3_LIGHT, chartVars, colorVars } from "#/lib/m3";
import { EASE_OUT } from "#/lib/motion";

/**
 * Material 3 Expressive. Colour roles come from `lib/m3.ts`, shape and springs
 * come from `styles/m3.css`. Surfaces are tonal (a step lighter or darker than the
 * page) rather than shadowed, buttons are pills that spring toward a squarer corner while pressed,
 * and corners come from the M3 shape scale (`--shape-*`).
 */

// MUI expects exactly 25 entries: index 0 is "no shadow". M3 keeps elevation light.
const shadows = [
	"none",
	"var(--elev-1)",
	"var(--elev-2)",
	...Array<string>(22).fill("var(--elev-3)"),
] as unknown as NonNullable<Parameters<typeof createTheme>[0]>["shadows"];

const palette = (c: typeof M3_LIGHT) => ({
	primary: { main: c.primary, contrastText: c.onPrimary },
	secondary: { main: c.secondary, contrastText: c.onSecondary },
	error: { main: c.error, contrastText: c.onError },
	background: { default: c.surface, paper: c.surfaceContainerLow },
	text: { primary: c.onSurface, secondary: c.onSurfaceVariant },
	divider: c.outlineVariant,
});

// A field a step toward the text colour: its hover and focus fill.
const HOVERED_FIELD =
	"color-mix(in srgb, var(--md-sys-color-on-surface) 6%, var(--md-sys-color-surface-container-highest))";

// A selected segment tinted with a palette colour instead of the neutral secondary container.
const SEGMENT_TINT = (color: "success" | "error" | "info") =>
	({
		backgroundColor: `color-mix(in srgb, var(--mui-palette-${color}-main) 22%, var(--md-sys-color-surface-container))`,
		color: `color-mix(in oklab, var(--mui-palette-${color}-main) 55%, var(--md-sys-color-on-surface))`,
		"&:hover": {
			backgroundColor: `color-mix(in srgb, var(--mui-palette-${color}-main) 28%, var(--md-sys-color-surface-container))`,
		},
	}) as const;

const SPATIAL_FAST = "var(--spring-spatial-fast-dur) var(--spring-spatial-fast)";
const EFFECTS_FAST = "var(--spring-effects-fast-dur) var(--spring-effects-fast)";

// A pressable: springs toward a squarer corner and a hair smaller while held.
const pressable = (pressedRadius: string) =>
	({
		transition: `border-radius ${SPATIAL_FAST}, transform ${SPATIAL_FAST}, background-color ${EFFECTS_FAST}, box-shadow ${EFFECTS_FAST}, border-color ${EFFECTS_FAST}`,
		"&:active": { borderRadius: pressedRadius, transform: "scale(.97)", transitionDelay: ".11s" },
		// No springing shapes or scaling for people who ask for less motion; colour still eases.
		"@media (prefers-reduced-motion: reduce)": {
			transition: "background-color 100ms linear, box-shadow 100ms linear",
			"&:active": { borderRadius: "inherit", transform: "none", transitionDelay: "0s" },
		},
	}) as const;

const theme = createTheme({
	// CSS variables + colorSchemes: instant light/dark switching with no re-render, and no flash
	// when paired with <InitColorSchemeScript /> in the document.
	cssVariables: { colorSchemeSelector: "data" },
	colorSchemes: {
		light: { palette: palette(M3_LIGHT) },
		dark: { palette: palette(M3_DARK) },
	},
	// The medium corner. Cards, dialogs, buttons and nav items pick larger or fully round values
	// from the shape scale below.
	shape: { borderRadius: 12 },
	// MUI transitions that use theme easing (menus, popovers...) get our curve too.
	transitions: { easing: { easeOut: EASE_OUT } },
	// The M3 type scale (display/headline/title/body/label), in Roboto for now.
	typography: {
		fontFamily: '"Roboto Variable", system-ui, sans-serif',
		h1: { fontSize: "1.75rem", lineHeight: "34px", fontWeight: 400 }, // headline-md
		h2: { fontSize: "1.375rem", lineHeight: "28px", fontWeight: 500 }, // title-lg
		subtitle1: { fontSize: "1rem", lineHeight: "22px", fontWeight: 500, letterSpacing: "0.005em" }, // title-md
		subtitle2: {
			fontSize: "0.875rem",
			lineHeight: "20px",
			fontWeight: 500,
			letterSpacing: "0.005em",
		}, // title-sm
		body1: { fontSize: "1rem", lineHeight: "23px", fontWeight: 400 }, // body-lg
		body2: { fontSize: "0.875rem", lineHeight: "20px", fontWeight: 400, letterSpacing: "0.01em" }, // body-md
		caption: { fontSize: "0.75rem", lineHeight: "16px", fontWeight: 400, letterSpacing: "0.02em" }, // body-sm
		button: {
			fontSize: "0.875rem",
			lineHeight: "20px",
			textTransform: "none",
			fontWeight: 500,
			letterSpacing: "0.005em",
		}, // label-lg
	},
	shadows,
	components: {
		MuiCssBaseline: {
			styleOverrides: {
				// Roles MUI has no slot for (surface containers, secondary/tertiary containers...).
				":root": { ...colorVars(M3_LIGHT), ...chartVars(CHART_LIGHT) },
				// MUI marks the chosen mode with `data-dark` / `data-light` on <html> (the "data"
				// colorSchemeSelector). In "system" mode it sets neither and relies on the media
				// query, so dark must also apply when the OS is dark and no mode attribute is set.
				"[data-dark]": { ...colorVars(M3_DARK), ...chartVars(CHART_DARK) },
				"@media (prefers-color-scheme: dark)": {
					":root:not([data-light]):not([data-dark])": {
						...colorVars(M3_DARK),
						...chartVars(CHART_DARK),
					},
				},
			},
		},
		// Inputs are tonal fields, no outline: a container-coloured block that deepens on hover and gets
		// a 2px primary ring when focused.
		MuiTextField: { defaultProps: { fullWidth: true, variant: "filled" } },
		// No fade on the placeholder: with the label inside the field it must be gone at once, not
		// linger over the label for a moment after load.
		MuiInputBase: { styleOverrides: { input: { "&::placeholder": { transition: "none" } } } },
		MuiFilledInput: {
			defaultProps: { disableUnderline: true },
			styleOverrides: {
				root: {
					// Filled field: 8px top corners and a square bottom, with a hairline underline that
					// thickens and turns primary on focus.
					borderRadius: "var(--shape-sm) var(--shape-sm) 0 0",
					backgroundColor: "var(--md-sys-color-surface-container-highest)",
					boxShadow: "inset 0 -1px 0 var(--md-sys-color-on-surface-variant)",
					transition:
						"background-color var(--spring-effects-fast-dur) var(--spring-effects-fast), box-shadow var(--spring-effects-fast-dur) var(--spring-effects-fast)",
					"&:hover": { backgroundColor: HOVERED_FIELD },
					"&.Mui-focused": {
						backgroundColor: HOVERED_FIELD,
						boxShadow: "inset 0 -2px 0 var(--md-sys-color-primary)",
					},
					"&.Mui-error": { boxShadow: "inset 0 -2px 0 var(--md-sys-color-error)" },
					"&.Mui-disabled": { opacity: 0.5 },
				},
			},
		},
		// Segmented toggle: tiny gaps, soft 6px inner corners and fully round outer ones; the selected
		// segment springs to a full pill in the secondary container (or its colour, if it has one).
		MuiToggleButtonGroup: {
			styleOverrides: {
				root: {
					gap: 2,
					"& .MuiToggleButtonGroup-grouped": {
						margin: 0,
						border: 0,
						height: 36,
						paddingInline: 14,
						borderRadius: "6px",
						backgroundColor: "var(--md-sys-color-surface-container)",
						color: "var(--md-sys-color-on-surface-variant)",
						fontWeight: 500,
						transition:
							"border-radius var(--spring-spatial-fast-dur) var(--spring-spatial-fast), background-color var(--spring-effects-default-dur) var(--spring-effects-default)",
						"&:first-of-type": { borderRadius: "var(--shape-full) 6px 6px var(--shape-full)" },
						"&:last-of-type": { borderRadius: "6px var(--shape-full) var(--shape-full) 6px" },
						"&.Mui-selected, &.Mui-selected:hover": {
							borderRadius: "var(--shape-full)",
							backgroundColor: "var(--md-sys-color-secondary-container)",
							color: "var(--md-sys-color-on-secondary-container)",
						},
						"&.Mui-selected.MuiToggleButton-success": SEGMENT_TINT("success"),
						"&.Mui-selected.Mui-error": SEGMENT_TINT("error"), // MUI marks a selected error toggle with Mui-error
						"&.Mui-selected.MuiToggleButton-info": SEGMENT_TINT("info"),
					},
				},
			},
		},
		// No dark-mode elevation tint: tonal surfaces are set explicitly.
		MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
		// Cards sit a tonal step above the page instead of casting a shadow.
		MuiCard: {
			defaultProps: { elevation: 0 },
			styleOverrides: { root: { borderRadius: "var(--shape-xl)" } },
		},
		MuiAppBar: { defaultProps: { elevation: 0, color: "inherit" } },
		MuiDrawer: {
			styleOverrides: {
				paper: { backgroundImage: "none" },
				anchorBottom: {
					"& .MuiDrawer-paper": {
						borderTopLeftRadius: "var(--shape-xl)",
						borderTopRightRadius: "var(--shape-xl)",
						backgroundColor: "var(--md-sys-color-surface-container-low)",
					},
				},
			},
		},
		// Dialogs are bottom sheets, like the filter sheet: they slide up on the spatial spring over a
		// light scrim, are at most 560px wide and centred on wide screens, round only the top
		// corners, and scroll inside themselves.
		MuiDialog: {
			defaultProps: {
				transitionDuration: { enter: 484, exit: 250 },
				slots: { transition: SheetTransition },
			},
			styleOverrides: {
				root: { "& .MuiBackdrop-root": { backgroundColor: "rgb(0 0 0 / 0.32)" } },
				container: { alignItems: "flex-end" },
				paper: {
					margin: 0,
					width: "min(560px, 100%)",
					maxHeight: "calc(100dvh - 24px)",
					borderRadius: "var(--shape-xl) var(--shape-xl) 0 0",
					backgroundColor: "var(--md-sys-color-surface-container-high)",
				},
			},
		},
		MuiPopover: {
			styleOverrides: {
				paper: {
					borderRadius: "var(--shape-md)",
					backgroundColor: "var(--md-sys-color-surface-container)",
				},
			},
		},
		MuiTableRow: {
			styleOverrides: {
				root: {
					"&.MuiTableRow-hover:hover": {
						backgroundColor:
							"color-mix(in srgb, var(--md-sys-color-secondary-container) 40%, transparent)",
					},
				},
			},
		},
		// Menu and list options: hover is the secondary container at half strength, selected the
		// full one, the same states as the sidebar.
		MuiMenuItem: {
			styleOverrides: {
				root: {
					borderRadius: "var(--shape-sm)",
					marginInline: 6,
					transition: "background-color var(--spring-effects-fast-dur) var(--spring-effects-fast)",
					"&:hover, &.Mui-focusVisible": {
						backgroundColor:
							"color-mix(in srgb, var(--md-sys-color-secondary-container) 55%, transparent)",
					},
					"&.Mui-selected, &.Mui-selected:hover": {
						backgroundColor: "var(--md-sys-color-secondary-container)",
						color: "var(--md-sys-color-on-secondary-container)",
					},
				},
			},
		},
		MuiTableCell: {
			styleOverrides: {
				// No row lines: rows are told apart by spacing and a tonal hover.
				root: { borderBottom: "none" },
				head: ({ theme: t }) => ({
					fontWeight: 600,
					color: t.vars.palette.text.secondary,
					whiteSpace: "nowrap",
				}),
			},
		},
		// Buttons: pills at rest that spring toward a squarer corner and shrink slightly when pressed.
		MuiButtonBase: { defaultProps: { disableRipple: true } },
		MuiButton: {
			defaultProps: {
				disableElevation: true,
				loadingIndicator: createElement(LoadingIndicator, { size: 24, color: "inherit" }),
			},
			styleOverrides: {
				root: {
					borderRadius: "var(--shape-full)",
					...pressable("var(--shape-md)"),
				},
				sizeSmall: { minHeight: 32, paddingInline: 12, fontSize: 13 },
				sizeMedium: { minHeight: 40, paddingInline: 16 },
				sizeLarge: {
					minHeight: 56,
					paddingInline: 24,
					fontSize: 16,
					"&:active": { borderRadius: "var(--shape-lg)" },
				},
				contained: {
					"&:hover": { boxShadow: "var(--elev-1)" },
					"&.Mui-disabled": {
						backgroundColor: "color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent)",
						color: "color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent)",
					},
				},
				outlined: {
					borderColor: "var(--md-sys-color-outline-variant)",
					"&:hover": { borderColor: "var(--md-sys-color-outline)" },
				},
			},
		},
		MuiIconButton: {
			styleOverrides: {
				root: {
					...pressable("var(--shape-md)"),
					"&:active": {
						borderRadius: "var(--shape-md)",
						transform: "scale(.94)",
						transitionDelay: ".11s",
					},
				},
			},
		},
	},
});

export default theme;
