import { createTheme } from "@mui/material/styles";
import { EASE_OUT } from "#/lib/motion";

/**
 * The one shadow used across the app (mandated reference). It already includes the 1px ring and
 * inner highlight, so surfaces using it need no border.
 */
export const SHADOW =
	"0 1px 1px 0.5px rgba(41,41,41,.04),0 3px 3px -1.5px rgba(41,41,41,.02),0 6px 6px -3px rgba(41,41,41,.04),0 12px 12px -6px rgba(41,41,41,.04),0 24px 24px -12px rgba(41,41,41,.04),0 48px 48px -24px rgba(41,41,41,.04),0 0 0 1px rgba(41,41,41,.04),inset 0 -1px 1px -0.5px rgba(51,51,51,.06)";

// MUI expects exactly 25 entries: index 0 is "no shadow", every elevation level 1-24 uses SHADOW.
const shadows = ["none", ...Array<string>(24).fill(SHADOW)] as unknown as NonNullable<
	Parameters<typeof createTheme>[0]
>["shadows"];

const theme = createTheme({
	// CSS variables + colorSchemes: instant light/dark switching with no re-render, and no flash
	// when paired with <InitColorSchemeScript /> in the document.
	cssVariables: { colorSchemeSelector: "data" },
	colorSchemes: {
		light: {
			palette: {
				primary: { main: "#2e7d6b" },
				secondary: { main: "#5b6b78" },
				background: { default: "#f6f7f9", paper: "#ffffff" },
			},
		},
		dark: {
			palette: {
				primary: { main: "#58c2a8" },
				secondary: { main: "#9fb0bd" },
				background: { default: "#111418", paper: "#181c21" },
			},
		},
	},
	// One squarer corner radius for the whole UI: inputs, buttons, cards, table cards, dialogs and
	// menus all derive from this.
	shape: { borderRadius: 6 },
	// MUI transitions that use theme easing (menus, popovers...) get our curve too.
	transitions: { easing: { easeOut: EASE_OUT } },
	typography: {
		fontFamily: '"Roboto Variable", system-ui, sans-serif',
		h1: { fontSize: "1.75rem", fontWeight: 600 },
		h2: { fontSize: "1.375rem", fontWeight: 600 },
		button: { textTransform: "none", fontWeight: 500 },
	},
	shadows,
	components: {
		MuiTextField: { defaultProps: { fullWidth: true } },
		// Pressable buttons, after mui.com's own: a darker edge, a highlight along the top and shade
		// along the bottom, and a short drop. Pressing swaps the shade for an inner shadow, so the
		// button reads as pushed in. Buttons are the only thing that gets this depth. Colours come
		// from CSS variables (`t.vars`) and `applyStyles("dark")`, so they follow the colour mode.
		MuiButton: {
			defaultProps: { disableElevation: true },
			styleOverrides: {
				root: {
					transition: `background-color 120ms ${EASE_OUT}, box-shadow 120ms ${EASE_OUT}, border-color 120ms ${EASE_OUT}`,
				},
				contained: ({ theme: t, ownerState }) => {
					const color = ownerState.color;
					if (!color || color === "inherit") return {};
					const c = t.vars.palette[color];
					return {
						border: `1px solid ${c.dark}`,
						textShadow: "0 1px 1px rgba(0 0 0 / 0.25)",
						boxShadow: `rgba(${c.lightChannel} / 0.5) 0 1px 0 inset, rgba(${c.darkChannel} / 0.4) 0 -1px 0 1px inset, rgba(0 0 0 / 0.1) 0 2px 4px 0`,
						"&:hover": {
							backgroundColor: c.dark,
							boxShadow: `rgba(${c.lightChannel} / 0.3) 0 1px 0 inset, rgba(0 0 0 / 0.2) 0 -1px 0 1px inset, rgba(0 0 0 / 0.1) 0 2px 4px 0`,
						},
						"&:active": {
							backgroundColor: c.dark,
							boxShadow: "rgba(0 0 0 / 0.35) 0 1px 2px 1px inset",
						},
						"&.Mui-disabled": {
							backgroundColor: t.vars.palette.action.disabledBackground,
							color: t.vars.palette.action.disabled,
							borderColor: "transparent",
							boxShadow: "none",
							textShadow: "none",
						},
					};
				},
				outlined: ({ theme: t, ownerState }) => {
					const text = "var(--mui-palette-text-primary)";
					const paper = t.vars.palette.background.paper;
					// Coloured outlined buttons keep MUI's coloured edge; neutral ones get a soft grey one.
					const neutralEdge =
						!ownerState.color || ownerState.color === "inherit"
							? {
									borderColor: `color-mix(in srgb, ${text} 23%, transparent)`,
									"&:hover": { borderColor: `color-mix(in srgb, ${text} 40%, transparent)` },
								}
							: {};
					return {
						backgroundColor: paper,
						boxShadow:
							"rgba(255 255 255 / 1) 0 1px 0 1px inset, rgba(0 0 0 / 0.05) 0 -1px 0 1px inset, rgba(0 0 0 / 0.08) 0 1px 2px 0",
						...neutralEdge,
						"&:hover": {
							...("&:hover" in neutralEdge ? neutralEdge["&:hover"] : {}),
							backgroundColor: `color-mix(in srgb, ${text} 4%, ${paper})`,
						},
						"&:active": {
							backgroundColor: `color-mix(in srgb, ${text} 7%, ${paper})`,
							boxShadow: "rgba(0 0 0 / 0.15) 0 1px 2px 0 inset",
						},
						"&.Mui-disabled": { boxShadow: "none" },
						// The white top highlight would glow on a dark surface: keep the edge and the press.
						...t.applyStyles("dark", {
							backgroundColor: "transparent",
							boxShadow: "none",
							"&:hover": {
								...("&:hover" in neutralEdge ? neutralEdge["&:hover"] : {}),
								backgroundColor: `color-mix(in srgb, ${text} 8%, transparent)`,
							},
							"&:active": {
								backgroundColor: `color-mix(in srgb, ${text} 12%, transparent)`,
								boxShadow: "rgba(0 0 0 / 0.4) 0 1px 2px 0 inset",
							},
						}),
					};
				},
			},
		},
		// Surfaces get their depth from the shadow ring, not a border/outline.
		MuiCard: { defaultProps: { elevation: 1 } },
		MuiAppBar: { defaultProps: { elevation: 0, color: "inherit" } },
		MuiDrawer: {
			styleOverrides: { paper: { backgroundImage: "none" } },
		},
		MuiTableCell: {
			styleOverrides: {
				head: ({ theme: t }) => ({
					fontWeight: 600,
					color: t.vars.palette.text.secondary,
					whiteSpace: "nowrap",
				}),
			},
		},
		MuiDialog: { defaultProps: { fullWidth: true } },
	},
});

export default theme;
