import Box from "@mui/material/Box";
import { FullAmountTip } from "#/components/Money";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { type Accent } from "#/lib/m3";
import { morph as morphShape, morphUp } from "#/lib/shape";
import GlassPill from "./GlassPill";
import GuideLinks from "./GuideLinks";
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
	morph,
	dock,
	plainIcon = false,
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
	/** Make the banner react to the pointer like the cards do: "down" rests rounded and squares
	 * up on hover (the app's default for cards), "up" rests squarer and rounds up. Left out, it
	 * stays still. */
	morph?: "down" | "up";
	/** Headline figures for a phone: a slim strip tucked under the banner, like a tab hanging off
	 * it, so a page's summary tiles take one short line instead of a screen. Shown on a phone
	 * only; the page keeps its full tiles for wider screens (and hides them on a phone). */
	dock?: DockItem[];
	/** Draw the icon on its own, without the shaped tile behind it. */
	plainIcon?: boolean;
}) {
	const [from, to] = HERO[accent];
	const banner = (
		<Box
			sx={{
				position: "relative",
				overflow: "hidden",
				mb: { xs: dock?.length ? 0 : 1.5, md: 2 },
				zIndex: dock?.length ? 1 : undefined,
				p: { xs: 1.5, md: 3.5 },
				color: "#fff",
				borderRadius: { xs: "var(--shape-xl)", md: "var(--shape-xxl)" },
				...(morph && reactive(morph)),
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
					display: { xs: "none", md: "block" },
					opacity: 0.12,
					transform: "rotate(18deg)",
					pointerEvents: "none",
				}}
			>
				<ShapeTile shape={shape + 3} size={260} bg="#fff" fg="transparent">
					<span />
				</ShapeTile>
			</Box>

			{/* Wide: icon and action on one row, the title and description under them. On a phone all
			    three share one row (icon, title, action) and the description is left out, so the
			    banner takes a strip, not a screen. */}
			<Box
				sx={{
					position: "relative",
					// A phone: a wrapping row. The icon and the title share a line with the action when
					// it fits; a wider action (an account page's three buttons) drops to its own line
					// instead of squeezing the title or sitting on top of it.
					display: { xs: "flex", md: "grid" },
					flexWrap: "wrap",
					gridTemplateColumns: { md: "1fr auto" },
					gridTemplateAreas: { md: '"icon action" "title title"' },
					alignItems: { xs: "center", md: "start" },
					columnGap: { xs: 1.25, md: 2 },
					rowGap: { xs: 1, md: 3 },
				}}
			>
				{symbol && (
					<Box sx={{ gridArea: "icon", display: "block" }}>
						{plainIcon ? (
							// just the icon, no shaped tile behind it
							<Box sx={{ color: "#fff", pl: { xs: 0.5, md: 1 } }}>
								{/* the same size the icon had inside its tile */}
								<Box sx={{ display: { xs: "flex", md: "none" } }}>
									<Symbol name={symbol} size={22} filled />
								</Box>
								<Box sx={{ display: { xs: "none", md: "flex" } }}>
									<Symbol name={symbol} size={28} filled />
								</Box>
							</Box>
						) : (
							<>
								<Box sx={{ display: { xs: "block", md: "none" } }}>
									<ShapeTile shape={shape} size={40} bg="rgb(255 255 255 / 0.18)" fg="#fff">
										<Symbol name={symbol} size={22} filled />
									</ShapeTile>
								</Box>
								<Box sx={{ display: { xs: "none", md: "block" } }}>
									<ShapeTile shape={shape} size={56} bg="rgb(255 255 255 / 0.18)" fg="#fff">
										<Symbol name={symbol} size={28} filled />
									</ShapeTile>
								</Box>
							</>
						)}
					</Box>
				)}
				<Box
					sx={{
						gridArea: "title",
						minWidth: 0,
						maxWidth: { md: 640 },
						flex: { xs: "1 1 8rem", md: "none" },
					}}
				>
					<Typography
						variant="h1"
						component="h1"
						sx={{
							color: "#fff",
							fontSize: { xs: "1.375rem", md: "2.25rem" },
							lineHeight: 1.2,
						}}
					>
						{title}
					</Typography>
					{description && (
						<Typography
							variant="body1"
							sx={{ mt: 1, color: "rgb(255 255 255 / 0.85)", display: { xs: "none", md: "block" } }}
						>
							{description}
						</Typography>
					)}
				</Box>
				<Box
					sx={{
						gridArea: "action",
						justifySelf: "end",
						flex: { xs: "0 1 auto", md: "none" },
						maxWidth: "100%",
						"& .MuiButton-contained": {
							bgcolor: "#fff",
							color: from,
							"&:hover": { bgcolor: "rgb(255 255 255 / 0.9)", boxShadow: "none" },
						},
					}}
				>
					{action}
				</Box>
			</Box>

			<Stack
				direction="row"
				useFlexGap
				sx={{
					position: "relative",
					mt: { xs: 1.25, md: 2.5 },
					flexWrap: "wrap",
					gap: 1,
					"&:empty": { display: "none" },
				}}
			>
				{stats?.map((s) => (
					<GlassPill key={s.label} symbol={s.symbol}>
						{s.label}
					</GlassPill>
				))}
				<GuideLinks />
			</Stack>
		</Box>
	);
	if (!dock?.length) return banner;
	return (
		<>
			{banner}
			<Dock items={dock} color={to} />
		</>
	);
}

/** The banner's corners under the pointer: the usual morph, resting at the phone size on a narrow
 * screen. */
function reactive(direction: "down" | "up") {
	const m = direction === "up" ? morphUp("xxl") : morphShape("xxl");
	return { ...m, borderRadius: { xs: "var(--shape-xl)", md: m.borderRadius } };
}

export type DockItem = {
	label: string;
	value: string;
	/** The full amount, shown on hover when `value` is the short form. */
	full?: string;
	/** Colours the figure: a debt or a shortfall reads as a warm tint. */
	tone?: "negative";
};

/** The strip under a phone banner: two or three figures side by side, in the banner's own deep
 * colour, a little narrower than the banner and tucked under its rounded bottom edge. */
function Dock({ items, color }: { items: DockItem[]; color: string }) {
	return (
		<Box
			sx={{
				// a phone only: from `sm` up the page shows its own tiles instead
				display: { xs: "grid", sm: "none" },
				gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
				mx: 2.5,
				mt: "-14px", // tucked under the banner's rounded bottom
				mb: 1.5,
				pt: "24px", // the 14px under the banner plus room above the labels
				pb: 1.25,
				borderRadius: "0 0 var(--shape-lg) var(--shape-lg)",
				bgcolor: color,
				color: "#fff",
			}}
		>
			{items.map((item, i) => (
				<Box
					key={item.label}
					sx={{
						px: 1.25,
						minWidth: 0,
						borderLeft: i === 0 ? 0 : "1px solid rgb(255 255 255 / 0.16)",
						textAlign: "center",
					}}
				>
					<Typography
						variant="caption"
						sx={{ display: "block", color: "rgb(255 255 255 / 0.72)", lineHeight: 1.3 }}
					>
						{item.label}
					</Typography>
					<Typography
						sx={{
							fontSize: 13,
							fontWeight: 600,
							lineHeight: 1.3,
							fontVariantNumeric: "tabular-nums",
							color: item.tone === "negative" ? "#ffb4ab" : "#fff",
							overflowWrap: "anywhere",
						}}
					>
						{item.full ? <FullAmountTip full={item.full}>{item.value}</FullAmountTip> : item.value}
					</Typography>
				</Box>
			))}
		</Box>
	);
}
