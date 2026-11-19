import type { Shadows } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import { createElement } from "react";
import LoadingIndicator from "#/components/LoadingIndicator";
import { ACCENT_NAMES, accentVars } from "#/lib/accent-roles";
import { CHART_DARK, CHART_LIGHT, chartVars, colorVars, M3_DARK, M3_LIGHT, SCRIM } from "#/lib/m3";
import { EASE_OUT } from "#/lib/motion";
import { morph } from "#/lib/shape";
import { CHECK_MASK } from "#/lib/symbols";

/**
 * Material 3 Expressive. Colour roles come from `lib/m3.ts`, shape and springs
 * come from `styles/m3.css`. White cards sit on a soft grey page rather than casting a shadow (only
 * floating menus get one), the main buttons are near-black pills, buttons are pills that spring toward a squarer corner while pressed,
 * and corners come from the M3 shape scale (`--shape-*`).
 */

const e3 = [
	"var(--elev-3)",
	"var(--elev-3)",
	"var(--elev-3)",
	"var(--elev-3)",
	"var(--elev-3)",
] as const;

// MUI expects exactly 25 entries: index 0 is "no shadow". M3 keeps elevation light.
const shadows: Shadows = [
	"none",
	"var(--elev-1)",
	"var(--elev-2)",
	...e3,
	...e3,
	...e3,
	...e3,
	"var(--elev-3)",
	"var(--elev-3)",
];

const palette = (c: typeof M3_LIGHT) => ({
	primary: { main: c.primary, contrastText: c.onPrimary },
	secondary: { main: c.secondary, contrastText: c.onSecondary },
	error: { main: c.error, contrastText: c.onError },
	success: { main: c.success, contrastText: c.onSuccess },
	warning: { main: c.warning, contrastText: c.onWarning },
	info: { main: c.info, contrastText: c.onInfo },
	background: { default: c.surface, paper: c.surfaceContainerLow },
	text: { primary: c.onSurface, secondary: c.onSurfaceVariant },
	divider: c.outlineVariant,
});

// A selected segment tinted with a palette colour instead of the neutral secondary container.
const SEGMENT_TINT = (color: "success" | "error" | "info") =>
	({
		backgroundColor: `color-mix(in srgb, var(--mui-palette-${color}-main) 22%, var(--md-sys-color-surface-container))`,
		color: `color-mix(in oklab, var(--mui-palette-${color}-main) 55%, var(--md-sys-color-on-surface))`,
		"&:hover": {
			backgroundColor: `color-mix(in srgb, var(--mui-palette-${color}-main) 28%, var(--md-sys-color-surface-container))`,
		},
	}) as const;

// The page accents (lib/accent-roles.ts): `<html data-accent>` recolours the primary family. Dark
// comes after light, and the system-dark rule is the most specific, so each scheme wins where it applies.
const accentRules = (scheme: "light" | "dark", selector: (name: string) => string) =>
	Object.fromEntries(ACCENT_NAMES.map((name) => [selector(name), accentVars(name, scheme)]));

// A glow of the page's accent across the top of every dialog: an ellipse centred on the top edge,
// wide as the dialog and 150px tall (enough to sit behind the title), fading to nothing below it.
// `primary-container` follows the page's accent (lib/accent-roles.ts).
const DIALOG_GLOW =
	"radial-gradient(ellipse 110% 150px at 50% 0%, var(--md-sys-color-primary-container) 0%, color-mix(in srgb, var(--md-sys-color-primary-container) 45%, transparent) 55%, transparent 100%)";

const SPATIAL_BOUNCY = "var(--spring-spatial-bouncy-dur) var(--spring-spatial-bouncy)";
const SPATIAL_FAST = "var(--spring-spatial-fast-dur) var(--spring-spatial-fast)";
const EFFECTS_FAST = "var(--spring-effects-fast-dur) var(--spring-effects-fast)";

