import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import { Fragment, type ReactNode, useCallback, useState } from "react";
import { staggerChildren } from "#/lib/motion";
import { useViewMode } from "#/lib/view-mode";

/**
 * A list with two modes (the Cards / Table toggle, see ViewToggle):
 *  - cards (the default): a grid of cards straight on the page, like the site's lists
 *  - table: two presentations, chosen by the width of the list's own container (not the
 *    screen), so it is right whether or not the sidebar is taking up space:
 *      - wide: the normal desktop table
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
							borderRadius: "var(--shape-xl)",
							// the site's .press: every card dips to 0.97 while held
							transition: "transform var(--spring-spatial-fast-dur) var(--spring-spatial-fast)",
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
					<TableContainer>
						<Table>
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
								bgcolor: "var(--md-sys-color-surface-container)",
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
