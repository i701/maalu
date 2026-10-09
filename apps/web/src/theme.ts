import { createTheme } from "@mui/material/styles";

/**
 * The one shadow used across the app (mandated reference). It already includes the 1px ring and
 * inner highlight, so surfaces using it need no border.
 */
export const SHADOW =
	"0 1px 1px 0.5px rgba(41,41,41,.04),0 3px 3px -1.5px rgba(41,41,41,.02),0 6px 6px -3px rgba(41,41,41,.04),0 12px 12px -6px rgba(41,41,41,.04),0 24px 24px -12px rgba(41,41,41,.04),0 48px 48px -24px rgba(41,41,41,.04),0 0 0 1px rgba(41,41,41,.04),inset 0 -1px 1px -0.5px rgba(51,51,51,.06)";

// Radii, from controls up: inputs/buttons use theme.shape.borderRadius (12); small cards
// (stat/dashboard, profile, auth) use SURFACE_RADIUS; big containers (table cards, dialogs)
// use LARGE_SURFACE_RADIUS so they don't look tight around their content.
const SURFACE_RADIUS = 20;
export const LARGE_SURFACE_RADIUS = 28;

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
	shape: { borderRadius: 12 },
	typography: {
		fontFamily: '"Roboto Variable", system-ui, sans-serif',
		h1: { fontSize: "1.75rem", fontWeight: 600 },
		h2: { fontSize: "1.375rem", fontWeight: 600 },
		button: { textTransform: "none", fontWeight: 500 },
	},
	shadows,
	components: {
		MuiTextField: { defaultProps: { fullWidth: true } },
		// Surfaces get their depth from the shadow ring, not a border/outline.
		MuiCard: {
			defaultProps: { elevation: 1 },
			styleOverrides: { root: { borderRadius: SURFACE_RADIUS } },
		},
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
		MuiDialog: {
			defaultProps: { fullWidth: true },
			styleOverrides: {
				paper: { borderRadius: LARGE_SURFACE_RADIUS },
				paperFullScreen: { borderRadius: 0 }, // full-screen dialogs on phones stay square
			},
		},
	},
});

export default theme;