// A pressable: springs toward a squarer corner under the pointer or focus, and a hair smaller
// and squarer again while held.
const pressable = (hoverRadius: string, pressedRadius: string) =>
	({
		transition: `border-radius ${SPATIAL_FAST}, transform ${SPATIAL_FAST}, translate 60ms linear, background-color ${EFFECTS_FAST}, box-shadow ${EFFECTS_FAST}, border-color ${EFFECTS_FAST}`,
		// the shape morph (lib/shape.ts): less rounded under the pointer or keyboard focus, and
		// squarer still while held
		"@media (hover: hover) and (pointer: fine)": {
			"&:hover": { borderRadius: hoverRadius },
		},
		"&:focus-visible": { borderRadius: hoverRadius },
		"&:active": {
			borderRadius: pressedRadius,
			transform: "scale(.97)",
			transitionDelay: ".11s",
		},
		// No springing shapes or scaling for people who ask for less motion; colour still eases.
		"@media (prefers-reduced-motion: reduce)": {
			transition: "background-color 100ms linear, box-shadow 100ms linear",
			"&:active": {
				borderRadius: "inherit",
				transform: "none",
				transitionDelay: "0s",
			},
		},
	}) as const;

// Buttons as hardware keys, in two looks to choose between (KEY below). Each variant sets
// `--key-edge`, the colour of its own underside (a darker step of its face).
//  - "edge": a lit top edge, a solid darker edge below that gives it height, and a soft shadow.
//    Pressing sinks the key 2px while the edge shrinks, so it goes down into its base.
//  - "inset": the key sits in a hole in the panel: a dark slot ring round it, a lip inside its
//    bottom edge, and a light line under the slot. It does not move when pressed: the lip shrinks
//    and a shadow falls inside its top, so it looks pushed into the hole.
const KEY_STYLES = {
	edge: {
		// The shadow is what makes the key: the lit top, the solid edge (its height), a tight contact
		// shadow, a mid blur and a wide soft one beneath in the key's own colour (as spec-01's keys
		// glow red under red, and grey under white).
		rest: "inset 0 1px 0 var(--key-rim), 0 4px 0 var(--key-edge), 0 5px 2px rgb(0 0 0 / .07), 0 8px 6px color-mix(in srgb, var(--key-edge) 12%, transparent), 0 18px 22px -8px color-mix(in srgb, var(--key-edge) 22%, transparent)",
		down: "inset 0 1px 0 var(--key-rim), 0 1px 0 var(--key-edge), 0 2px 2px rgb(0 0 0 / .07), 0 4px 4px color-mix(in srgb, var(--key-edge) 10%, transparent), 0 10px 16px -8px color-mix(in srgb, var(--key-edge) 18%, transparent)",
		// the key travels the 3px its edge loses, so its base does not move
		translate: "0 3px",
	},
	inset: {
		rest: "inset 0 1px 0 var(--key-rim), inset 0 -3px 0 var(--key-edge), inset 0 -4px 3px rgb(0 0 0 / .04), 0 0 0 2px var(--key-slot), 0 1px 0 2px var(--key-lit)",
		down: "inset 0 2px 3px rgb(0 0 0 / .2), inset 0 -1px 0 var(--key-edge), 0 0 0 2px var(--key-slot), 0 1px 0 2px var(--key-lit)",
		translate: "none",
	},
} as const;
// The slot ring and the light line under it, by colour scheme: on a dark page the ring is black
// (darker than the page, not a grey outline) and the line under it is only a hint.
const KEY_LIGHT = {
	"--key-slot": "rgb(38 38 36 / .16)",
	"--key-lit": "rgb(255 255 255 / .8)",
	// the light rim along a key's top: a hint on a light page, a clear line on a dark one
	"--key-rim": "rgb(255 255 255 / .1)",
} as const;
const KEY_DARK = {
	"--key-slot": "#000",
	"--key-lit": "rgb(255 255 255 / .07)",
	"--key-rim": "rgb(255 255 255 / .24)",
} as const;
const KEY: keyof typeof KEY_STYLES = "edge";
const { rest: KEY_REST, down: KEY_DOWN, translate: KEY_SINK } = KEY_STYLES[KEY];
// An outlined button, flat as MUI draws it: a hairline border and no depth (raised keys are for
// the main contained buttons only).
const FLAT_BUTTON = {
	backgroundImage: "none",
	backgroundColor: "transparent",
	boxShadow: "none",
	color: "var(--md-sys-color-on-surface)",
	border: "1px solid var(--md-sys-color-outline-variant)",
	borderRadius: "var(--shape-lg)",
	"&:hover": {
		boxShadow: "none",
		backgroundColor: "color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent)",
		borderColor: "var(--md-sys-color-outline)",
	},
	"&.Mui-focusVisible": { boxShadow: "none" },
	"&:active": { boxShadow: "none", backgroundImage: "none", translate: "none" },
} as const;

