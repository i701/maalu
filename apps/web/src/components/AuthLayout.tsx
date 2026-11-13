import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import ColorModeToggle from "./ColorModeToggle";
import Logo from "./Logo";

/** Fine grain laid over the gradient, so it reads as a soft wash and not a flat blend. */
const NOISE =
	"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const PAGE = "var(--mui-palette-background-default)";

/** The app icon's sky blue falling to the page (the stops are sampled from the icon). Across the
 * whole width on a wide screen, so its last pale blue lands behind the form's fields rather than at
 * the middle of the page; top to bottom over the form on a phone. */
const LIGHT_ACROSS = `linear-gradient(90deg, #57bee3 0%, #62c6e9 14%, #79d1ec 28%, #99ddf2 42%, #bde9f6 56%, #dbf3fa 70%, #edf8fc 80%, ${PAGE} 92%)`;
const LIGHT_DOWN = `linear-gradient(180deg, #57bee3 0%, #5fc5e8 18%, #72cfeb 32%, #94dcf1 50%, #c5eef8 68%, #ecf9fc 84%, ${PAGE} 100%)`;
/** The same fall in dark mode: a deep sky blue into the page. */
const DARK_ACROSS = `linear-gradient(90deg, #1b6a8e 0%, #175c7c 16%, #134f6c 30%, #0f3d55 46%, #0d2f42 60%, #101e28 76%, ${PAGE} 90%)`;
const DARK_DOWN = `linear-gradient(180deg, #1b6a8e 0%, #134f6c 34%, #0d2f42 68%, ${PAGE} 100%)`;

const DARK = {
	"--wash-across": DARK_ACROSS,
	"--wash-down": DARK_DOWN,
	"--ink": "#dff3fb",
	"--grain": "0.18",
};

/** The coloured panel: the icon's gradient with grain over it, and whatever is shown on it. */
function Wash({ children, sx }: { children: ReactNode; sx?: object }) {
	return (
		<Box
			sx={{
				"--wash-across": LIGHT_ACROSS,
				"--wash-down": LIGHT_DOWN,
				"--ink": "#081d48",
				"--grain": "0.35",
				"[data-dark] &": DARK,
				"@media (prefers-color-scheme: dark)": {
					":root:not([data-light]):not([data-dark]) &": DARK,
				},
				position: "relative",
				overflow: "hidden",
				isolation: "isolate",
				color: "var(--ink)",
				background: { xs: "var(--wash-down)", md: "var(--wash-across)" },
				"&::after": {
					content: '""',
					position: "absolute",
					inset: 0,
					backgroundImage: NOISE,
					opacity: "var(--grain)",
					mixBlendMode: "soft-light",
					pointerEvents: "none",
					zIndex: -1,
				},
				...sx,
			}}
		>
			{children}
		</Box>
	);
}

/** Sign-in and sign-up pages: the icon's gradient across the page with the logo in the left half and
 * the form in the right (a banner over the form on a phone). */
export default function AuthLayout({
	title,
	subtitle,
	children,
}: {
	title: string;
	subtitle?: string;
	children: ReactNode;
}) {
	return (
		<Box
			sx={{
				position: "relative",
				minHeight: "100vh",
				display: "grid",
				gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 1fr)" },
				gridTemplateRows: { xs: "auto 1fr", md: "1fr" },
				bgcolor: "background.default",
			}}
		>
			<Box sx={{ position: "absolute", top: 12, right: 12, zIndex: 1 }}>
				<ColorModeToggle />
			</Box>

			<Wash
				sx={{
					minHeight: { xs: 220, md: 0 },
					// a wide screen: under both columns, its content kept to the left half
					gridColumn: { md: "1 / -1" },
					gridRow: { md: 1 },
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					// the logo and the tagline under it, as one group in the middle of the column
					gap: 5,
					p: { xs: 3, md: 6 },
					pr: { md: "calc(50% + 48px)" },
					textAlign: "center",
				}}
			>
				<Box sx={{ display: { xs: "block", md: "none" } }}>
					<Logo size={96} animate />
				</Box>
				<Box sx={{ display: { xs: "none", md: "block" } }}>
					<Logo size={200} animate />
				</Box>
				<Box sx={{ display: { xs: "none", md: "block" }, maxWidth: 420 }}>
					<Typography
						component="p"
						sx={{
							color: "inherit",
							fontSize: "1.75rem",
							fontWeight: 500,
							lineHeight: 1.25,
							letterSpacing: "-0.02em",
							textWrap: "balance",
						}}
					>
						Know where your money goes.
					</Typography>
					<Typography
						sx={{ mt: 1, color: "inherit", opacity: 0.8, lineHeight: 1.5, textWrap: "pretty" }}
					>
						A calm, private place for your accounts, budgets and goals.
					</Typography>
				</Box>
			</Wash>

			<Box
				sx={{
					// on top of the wash, in the right column
					position: "relative",
					gridColumn: { md: 2 },
					gridRow: { md: 1 },
					display: "flex",
					alignItems: { xs: "flex-start", md: "center" },
					py: { xs: 1, md: 6 },
				}}
			>
				<Box sx={{ width: "100%", maxWidth: 420, mx: "auto", px: { xs: 3, sm: 4 } }}>
					<Typography variant="h2" component="h1" gutterBottom>
						{title}
					</Typography>
					{subtitle && (
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							{subtitle}
						</Typography>
					)}
					<Box sx={{ mb: 3 }} />
					{children}
				</Box>
			</Box>
		</Box>
	);
}
