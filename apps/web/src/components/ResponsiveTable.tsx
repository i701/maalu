import { useCardMorph } from "#/lib/card-morph";
import { MORPH_TRANSITION } from "#/lib/shape";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import { Fragment, type ReactNode, useCallback, useState } from "react";
import { staggerChildren } from "#/lib/motion";
import { useViewMode } from "#/lib/view-mode";

/** The fill of a row bar. One step up from the card they sit in, so they show in light mode too. */
export const ROW_FILL = "var(--md-sys-color-surface-container)";

/** The table mode's desktop table: a real table. One framed surface, a header row with small
 * capitals, no rules between rows and a tint under the pointer. (The cards mode is the one
 * with separate rounded cards, so the two modes no longer look alike.) */
const TABLE = {
	"& .MuiTableCell-root": { borderBottom: 0, py: 1 },
	"& .MuiTableHead-root .MuiTableCell-root": {
		bgcolor: "var(--md-sys-color-surface-container)",
		color: "var(--md-sys-color-on-surface-variant)",
		fontSize: "0.6875rem",
		fontWeight: 600,
		letterSpacing: "0.06em",
		textTransform: "uppercase",
		py: 0.75,
	},
	"& .MuiTableBody-root .MuiTableRow-root": {
		transition: "background-color var(--spring-effects-fast-dur) var(--spring-effects-fast)",
	},
	"& .MuiTableBody-root .MuiTableRow-root:hover": {
		bgcolor: "color-mix(in srgb, var(--md-sys-color-secondary-container) 45%, transparent)",
	},
	"& .MuiTableBody-root .MuiTableRow-root.Mui-selected": {
		bgcolor: "var(--md-sys-color-secondary-container)",
	},
} as const;

/** The frame round the table or the dense list: one surface with rounded corners, flush with the
 * page's left and right edges like every other block. */
const FRAME = {
	mb: 1.5,
	overflow: "hidden",
	// square at the top, so the header strip runs straight into the toolbar above it
	borderRadius: "0 0 var(--shape-md) var(--shape-md)",
	bgcolor: "var(--md-sys-color-surface-container-low)",
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
	const cardMorph = useCardMorph();
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
							...cardMorph,
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
					<TableContainer sx={FRAME}>
						<Table sx={TABLE}>
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
						...FRAME,
						[wide]: { display: "none" },
						// a very faint rule between rows, and nothing else
						"& > * + *": {
							borderTop:
								"1px solid color-mix(in srgb, var(--md-sys-color-outline-variant) 30%, transparent)",
						},
					}}
				>
					{rows.map((row) => (
						<Box key={getKey(row)}>{renderCard(row)}</Box>
					))}
				</Box>
			)}
		</Box>
	);
}
