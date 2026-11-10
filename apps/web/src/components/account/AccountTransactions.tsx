import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import Money from "#/components/Money";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { memo } from "react";
import { accountEffect, signOf } from "#/lib/account-detail";
import { formatDate, formatMoney, formatTime, formatWhen } from "#/lib/format";
import { ACCENT } from "#/lib/m3";
import { isRefund } from "#/lib/refund";
import { txSubtitle, txTitle } from "#/lib/tx-display";
import type { Transaction } from "#/types/api";
import MobileCard from "../MobileCard";
import ResponsiveTable from "../ResponsiveTable";
import ShapeTile from "../ShapeTile";
import Symbol from "../Symbol";
import { TagChips } from "../TagChip";
import TonalChip from "../TonalChip";

/** Adjustments and refunds have their own rules, so they are changed from the Transactions page. */
const canEdit = (t: Transaction) => !t.adjustment && !isRefund(t);

/** What a transaction did to this account: a signed amount in the account's currency, and for a
 * transfer where it went or came from. */
function Amount({ t, accountId }: { t: Transaction; accountId: string }) {
	const effect = accountEffect(t, accountId);
	return (
		<>
			<Typography
				variant="body2"
				sx={{
					fontWeight: 600,
					fontVariantNumeric: "tabular-nums",
					color: effect.positive ? "var(--chart-income)" : "text.primary",
				}}
			>
				{signOf(effect)}
				<Money amount={effect.amount} currency={effect.currency} />
			</Typography>
			{effect.counterpart && (
				<Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
					{effect.counterpart}
				</Typography>
			)}
		</>
	);
}

function Details({ t }: { t: Transaction }) {
	return (
		<>
			<Typography variant="body2" sx={{ fontWeight: 500 }}>
				{txTitle(t)}
			</Typography>
			{txSubtitle(t) && (
				<Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
					{txSubtitle(t)}
				</Typography>
			)}
			<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
				{t.type === "transfer" && <TonalChip accent={ACCENT.blue} label="Transfer" />}
				{t.adjustment && <TonalChip accent={ACCENT.slate} label="Adjustment" />}
				{isRefund(t) && <TonalChip accent={ACCENT.green} label="Refund" />}
				{t.subscription && <TonalChip accent={ACCENT.violet} label={t.subscription.name} />}
				<TagChips tags={t.tags} />
			</Box>
		</>
	);
}

function Actions({
	t,
	onEdit,
	onDelete,
}: {
	t: Transaction;
	onEdit: (t: Transaction) => void;
	onDelete: (t: Transaction) => void;
}) {
	return (
		<>
			{canEdit(t) && (
				<IconButton aria-label="Edit" title="Edit" size="small" onClick={() => onEdit(t)}>
					<EditOutlinedIcon fontSize="small" />
				</IconButton>
			)}
			<IconButton aria-label="Delete" title="Delete" size="small" onClick={() => onDelete(t)}>
				<DeleteOutlineIcon fontSize="small" />
			</IconButton>
		</>
	);
}

/** The transactions that touched one account, newest first: a table on wide screens and cards on
 * narrow ones. A transfer shows once, as money out of its source and money in to its destination. */
const AccountTransactions = memo(function AccountTransactions({
	items,
	accountId,
	currency,
	balances,
	onEdit,
	onDelete,
}: {
	items: Transaction[];
	accountId: string;
	/** The account's currency, for the running balance */
	currency: string;
	/** What the account held right after each transaction (the newest ones), by id */
	balances: Record<string, string>;
	onEdit: (t: Transaction) => void;
	onDelete: (t: Transaction) => void;
}) {
	return (
		<ResponsiveTable
			rows={items}
			getKey={(t) => t.id}
			minWidth={760}
			head={
				<TableRow>
					<TableCell>Date</TableCell>
					<TableCell>Details</TableCell>
					<TableCell align="right">Amount</TableCell>
					<TableCell align="right">Balance</TableCell>
					<TableCell align="right" sx={{ width: 100 }} />
				</TableRow>
			}
			renderRow={(t) => (
				<TableRow hover>
					<TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary" }}>
						{formatDate(t.transaction_date)}
						{t.transaction_time && (
							<Typography variant="caption" sx={{ display: "block" }}>
								{formatTime(t.transaction_time)}
							</Typography>
						)}
					</TableCell>
					<TableCell>
						<Details t={t} />
					</TableCell>
					<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
						<Amount t={t} accountId={accountId} />
					</TableCell>
					<TableCell
						align="right"
						sx={{
							whiteSpace: "nowrap",
							color: "text.secondary",
							fontVariantNumeric: "tabular-nums",
						}}
					>
						{balances[t.id] ? formatMoney(balances[t.id], currency) : "–"}
					</TableCell>
					<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
						<Actions t={t} onEdit={onEdit} onDelete={onDelete} />
					</TableCell>
				</TableRow>
			)}
			renderCard={(t) => {
				const positive = accountEffect(t, accountId).positive;
				return (
					<MobileCard
						leading={
							<ShapeTile
								shape={positive ? 1 : 4}
								size={52}
								accent={positive ? ACCENT.green : ACCENT.pink}
							>
								<Symbol name={positive ? "arrow_downward" : "arrow_upward"} size={24} filled />
							</ShapeTile>
						}
						primary={
							<Typography variant="body2" sx={{ fontWeight: 500 }}>
								{txTitle(t)}
							</Typography>
						}
						secondary={
							txSubtitle(t) && (
								<Typography variant="caption" sx={{ color: "text.secondary" }}>
									{txSubtitle(t)}
								</Typography>
							)
						}
						end={<Amount t={t} accountId={accountId} />}
						meta={
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
								{formatWhen(t.transaction_date, t.transaction_time)}
								{balances[t.id] && ` · Balance ${formatMoney(balances[t.id], currency)}`}
							</Typography>
						}
						actions={<Actions t={t} onEdit={onEdit} onDelete={onDelete} />}
					/>
				);
			}}
		/>
	);
});

export default AccountTransactions;
