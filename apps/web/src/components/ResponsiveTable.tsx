import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import { Fragment, type ReactNode } from "react";

/**
 * A table with two presentations, chosen by the width of the table's own container (not the
 * screen), so it is right whether or not the sidebar is taking up space:
 *  - wide: the normal desktop table
 *  - narrow: a list of cards (see MobileCard), so nobody has to scroll horizontally
 *
 * USE THIS FOR EVERY NEW TABLE: always provide both `renderRow` and `renderCard`.
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
	const wide = `@container (min-width: ${minWidth}px)`;

	return (
		<Box sx={{ containerType: "inline-size" }}>
			<Box sx={{ display: "none", [wide]: { display: "block" } }}>
				<TableContainer>
					<Table>
						<TableHead>{head}</TableHead>
						<TableBody>
							{rows.map((row) => (
								<Fragment key={getKey(row)}>{renderRow(row)}</Fragment>
							))}
						</TableBody>
					</Table>
				</TableContainer>
			</Box>
			<Box sx={{ display: "block", [wide]: { display: "none" } }}>
				{rows.map((row, i) => (
					<Box key={getKey(row)} sx={{ borderTop: i === 0 ? 0 : 1, borderColor: "divider" }}>
						{renderCard(row)}
					</Box>
				))}
			</Box>
		</Box>
	);
}
