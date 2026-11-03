import Box from "@mui/material/Box";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { memo } from "react";
import type { CompareRow } from "#/lib/compare";
import { formatMoney } from "#/lib/format";
import CategoryDot from "../CategoryDot";
import MobileCard from "../MobileCard";
import ResponsiveTable from "../ResponsiveTable";
import DeltaChip from "./DeltaChip";

const nameOf = (r: CompareRow) => (r.parent ? `${r.parent} › ${r.category}` : r.category);

/** What each category came to in the two periods and how far it moved, biggest move first. */
const ChangeTable = memo(function ChangeTable({
	rows,
	currency,
	goodWhenUp,
	beforeName,
	nowName,
}: {
	rows: CompareRow[];
	currency: string;
	goodWhenUp: boolean;
	beforeName: string;
	nowName: string;
}) {
	return (
		<ResponsiveTable
			rows={rows}
			getKey={(r) => r.categoryId}
			minWidth={620}
			head={
				<TableRow>
					<TableCell>Category</TableCell>
					<TableCell align="right">{beforeName}</TableCell>
					<TableCell align="right">{nowName}</TableCell>
					<TableCell align="right">Change</TableCell>
				</TableRow>
			}
			renderRow={(r) => (
				<TableRow hover>
					<TableCell sx={{ fontWeight: 500 }}>
						<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
							<CategoryDot color={r.color} />
							{nameOf(r)}
						</Box>
					</TableCell>
					<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
						{formatMoney(r.before, currency)}
					</TableCell>
					<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
						{formatMoney(r.now, currency)}
					</TableCell>
					<TableCell align="right">
						<DeltaChip row={r} currency={currency} goodWhenUp={goodWhenUp} />
					</TableCell>
				</TableRow>
			)}
			renderCard={(r) => (
				<MobileCard
					primary={
						<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
							<CategoryDot color={r.color} />
							<Typography variant="body2" sx={{ fontWeight: 500 }}>
								{nameOf(r)}
							</Typography>
						</Box>
					}
					secondary={
						<Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
							{formatMoney(r.before, currency)} → {formatMoney(r.now, currency)}
						</Typography>
					}
					end={<DeltaChip row={r} currency={currency} goodWhenUp={goodWhenUp} />}
				/>
			)}
		/>
	);
});

export default ChangeTable;
