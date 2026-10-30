import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { type ReactNode, useState } from "react";
import { ACCENT } from "#/lib/m3";
import Brand from "./Brand";
import ColorModeToggle from "./ColorModeToggle";
import GradientASCII from "./GradientASCII";

/** The fonts of the sign-in and register pages only (the rest of the app keeps the theme's). To
 * change them, install a font (`pnpm --filter @maalu/web add @fontsource-variable/<name>`), import
 * it here (`import "@fontsource-variable/<name>";`) and put its family first in these stacks. */
const PAGE_FONT = '"Roboto Variable", system-ui, sans-serif';
/** The handwriting face of the name and the tagline on the coloured panel, and nothing else. */
const SCRIPT_FONT = '"Homemade Apple", cursive';
const SCRIPT = { "& .MuiTypography-root": { fontFamily: SCRIPT_FONT, fontWeight: 400 } };
/** The characters the gradient is drawn in. */
const GLYPH_FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Roboto Mono", monospace';

/** Fine grain laid over the gradient, so it reads as a soft mesh and not a flat blend. */
const NOISE =
	"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** A deep blue base with soft blobs of three related hues from the theme (blue, cyan, violet). The
 * base stays dark so white text keeps its contrast in both modes. */
const MESH = [
	`radial-gradient(65% 60% at 10% 8%, color-mix(in srgb, ${ACCENT.violet} 75%, transparent), transparent 70%)`,
	`radial-gradient(60% 55% at 95% 25%, color-mix(in srgb, var(--mui-palette-info-main) 65%, transparent), transparent 70%)`,
	`radial-gradient(65% 55% at 70% 100%, color-mix(in srgb, var(--mui-palette-primary-main) 70%, transparent), transparent 70%)`,
	"color-mix(in srgb, var(--mui-palette-primary-dark) 78%, black)",
].join(", ");

/** Dim to bright: deep blue, a near-white, then two light blues from the theme. */
const ASCII_COLORS = [
	"var(--mui-palette-primary-dark)",
	"color-mix(in srgb, white 94%, var(--mui-palette-primary-main))",
	"var(--mui-palette-info-light)",
	"var(--mui-palette-info-main)",
];

/** The panel: moving gradient waves, or the static mesh with its grain where WebGL2 is missing.
 * Takes the content to show over it. */
function Mesh({ children, sx }: { children: ReactNode; sx?: object }) {
	const [still, setStill] = useState(false);
	// Side by side the bright side faces the form on the right; as a banner it faces down at it.
	const wide = useMediaQuery((theme) => theme.breakpoints.up("md"));
	return (
		<Box
			sx={{
				position: "relative",
				overflow: "hidden",
				isolation: "isolate",
				color: "#fff",
				background: still ? MESH : "var(--mui-palette-background-default)",
				"&::after": still
					? {
							content: '""',
							position: "absolute",
							inset: 0,
							backgroundImage: NOISE,
							opacity: 0.32,
							mixBlendMode: "overlay",
							pointerEvents: "none",
							zIndex: -1,
						}
					: undefined,
				...sx,
			}}
		>
			{!still && (
				<GradientASCII
					colors={ASCII_COLORS}
					rotate={wide}
					fontFamily={GLYPH_FONT}
					onUnsupported={() => setStill(true)}
				/>
			)}
			{children}
		</Box>
	);
}

/** Sign-in and sign-up pages: the form on one side, a coloured panel on the other (a banner on a
 * phone). */
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
				gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.1fr) minmax(0, 1fr)" },
				// On a phone the form sits in the middle, and the gradient takes the room above it.
				gridTemplateRows: { xs: "minmax(180px, 1fr) auto minmax(0, 1fr)", md: "1fr" },
				bgcolor: "background.default",
				"& .MuiTypography-root, & .MuiInputBase-root, & .MuiButton-root, & .MuiFormLabel-root": {
					fontFamily: PAGE_FONT,
				},
			}}
		>
			<Box
				sx={{
					position: "absolute",
					top: 12,
					right: 12,
					zIndex: 1,
					color: { xs: "#fff", md: "inherit" },
				}}
			>
				<ColorModeToggle />
			</Box>
			<Mesh
				sx={{
					gridRow: 1,
					p: { xs: 3, md: 6 },
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-between",
				}}
			>
				<Box
					sx={{
						"& *": { color: "inherit" },
						"& .MuiTypography-root": { ...SCRIPT["& .MuiTypography-root"], fontSize: 30 },
					}}
				>
					<Brand />
				</Box>
				<Stack spacing={4} sx={{ display: { xs: "none", md: "flex" }, maxWidth: "42%", ...SCRIPT }}>
					<div>
						<Typography
							variant="h2"
							component="p"
							sx={{ color: "inherit", fontSize: "1.9rem", lineHeight: 1.5, textWrap: "balance" }}
						>
							Know where your money goes.
						</Typography>
						<Typography
							sx={{
								mt: 2,
								color: "inherit",
								opacity: 0.92,
								fontSize: "1.05rem",
								lineHeight: 2,
								textWrap: "pretty",
							}}
						>
							A calm, private place for your accounts, budgets and goals.
						</Typography>
					</div>
				</Stack>
			</Mesh>

			<Box
				sx={{
					gridRow: { xs: 2, md: 1 },
					display: "flex",
					alignItems: "center",
					py: { xs: 3, md: 6 },
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
