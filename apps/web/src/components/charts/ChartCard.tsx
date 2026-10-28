import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useState, type ReactNode } from "react";
import Symbol from "../Symbol";

export type ChartTable = { head: string[]; rows: string[][] };

/**
 * A dashboard card around one chart: a title and subtitle, an optional legend and a button that
 * swaps the chart for the same numbers as a table, so every value is reachable without hovering.
 */
export default function ChartCard({
	title,
	subtitle,
	legend,
	table,
	children,
}: {
	title: string;
	subtitle?: string;
	legend?: ReactNode;
	table?: ChartTable;
	children: ReactNode;
}) {
	const [asTable, setAsTable] = useState(false);

	return (
		<Box
			sx={{
				p: 2.5,
				minWidth: 0,
				borderRadius: "var(--shape-xl)",
				bgcolor: "var(--md-sys-color-surface-container-low)",
			}}
		>
			<Box
				sx={{
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "space-between",
					gap: 1,
					mb: 1.5,
				}}
			>
				<Box sx={{ minWidth: 0 }}>
					<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
						{title}
					</Typography>
					{subtitle && (
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							{subtitle}
						</Typography>
					)}
				</Box>
				{table && (
					<IconButton
						size="small"
						aria-pressed={asTable}
						aria-label={asTable ? "Show the chart" : "Show as a table"}
						title={asTable ? "Show the chart" : "Show as a table"}
						onClick={() => setAsTable((v) => !v)}
						sx={{ mt: -0.5, mr: -0.75 }}
					>
						<Symbol name={asTable ? "insights" : "view_list"} size={22} />
					</IconButton>
				)}
			</Box>
			{legend && <Box sx={{ mb: 1.5 }}>{legend}</Box>}
			{asTable && table ? (
				<Box sx={{ maxHeight: 280, overflow: "auto" }}>
					<Table size="small" stickyHeader aria-label={title}>
						<TableHead>
							<TableRow>
								{table.head.map((h, i) => (
									<TableCell key={h} align={i === 0 ? "left" : "right"}>
										{h}
									</TableCell>
								))}
							</TableRow>
						</TableHead>
						<TableBody>
							{table.rows.map((row) => (
								<TableRow key={row[0]}>
									{row.map((cell, i) => (
										<TableCell
											key={table.head[i]}
											align={i === 0 ? "left" : "right"}
											sx={{ fontVariantNumeric: i === 0 ? undefined : "tabular-nums" }}
										>
											{cell}
										</TableCell>
									))}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Box>
			) : (
				children
			)}
		</Box>
	);
}