// Matt, not glossy: a fine grey grain over the face (lighter and darker speckle at 9%) and a face
// that is nearly flat, with only the faintest rim of light along the top. A bright rim and a white
// gradient are what read as gloss.
const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='.33 .33 .33 0 0 .33 .33 .33 0 0 .33 .33 .33 0 0 0 0 0 0 .09'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;
const raisedKey = {
	// The grain and the face gradient fill the whole key, border included. By default they sit in
	// the padding box and tile into an outlined key's 1px border, which showed as a pale line along
	// its bottom edge.
	backgroundOrigin: "border-box",
	backgroundImage: `${GRAIN}, linear-gradient(180deg, rgb(255 255 255 / .05), rgb(0 0 0 / .05))`,
	boxShadow: KEY_REST,
	"&:hover": { boxShadow: KEY_REST },
	"&.Mui-focusVisible": { boxShadow: KEY_REST },
	"&:active": {
		transform: "none",
		translate: KEY_SINK,
		boxShadow: KEY_DOWN,
		// held in: a shade settles over the face
		backgroundImage: `${GRAIN}, linear-gradient(180deg, rgb(0 0 0 / .03), rgb(0 0 0 / .09))`,
		transitionDelay: "0s",
	},
	"&.Mui-disabled": { boxShadow: "none", backgroundImage: "none", translate: "none" },
} as const;

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
	// The M3 type scale (display/headline/title/body/label), in Sora (Manrope, the face before it, is still in assets and `m3.css`: swap this one line to go back). It is a variable font, so a
	// weight need not be a hundred: running text sits at 450 because Manrope's 400 reads thin on
	// screen, and the big headings are pulled in a little (-0.02em), as wide letterforms need.
	typography: {
		fontFamily: '"Sora", "Sora Fallback", system-ui, sans-serif',
		h1: { fontSize: "1.75rem", lineHeight: "34px", fontWeight: 450, letterSpacing: "-0.02em" }, // headline-md
		h2: { fontSize: "1.375rem", lineHeight: "28px", fontWeight: 500, letterSpacing: "-0.01em" }, // title-lg
		subtitle1: {
			fontSize: "1rem",
			lineHeight: "22px",
			fontWeight: 500,
			letterSpacing: "0.005em",
		}, // title-md
		subtitle2: {
			fontSize: "0.875rem",
			lineHeight: "20px",
			fontWeight: 500,
			letterSpacing: "0.005em",
		}, // title-sm
		body1: { fontSize: "1rem", lineHeight: "23px", fontWeight: 450 }, // body-lg
		body2: {
			fontSize: "0.875rem",
			lineHeight: "20px",
			fontWeight: 450,
			letterSpacing: "0.01em",
		}, // body-md
		caption: {
			fontSize: "0.75rem",
			lineHeight: "16px",
			fontWeight: 450,
			letterSpacing: "0.02em",
		}, // body-sm
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
				":root": { ...colorVars(M3_LIGHT), ...chartVars(CHART_LIGHT), ...KEY_LIGHT },
				...accentRules("light", (name) => `:root[data-accent="${name}"]`),
				// MUI marks the chosen mode with `data-dark` / `data-light` on <html> (the "data"
				// colorSchemeSelector). In "system" mode it sets neither and relies on the media
				// query, so dark must also apply when the OS is dark and no mode attribute is set.
				"[data-dark]": { ...colorVars(M3_DARK), ...chartVars(CHART_DARK), ...KEY_DARK },
				...accentRules("dark", (name) => `[data-dark][data-accent="${name}"]`),
				"@media (prefers-color-scheme: dark)": {
					":root:not([data-light]):not([data-dark])": {
						...colorVars(M3_DARK),
						...chartVars(CHART_DARK),
						...KEY_DARK,
					},
					...accentRules(
						"dark",
						(name) => `:root:not([data-light]):not([data-dark])[data-accent="${name}"]`,
					),
				},
			},
		},
		// Outlined fields with a 4px corner: a hairline border that darkens on hover and gets a 2px
		// primary ring when focused. Every text field is this one, the search boxes included.
		MuiTextField: { defaultProps: { fullWidth: true, variant: "outlined" } },
		MuiOutlinedInput: {
			styleOverrides: {
				root: {
					borderRadius: "var(--shape-xs)",
					// white, so a field on the grey page (a search box) reads like the cards
					backgroundColor: "var(--md-sys-color-surface-container-low)",
					// A field's edge is a target boundary, so it must keep 3:1 against its surface. `inputOutline`
					// (lib/m3.ts) is the lightest grey that does, in each mode; hover and focus go to full strength.
					"& .MuiOutlinedInput-notchedOutline": {
						borderColor: "var(--md-sys-color-input-outline)",
					},
					"&:hover .MuiOutlinedInput-notchedOutline": {
						borderColor: "var(--md-sys-color-on-surface-variant)",
					},
					"&.Mui-focused .MuiOutlinedInput-notchedOutline": {
						borderColor: "var(--md-sys-color-primary)",
						borderWidth: 2,
					},
					"&.Mui-error .MuiOutlinedInput-notchedOutline": {
						borderColor: "var(--md-sys-color-error)",
					},
				},
			},
		},
		// No fade on the placeholder: with the label inside the field it must be gone at once, not
		// linger over the label for a moment after load.
		MuiInputBase: {
			styleOverrides: { input: { "&::placeholder": { transition: "none" } } },
		},
		// Segmented toggle: tiny gaps, soft 6px inner corners and fully round outer ones; the selected
		// segment springs to a full pill in the secondary container (or its colour, if it has one).
		MuiToggleButtonGroup: {
			styleOverrides: {
				root: {
					gap: 2,
					// An equal-width group: the selected segment takes a bigger share, so the others
					// visibly give way (and the spring has room to overshoot).
					"&.MuiToggleButtonGroup-fullWidth .MuiToggleButtonGroup-grouped": {
						flexGrow: 1,
						flexBasis: 0,
						"&.Mui-selected": { flexGrow: 1.25 },
					},
					"& .MuiToggleButtonGroup-grouped": {
						margin: 0,
						border: 0,
						height: 36,
						paddingInline: 14,
						borderRadius: "6px",
						backgroundColor: "var(--md-sys-color-surface-container)",
						color: "var(--md-sys-color-on-surface-variant)",
						fontWeight: 500,
						transition: `border-radius ${SPATIAL_FAST}, transform ${SPATIAL_FAST}, flex-grow ${SPATIAL_BOUNCY}, background-color var(--spring-effects-default-dur) var(--spring-effects-default)`,
						// The selected segment opens a check that scales in and widens it, on a bouncier spring so
						// the overshoot shows, while its neighbours give way (M3: a selected button changes width).
						// Segments that hold an icon already say what they are, so they get no check.
						"&::before": {
							...CHECK_MASK,
							width: 0,
							opacity: 0,
							transform: "scale(0.4)",
							transition: `width ${SPATIAL_BOUNCY}, margin ${SPATIAL_BOUNCY}, transform ${SPATIAL_BOUNCY}, opacity ${EFFECTS_FAST}`,
						},
						"&.Mui-selected::before": {
							width: 18,
							marginRight: "6px",
							opacity: 1,
							transform: "none",
						},
						"&:has(> svg)::before, &:has(> .sym)::before": { display: "none" },
						"&:active": { transform: "scale(.96)" },
						"@media (prefers-reduced-motion: reduce)": {
							transition: "background-color 100ms linear",
							"&::before": { transition: "none" },
							"&:active": { transform: "none" },
						},
						// Outer ends rest at half the 36px height (not fully round), so the morph below
						// starts moving at once.
						"&:first-of-type": { borderRadius: "18px 6px 6px 18px" },
						"&:last-of-type": { borderRadius: "6px 18px 18px 6px" },
						// The shape morph (lib/shape.ts): one step less rounded under the pointer or focus.
						"@media (pointer: fine) and (hover: hover)": {
							"&:hover": { borderRadius: "var(--shape-xs)" },
							"&:first-of-type:hover": {
								borderRadius: "var(--shape-md) var(--shape-xs) var(--shape-xs) var(--shape-md)",
							},
							"&:last-of-type:hover": {
								borderRadius: "var(--shape-xs) var(--shape-md) var(--shape-md) var(--shape-xs)",
							},
						},
						"&:focus-visible": { borderRadius: "var(--shape-xs)" },
						"&:first-of-type:focus-visible": {
							borderRadius: "var(--shape-md) var(--shape-xs) var(--shape-xs) var(--shape-md)",
						},
						"&:last-of-type:focus-visible": {
							borderRadius: "var(--shape-xs) var(--shape-md) var(--shape-md) var(--shape-xs)",
						},
						"&.Mui-selected, &.Mui-selected:hover": {
							borderRadius: "18px",
							backgroundColor: "var(--md-sys-color-secondary-container)",
							color: "var(--md-sys-color-on-secondary-container)",
						},
						"&.Mui-selected:hover, &.Mui-selected:focus-visible": {
							borderRadius: "var(--shape-md)",
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
		// White cards on the grey page, no shadow.
		MuiCard: {
			defaultProps: { elevation: 0 },
			styleOverrides: { root: { ...morph("xl") } },
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
		// Dialogs are centred M3 dialogs over a light scrim, on MUI's own fade: opacity on a plain
		// curve, which every browser animates off the main thread (Safari would not keep a long
		// slide on the linear() spring smooth). They take the width their `maxWidth` allows, keep a
		// 16px gutter on narrow screens, and scroll inside themselves.
		MuiDialog: {
			styleOverrides: {
				root: {
					"& .MuiBackdrop-root": { backgroundColor: SCRIM },
				},
				paper: {
					margin: 16,
					width: "calc(100% - 32px)",
					maxHeight: "calc(100dvh - 32px)",
					borderRadius: "var(--shape-xl)",
					// white like the cards; the fields inside stand out by their `outline` border
					backgroundColor: "var(--md-sys-color-surface-container-low)",
					backgroundImage: DIALOG_GLOW,
					backgroundRepeat: "no-repeat",
				},
				// `fullScreen` (FormDialog's big forms on a phone): the rules above would keep the margin,
				// the rounded corners and a capped height, so undo them.
				paperFullScreen: {
					margin: 0,
					width: "100%",
					height: "100dvh",
					maxHeight: "none",
					borderRadius: 0,
				},
			},
		},
		MuiPopover: {
			styleOverrides: {
				paper: {
					borderRadius: "var(--shape-md)",
					backgroundColor: "var(--md-sys-color-surface-container-low)",
					// a white menu over a white card needs an edge
					boxShadow: "var(--elev-2)",
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
					fontWeight: 500,
					color: t.vars.palette.text.secondary,
					whiteSpace: "nowrap",
				}),
			},
		},
		// Buttons: fixed corners (no shape morph) and a key that travels down when pressed.
		MuiButton: {
			defaultProps: {
				disableElevation: true,
				loadingIndicator: createElement(LoadingIndicator, {
					size: 24,
					color: "inherit",
				}),
			},
			styleOverrides: {
				root: {
					borderRadius: "var(--shape-md)",
					// the press is the key's travel (raisedKey), a quick linear 60ms like a switch, not a spring
					transition:
						"translate 60ms linear, box-shadow 60ms linear, background-color 100ms linear, border-color 100ms linear",
					variants: [
						{ props: { variant: "contained" }, style: raisedKey },
						{
							// Raised keys are for the main (contained) buttons only. An outlined button stays
							// flat, as MUI draws it: a hairline border and no depth.
							props: { variant: "outlined" },
							style: FLAT_BUTTON,
						},
						{
							// Every destructive button (Delete, Move to trash): the deep red as the face and the
							// pale pink as the text. These are the error container's two roles, swapped in light
							// mode, where a pale face looked cheap; dark mode already has them that way round.
							props: { variant: "contained", color: "error" },
							style: {
								"--key-face": "var(--md-sys-color-on-error-container)",
								"--key-ink": "var(--md-sys-color-error-container)",
								"[data-dark] &": {
									"--key-face": "var(--md-sys-color-error-container)",
									"--key-ink": "var(--md-sys-color-on-error-container)",
								},
								"@media (prefers-color-scheme: dark)": {
									":root:not([data-light]):not([data-dark]) &": {
										"--key-face": "var(--md-sys-color-error-container)",
										"--key-ink": "var(--md-sys-color-on-error-container)",
									},
								},
								backgroundColor: "var(--key-face)",
								color: "var(--key-ink)",
								"--key-edge": "color-mix(in srgb, var(--key-face) 62%, black)",
								"&:hover": {
									backgroundColor: "color-mix(in srgb, var(--key-face) 90%, var(--key-ink))",
								},
							},
						},
						{
							// The main action: a pill in the logo's colour (navy, pale blue in dark mode); the
							// sky blue accent is kept for links, focus and selection.
							props: { variant: "contained", color: "primary" },
							style: {
								backgroundColor: "var(--md-sys-color-brand)",
								color: "var(--md-sys-color-on-brand)",
								"--key-edge": "color-mix(in srgb, var(--md-sys-color-brand) 55%, black)",
								"&:hover": {
									backgroundColor:
										"color-mix(in srgb, var(--md-sys-color-brand) 86%, var(--md-sys-color-on-brand))",
								},
							},
						},
					],
				},
				// The heights from before spec-01's exact key was tried (44px, which looked small and, scaled
				// up, too big on a phone): the same on every screen. A toolbar's buttons share one size.
				sizeSmall: {
					minHeight: 36,
					paddingInline: 14,
					minWidth: 64,
					fontSize: 14,
					borderRadius: "var(--shape-sm)",
				},
				sizeMedium: { minHeight: 46, paddingInline: 20, minWidth: 80, fontSize: 15 },
				sizeLarge: {
					minHeight: 60,
					paddingInline: 28,
					minWidth: 96,
					fontSize: 17,
					borderRadius: "var(--shape-lg)",
				},
				contained: {
					"&.Mui-disabled": {
						backgroundColor: "color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent)",
						color: "color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent)",
					},
				},
				// (no `outlined` slot rule: its outline-variant border showed as a pale line round the neutral
				// key, over the transparent border the key's own variant sets)
			},
		},
		// Switch (M3: 52x32 track, a small thumb off that grows when on and again when pressed). Written
		// as nested selectors on the root so they outrank MUI's own checked and disabled rules.
		MuiSwitch: {
			styleOverrides: {
				root: {
					width: 52,
					height: 32,
					padding: 0,
					"& .MuiSwitch-switchBase": {
						padding: 0,
						width: 32,
						height: 32,
						"&.Mui-checked": { transform: "translateX(20px)" },
						"&:hover, &.Mui-checked:hover": { backgroundColor: "transparent" },
						"&.Mui-disabled": { opacity: 0.38 },
					},
					"& .MuiSwitch-thumb": {
						width: 16,
						height: 16,
						boxShadow: "none",
						backgroundColor: "var(--md-sys-color-outline)",
						transition: `width ${SPATIAL_FAST}, height ${SPATIAL_FAST}, background-color ${EFFECTS_FAST}`,
					},
					"& .MuiSwitch-switchBase:active .MuiSwitch-thumb": { width: 28, height: 28 },
					"& .MuiSwitch-switchBase.Mui-checked .MuiSwitch-thumb": {
						width: 24,
						height: 24,
						backgroundColor: "var(--md-sys-color-on-primary)",
					},
					"& .MuiSwitch-switchBase.Mui-checked:active .MuiSwitch-thumb": { width: 28, height: 28 },
					"& .MuiSwitch-track": {
						boxSizing: "border-box",
						borderRadius: "var(--shape-full)",
						opacity: 1,
						backgroundColor: "var(--md-sys-color-surface-container-highest)",
						border: "2px solid var(--md-sys-color-outline)",
						transition: `background-color ${EFFECTS_FAST}, border-color ${EFFECTS_FAST}`,
					},
					"& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
						opacity: 1,
						backgroundColor: "var(--md-sys-color-primary)",
						borderColor: "var(--md-sys-color-primary)",
					},
					"& .MuiSwitch-switchBase.Mui-disabled + .MuiSwitch-track": { opacity: 0.38 },
					"@media (prefers-reduced-motion: reduce)": {
						"& .MuiSwitch-thumb, & .MuiSwitch-track": { transition: "none" },
					},
				},
			},
		},
		// MUI pulls a labelled control 11px left to cancel its own padding. The switch has none, so it
		// sits flush with the form's edge and gets a gap before its label instead.
		MuiFormControlLabel: {
			styleOverrides: {
				root: { "& > .MuiSwitch-root": { marginLeft: 11, marginRight: 12 } },
			},
		},
		// Checkbox and radio: the unchecked box is `on-surface-variant` (M3), checked is primary.
		MuiCheckbox: {
			styleOverrides: {
				root: {
					color: "var(--md-sys-color-on-surface-variant)",
					"&.Mui-checked, &.MuiCheckbox-indeterminate": { color: "var(--md-sys-color-primary)" },
					"&.Mui-disabled": {
						color: "color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent)",
					},
				},
			},
		},
		MuiRadio: {
			styleOverrides: {
				root: {
					color: "var(--md-sys-color-on-surface-variant)",
					"&.Mui-checked": { color: "var(--md-sys-color-primary)" },
					"&.Mui-disabled": {
						color: "color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent)",
					},
				},
			},
		},
		// Chips: 8px corners, a tonal fill, and `outline-variant` on the outlined kind. FilterChip and
		// TonalChip set their own colours on top.
		MuiChip: {
			styleOverrides: {
				root: { borderRadius: "var(--shape-sm)" },
				// The `filled` and `outlined` slots, not `&.MuiChip-filled` on root: that has two classes
				// and would beat the colours FilterChip and TonalChip set in their own `sx`.
				filled: {
					backgroundColor: "var(--md-sys-color-surface-container-high)",
					color: "var(--md-sys-color-on-surface-variant)",
				},
				outlined: { borderColor: "var(--md-sys-color-outline-variant)" },
			},
		},
		MuiIconButton: {
			styleOverrides: {
				root: {
					...pressable("var(--shape-md)", "var(--shape-sm)"),
					// A finger needs 48px (M3): on touch screens the tap area grows past the visible
					// button without moving the layout.
					"@media (pointer: coarse)": {
						"&::after": {
							content: '""',
							position: "absolute",
							top: "50%",
							left: "50%",
							width: 48,
							height: 48,
							transform: "translate(-50%, -50%)",
						},
					},
					"&:active": {
						borderRadius: "var(--shape-sm)",
						transform: "scale(.94)",
						transitionDelay: ".11s",
					},
				},
			},
		},
	},
});

export default theme;
