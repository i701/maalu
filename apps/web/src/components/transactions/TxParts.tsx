import AutorenewIcon from "@mui/icons-material/Autorenew";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import InsertLinkOutlinedIcon from "@mui/icons-material/InsertLinkOutlined";
import UndoIcon from "@mui/icons-material/Undo";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { Link } from "@tanstack/react-router";
import Money from "#/components/Money";
import TonalChip from "#/components/TonalChip";
import { PAYMENT_ACCENT, TRANSFER_ACCENT } from "#/lib/accents";
import { formatMoney } from "#/lib/format";
import { ACCENT } from "#/lib/m3";
import { placeLabel } from "#/lib/places";
import { canLinkRefund, canRefund, isRefund, wasRefunded } from "#/lib/refund";
import { canSplitSalary } from "#/lib/use-salary-split";
import { PAYMENT_METHOD_LABELS, type Transaction } from "#/types/api";

/** Amounts are stored positive; the type decides the sign shown and the colour. An expense is the
 * ordinary text colour, not red: most of what is listed is spending, and red everywhere shouts. */
const TYPE_SIGN = { income: "+", expense: "−", transfer: "" } as const;
const TYPE_AMOUNT_COLOR = {
	income: "success.main",
	expense: "text.primary",
	transfer: "text.primary",
} as const;

export function TxMethodChip({ t }: { t: Transaction }) {
	return t.type === "transfer" ? (
		<TonalChip accent={TRANSFER_ACCENT} label="Transfer" />
	) : (
		<TonalChip
			accent={PAYMENT_ACCENT[t.payment_method]}
			label={PAYMENT_METHOD_LABELS[t.payment_method]}
		/>
	);
}

/** "Adjustment" on a balance correction, and a note when the account is left out of the totals:
 * neither counts as income or spending. */
export function TxStatsChips({ t }: { t: Transaction }) {
	return (
		<>
			{t.adjustment && (
				<TonalChip
					accent={ACCENT.slate}
					label="Adjustment"
					title="A correction that makes the account match its bank: not income or spending"
				/>
			)}
			{t.latitude != null && (
				<TonalChip accent={ACCENT.pink} label={placeLabel(t)} title="Marked on the map" />
			)}
			{t.account?.exclude_from_stats && (
				<TonalChip
					accent={ACCENT.slate}
					label="Not in my totals"
					title="This account is left out of your totals and reports"
				/>
			)}
		</>
	);
}

/** "Refund" on money given back, and how much of a purchase has been refunded. */
export function TxRefundChip({ t }: { t: Transaction }) {
	if (isRefund(t)) return <TonalChip accent={ACCENT.green} label="Refund" />;
	if (!wasRefunded(t)) return null;
	return (
		<TonalChip
			accent={ACCENT.amber}
			label={
				canRefund(t) ? `Refunded ${formatMoney(t.refunded_amount, t.currency)}` : "Fully refunded"
			}
		/>
	);
}

/** The group it belongs to, opening that group. */
export function TxGroupChip({ t }: { t: Transaction }) {
	if (!t.group) return null;
	return (
		<Link
			to="/groups"
			search={{ group: t.group.id, page: 1, pageSize: 20 }}
			style={{ textDecoration: "none" }}
			title={`Open the group "${t.group.name}"`}
		>
			<TonalChip accent={ACCENT.blue} label={t.group.name} clickable />
		</Link>
	);
}

export function TxSubscriptionChip({ t }: { t: Transaction }) {
	if (!t.subscription) return null;
	return (
		<Chip
			icon={<AutorenewIcon />}
			label={t.subscription.name}
			size="small"
			variant="outlined"
			sx={{ display: "flex", width: "fit-content" }}
		/>
	);
}

export function TxAmount({ t, baseCurrency }: { t: Transaction; baseCurrency: string }) {
	return (
		<>
			<Typography
				variant="body2"
				sx={{
					fontWeight: 600,
					color: TYPE_AMOUNT_COLOR[t.type],
					fontVariantNumeric: "tabular-nums",
				}}
			>
				{TYPE_SIGN[t.type]}
				<Money amount={t.amount} currency={t.currency} />
			</Typography>
			{t.type === "transfer" && t.to_account && t.to_account.currency !== t.currency && (
				<Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
					→ <Money amount={t.to_amount ?? "0"} currency={t.to_account.currency} />
				</Typography>
			)}
			{t.type !== "transfer" && t.currency !== baseCurrency && (
				<Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
					≈ {TYPE_SIGN[t.type]}
					<Money amount={t.base_amount} currency={baseCurrency} /> @ {Number(t.exchange_rate)}
				</Typography>
			)}
		</>
	);
}

/** The actions on a transaction, as labelled buttons (they live in the detail drawer, which has
 * the room). Edit is the main one; Delete is last and red. */
export function TxActions({
	t,
	onConvert,
	onSplit,
	onRefund,
	onDuplicate,
	onEdit,
	onDelete,
}: {
	t: Transaction;
	onConvert: () => void;
	onSplit: () => void;
	onRefund: () => void;
	onDuplicate: () => void;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const secondary = { variant: "outlined", color: "inherit", size: "small" } as const;
	return (
		<>
			{!t.adjustment && (
				<Button variant="contained" size="small" startIcon={<EditOutlinedIcon />} onClick={onEdit}>
					Edit
				</Button>
			)}
			{!t.adjustment && canRefund(t) && (
				<Button {...secondary} startIcon={<UndoIcon />} onClick={onRefund}>
					Refund
				</Button>
			)}
			{!t.adjustment && canLinkRefund(t) && (
				<Button
					{...secondary}
					startIcon={<InsertLinkOutlinedIcon />}
					title="This is a refund: link it to the purchase"
					onClick={onRefund}
				>
					Link to a purchase
				</Button>
			)}
			{!t.adjustment && canSplitSalary(t) && (
				<Button
					{...secondary}
					startIcon={<CallSplitIcon />}
					title="Split this salary between accounts and goals"
					onClick={onSplit}
				>
					Split salary
				</Button>
			)}
			{!t.adjustment && t.type === "expense" && !t.subscription && (
				<Button {...secondary} startIcon={<AutorenewIcon />} onClick={onConvert}>
					Make subscription
				</Button>
			)}
			{!t.adjustment && !isRefund(t) && (
				<Button {...secondary} startIcon={<ContentCopyOutlinedIcon />} onClick={onDuplicate}>
					Duplicate
				</Button>
			)}
			<Button
				variant="outlined"
				color="error"
				size="small"
				startIcon={<DeleteOutlineIcon />}
				onClick={onDelete}
			>
				Delete
			</Button>
		</>
	);
}
