import { MORPH_TRANSITION, morph } from "#/lib/shape";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import { Fragment, type ReactNode, useCallback, useState } from "react";
import { staggerChildren } from "#/lib/motion";
import { useViewMode } from "#/lib/view-mode";

/** The fill of a row bar. One step up from the card they sit in, so they show in light mode too. */
const ROW_FILL = "var(--md-sys-color-surface-container-high)";

/** The desktop table's rows as separate rounded bars, like the cards of the narrow view: a gap
 * between rows, a tonal fill, and the row's corners on its first and last cell. Hover and selection
 * tint the cells (a row's own background would sit behind them). */
const ROW_CARDS = {
	borderCollapse: "separate",
	borderSpacing: "0 8px",
	"& .MuiTableBody-root .MuiTableCell-root": {
		bgcolor: ROW_FILL,
		transition: "background-color var(--spring-effects-fast-dur) var(--spring-effects-fast)",
	},
	"& .MuiTableBody-root .MuiTableCell-root:first-of-type": {
		borderStartStartRadius: "var(--shape-md)",
		borderEndStartRadius: "var(--shape-md)",
	},
	"& .MuiTableBody-root .MuiTableCell-root:last-of-type": {
		borderStartEndRadius: "var(--shape-md)",
		borderEndEndRadius: "var(--shape-md)",
	},
	"& .MuiTableBody-root .MuiTableRow-root:hover .MuiTableCell-root": {
		bgcolor: `color-mix(in srgb, var(--md-sys-color-secondary-container) 55%, ${ROW_FILL})`,
	},
	"& .MuiTableBody-root .MuiTableRow-root.Mui-selected .MuiTableCell-root": {
		bgcolor: "var(--md-sys-color-secondary-container)",
	},
} as const;

/**
 * A list with two modes (the Cards / Table toggle, see ViewToggle):
 *  - cards (the default): a grid of cards straight on the page, like the site's lists
 *  - table: two presentations, chosen by the width of the list's own container (not the
 *    screen), so it is right whether or not the sidebar is taking up space:
 *      - wide: the desktop table, its rows drawn as separate bars (see ROW_CARDS)
 *      - narrow: a list of cards (see MobileCard), so nobody has to scroll horizontally
 *
 * USE THIS FOR EVERY NEW TABLE: always provide both `renderRow` and `renderCard`.
 *
 * Before the width is measured (server render, first paint) both views are rendered and CSS picks
 * one, so nothing flashes. Once measured only the visible view is rendered, which halves the work
 * every time the rows change.
 *
 * `minWidth` is the container width (px) at which the desktop table fits comfortably; set it a
 * little above the table's natural width.
 */
export default function ResponsiveTable<T>({
	rows,
	getKey,
	head,
	renderRow,
	renderCard,
	minWidth = 760,
}: {
	rows: T[];
	getKey: (row: T) => string;
	/** The header `<TableRow>` for the desktop table. */
	head: ReactNode;
	/** One desktop `<TableRow>`. */
	renderRow: (row: T) => ReactNode;
	/** The same record as a card for narrow screens. */
	renderCard: (row: T) => ReactNode;
	minWidth?: number;
}) {
	const cardsMode = useViewMode() === "cards";
	const wide = `@container (min-width: ${minWidth}px)`;
	// null until measured: render both views and let the container query decide.
	const [isWide, setIsWide] = useState<boolean | null>(null);

	const measure = useCallback(
		(el: HTMLDivElement | null) => {
			if (!el) return;
			const observer = new ResizeObserver(([entry]) => {
				if (entry) setIsWide(entry.contentRect.width >= minWidth);
			});
			observer.observe(el);
			return () => observer.disconnect();
		},
		[minWidth],
	);

	if (cardsMode) {
		return (
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))",
					gap: 1,
					...staggerChildren(),
				}}
			>
				{rows.map((row) => (
					<Box
						key={getKey(row)}
						sx={{
							bgcolor: "var(--md-sys-color-surface-container-low)",
							...morph("xl"),
							// the site's .press: every card dips to 0.97 while held
							transition: `${MORPH_TRANSITION}, transform var(--spring-spatial-fast-dur) var(--spring-spatial-fast)`,
							"&:active": { transform: "scale(.97)" },
							"@media (prefers-reduced-motion: reduce)": { "&:active": { transform: "none" } },
						}}
					>
						{renderCard(row)}
					</Box>
				))}
			</Box>
		);
	}

	return (
		<Box ref={measure} sx={{ containerType: "inline-size" }}>
			{isWide !== false && (
				<Box sx={{ display: "none", [wide]: { display: "block" } }}>
					<TableContainer sx={{ px: 1.5, pb: 1.5 }}>
						<Table sx={ROW_CARDS}>
							<TableHead>{head}</TableHead>
							<TableBody sx={staggerChildren()}>
								{rows.map((row) => (
									<Fragment key={getKey(row)}>{renderRow(row)}</Fragment>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				</Box>
			)}
			{isWide !== true && (
				<Box
					sx={{
						display: "flex",
						flexDirection: "column",
						gap: 1,
						px: 1.5,
						pb: 1.5,
						[wide]: { display: "none" },
						...staggerChildren(),
					}}
				>
					{rows.map((row) => (
						<Box
							key={getKey(row)}
							sx={{
								bgcolor: ROW_FILL,
								borderRadius: "var(--shape-md)",
							}}
						>
							{renderCard(row)}
						</Box>
					))}
				</Box>
			)}
		</Box>
	);
}
