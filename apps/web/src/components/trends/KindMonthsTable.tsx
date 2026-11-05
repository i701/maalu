import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { memo } from "react";
import { KIND_COLOR, KIND_NAMES, type KindMonth } from "#/lib/needs-wants";
import { cellText, monthColumn } from "#/lib/trends";

/** Spending split into needs, wants and what is not sorted yet, month by month. */
const KindMonthsTable = memo(function KindMonthsTable({
	rows,
	months,
}: {
	rows: KindMonth[];
	months: string[];
}) {
	return (
		<TableContainer
			sx={{
				borderRadius: "var(--shape-xl)",
				bgcolor: "var(--md-sys-color-surface-container-low)",
			}}
		>
			<Table
				size="small"
				aria-label="Needs and wants by month"
				sx={{ minWidth: 140 + months.length * 76 + 100 }}
			>
				<TableHead>
					<TableRow>
						<TableCell>Kind</TableCell>
						{months.map((m) => (
							<TableCell key={m} align="right" sx={{ whiteSpace: "nowrap" }}>
								{monthColumn(m)}
							</TableCell>
						))}
						<TableCell align="right" sx={{ fontWeight: 700 }}>
							Total
						</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{rows.map((r) => (
						<TableRow key={r.kind} hover>
							<TableCell sx={{ fontWeight: 500 }}>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
									<Box
										aria-hidden
										sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: KIND_COLOR[r.kind] }}
									/>
									{KIND_NAMES[r.kind]}
								</Box>
							</TableCell>
							{r.amounts.map((a, i) => (
								<TableCell
									key={months[i]}
									align="right"
									sx={{
										fontVariantNumeric: "tabular-nums",
										color: Number(a) === 0 ? "text.disabled" : undefined,
									}}
								>
									{cellText(a)}
								</TableCell>
							))}
							<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
								{cellText(r.total)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</TableContainer>
	);
});

export default KindMonthsTable;
