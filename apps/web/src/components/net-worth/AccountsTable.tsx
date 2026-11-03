import Box from "@mui/material/Box";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { memo } from "react";
import { formatMoney } from "#/lib/format";
import type { NetWorthAccountChange } from "#/types/api";
import DeltaChip from "../compare/DeltaChip";
import MobileCard from "../MobileCard";
import ResponsiveTable from "../ResponsiveTable";

const asChange = (a: NetWorthAccountChange) => ({
	before: a.start,
	now: a.end,
	change: a.change,
	percent: Number(a.start) > 0 ? (Number(a.change) / Number(a.start)) * 100 : null,
});

/** Each account's own change over the period: what it was worth at the start and at the end, and
 * how far it moved, biggest move first. Cards owe money below zero, so a debt paid down is a rise. */
const AccountsTable = memo(function AccountsTable({
	accounts,
	currency,
}: {
	accounts: NetWorthAccountChange[];
	currency: string;
}) {
	return (
		<ResponsiveTable
			rows={accounts}
			getKey={(a) => a.account_id}
			minWidth={620}
			head={
				<TableRow>
					<TableCell>Account</TableCell>
					<TableCell align="right">At the start</TableCell>
					<TableCell align="right">At the end</TableCell>
					<TableCell align="right">Change</TableCell>
				</TableRow>
			}
			renderRow={(a) => (
				<TableRow hover>
					<TableCell sx={{ fontWeight: 500 }}>
						{a.name}
						<Typography component="span" variant="caption" sx={{ color: "text.secondary", ml: 1 }}>
							{a.currency !== currency ? a.currency : ""}
						</Typography>
					</TableCell>
					<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
						{formatMoney(a.start, currency)}
					</TableCell>
					<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
						{formatMoney(a.end, currency)}
					</TableCell>
					<TableCell align="right">
						<DeltaChip row={asChange(a)} currency={currency} goodWhenUp />
					</TableCell>
				</TableRow>
			)}
			renderCard={(a) => (
				<MobileCard
					primary={
						<Typography variant="body2" sx={{ fontWeight: 500 }}>
							{a.name}
						</Typography>
					}
					secondary={
						<Box component="span" sx={{ color: "text.secondary", fontSize: 12 }}>
							{formatMoney(a.start, currency)} → {formatMoney(a.end, currency)}
						</Box>
					}
					end={<DeltaChip row={asChange(a)} currency={currency} goodWhenUp />}
				/>
			)}
		/>
	);
});

export default AccountsTable;
