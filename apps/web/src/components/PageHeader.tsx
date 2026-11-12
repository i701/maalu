import Box from "@mui/material/Box";
import { FullAmountTip } from "#/components/Money";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { ACCENT, type Accent } from "#/lib/m3";
import GuideLinks from "./GuideLinks";
import HeaderPill from "./HeaderPill";
import ShapeTile from "./ShapeTile";
import Symbol from "./Symbol";

/**
 * The page's header, straight on the grey page: a small tinted icon tile, the title and a line of
 * description, the page's main action at the right, and quiet stat pills under them.
 */
export default function PageHeader({
	title,
	description,
	action,
	symbol,
	accent = "slate",
	shape = 0,
	stats,
	dock,
}: {
	title: string;
	description?: string;
	action?: ReactNode;
	/** Material Symbols name for the page icon tile (must exist in the font subset) */
	symbol?: string;
	accent?: Accent;
	shape?: number;
	/** Stat pills under the description, e.g. "324 transactions". */
	stats?: { symbol?: string; label: string }[];
	/** Headline figures for a phone: a slim white strip under the title, so a page's summary tiles
	 * take one short line instead of a screen. Shown on a phone only; the page keeps its full tiles
	 * for wider screens (and hides them on a phone). */
	dock?: DockItem[];
}) {
	return (
		<Box component="header" data-page-header sx={{ mb: { xs: 1.5, md: 3 }, pt: { md: 1 } }}>
			{/* Icon, title and action share a row; a wide action (an account page's three buttons)
			    wraps to its own line instead of squeezing the title. */}
			<Box
				sx={{
					display: "flex",
					flexWrap: "wrap",
					alignItems: "center",
					columnGap: { xs: 1.25, md: 2 },
					rowGap: 1,
				}}
			>
				{symbol && (
					<>
						<Box sx={{ display: { xs: "block", md: "none" } }}>
							<ShapeTile shape={shape} size={36} accent={ACCENT[accent]}>
								<Symbol name={symbol} size={20} filled />
							</ShapeTile>
						</Box>
						<Box sx={{ display: { xs: "none", md: "block" } }}>
							<ShapeTile shape={shape} size={48} accent={ACCENT[accent]}>
								<Symbol name={symbol} size={24} filled />
							</ShapeTile>
						</Box>
					</>
				)}
				<Box sx={{ minWidth: 0, flex: { xs: "1 1 8rem", md: "1 1 12rem" } }}>
					<Typography
						variant="h1"
						component="h1"
						sx={{ fontSize: { xs: "1.375rem", md: "1.75rem" }, lineHeight: 1.2, fontWeight: 500 }}
					>
						{title}
					</Typography>
					{description && (
						<Typography
							variant="body2"
							sx={{ mt: 0.5, color: "text.secondary", display: { xs: "none", md: "block" } }}
						>
							{description}
						</Typography>
					)}
				</Box>
				<Box sx={{ flex: "0 1 auto", maxWidth: "100%", ml: "auto" }}>{action}</Box>
			</Box>

			<Stack
				direction="row"
				useFlexGap
				sx={{ mt: { xs: 1.25, md: 2 }, flexWrap: "wrap", gap: 1, "&:empty": { display: "none" } }}
			>
				{stats?.map((s) => (
					<HeaderPill key={s.label} symbol={s.symbol}>
						{s.label}
					</HeaderPill>
				))}
				<GuideLinks />
			</Stack>
			{dock?.length ? <Dock items={dock} /> : null}
		</Box>
	);
}

export type DockItem = {
	label: string;
	value: string;
	/** The full amount, shown on hover when `value` is the short form. */
	full?: string;
	/** Colours the figure: a debt or a shortfall reads in the error colour. */
	tone?: "negative";
};

/** The phone strip under the title: two or three figures side by side on a white card. */
function Dock({ items }: { items: DockItem[] }) {
	return (
		<Box
			sx={{
				// a phone only: from `sm` up the page shows its own tiles instead
				display: { xs: "grid", sm: "none" },
				gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
				mt: 1.25,
				py: 1.25,
				borderRadius: "var(--shape-lg)",
				bgcolor: "var(--md-sys-color-surface-container-low)",
			}}
		>
			{items.map((item, i) => (
				<Box
					key={item.label}
					sx={{
						px: 1.25,
						minWidth: 0,
						borderLeft: i === 0 ? 0 : "1px solid var(--md-sys-color-outline-variant)",
						textAlign: "center",
					}}
				>
					<Typography
						variant="caption"
						sx={{ display: "block", color: "text.secondary", lineHeight: 1.3 }}
					>
						{item.label}
					</Typography>
					<Typography
						sx={{
							fontSize: 13,
							fontWeight: 600,
							lineHeight: 1.3,
							fontVariantNumeric: "tabular-nums",
							color: item.tone === "negative" ? "var(--md-sys-color-error)" : "text.primary",
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
