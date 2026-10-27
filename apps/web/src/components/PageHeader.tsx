import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { type Accent } from "#/lib/m3";
import GlassPill from "./GlassPill";
import ShapeTile from "./ShapeTile";
import Symbol from "./Symbol";

/** Deep two-stop gradient per page colour, as on the site's hero: dark enough for white text. */
const HERO: Record<Accent, readonly [string, string]> = {
	blue: ["#2457c5", "#0f2a66"],
	green: ["#0f8a64", "#04483a"],
	violet: ["#6d4bd1", "#35207f"],
	orange: ["#c25e00", "#6e2f00"],
	pink: ["#b3263f", "#5f0f26"],
	lime: ["#5c8a12", "#2c4a05"],
	amber: ["#b45309", "#6b2d04"],
	slate: ["#475569", "#1e293b"],
};

/**
 * The page's hero: a 36px gradient block with a shaped icon tile, a big title,
 * a line of description and frosted stat pills. The page's main action sits at the top right and
 * is shown as a white pill so it reads on the gradient.
 */
export default function PageHeader({
	title,
	description,
	action,
	symbol,
	accent = "slate",
	shape = 0,
	stats,
}: {
	title: string;
	description?: string;
	action?: ReactNode;
	/** Material Symbols name for the page icon tile (must exist in the font subset) */
	symbol?: string;
	accent?: Accent;
	shape?: number;
	/** Frosted stat pills under the description, e.g. "324 transactions". */
	stats?: { symbol?: string; label: string }[];
}) {
	const [from, to] = HERO[accent];
	return (
		<Box
			sx={{
				position: "relative",
				overflow: "hidden",
				mb: 2,
				p: { xs: 2.5, md: 3.5 },
				color: "#fff",
				borderRadius: "var(--shape-xxl)",
				background: `linear-gradient(160deg, ${from}, ${to})`,
			}}
		>
			{/* A big faint blob in the corner, for depth. */}
			<Box
				aria-hidden
				sx={{
					position: "absolute",
					top: -60,
					right: -40,
					opacity: 0.12,
					transform: "rotate(18deg)",
					pointerEvents: "none",
				}}
			>
				<ShapeTile shape={shape + 3} size={260} bg="#fff" fg="transparent">
					<span />
				</ShapeTile>
			</Box>

			<Stack
				direction="row"
				sx={{
					position: "relative",
					justifyContent: "space-between",
					alignItems: "flex-start",
					gap: 2,
				}}
			>
				{symbol && (
					<ShapeTile shape={shape} size={56} bg="rgb(255 255 255 / 0.18)" fg="#fff">
						<Symbol name={symbol} size={28} filled />
					</ShapeTile>
				)}
				<Box
					sx={{
						ml: "auto",
						"& .MuiButton-contained": {
							bgcolor: "#fff",
							color: from,
							"&:hover": { bgcolor: "rgb(255 255 255 / 0.9)", boxShadow: "none" },
						},
					}}
				>
					{action}
				</Box>
			</Stack>

			<Box sx={{ position: "relative", mt: { xs: 2, md: 3 }, maxWidth: 640 }}>
				<Typography
					variant="h1"
					component="h1"
					sx={{ color: "#fff", fontSize: { xs: "2rem", md: "2.25rem" }, lineHeight: 1.2 }}
				>
					{title}
				</Typography>
				{description && (
					<Typography variant="body1" sx={{ mt: 1, color: "rgb(255 255 255 / 0.85)" }}>
						{description}
					</Typography>
				)}
			</Box>

			{stats && stats.length > 0 && (
				<Stack
					direction="row"
					useFlexGap
					sx={{ position: "relative", mt: 2.5, flexWrap: "wrap", gap: 1 }}
				>
					{stats.map((s) => (
						<GlassPill key={s.label} symbol={s.symbol}>
							{s.label}
						</GlassPill>
					))}
				</Stack>
			)}
		</Box>
	);
}
