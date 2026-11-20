import AutorenewIcon from "@mui/icons-material/Autorenew";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import InsertLinkOutlinedIcon from "@mui/icons-material/InsertLinkOutlined";
import UndoIcon from "@mui/icons-material/Undo";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { Link } from "@tanstack/react-router";
import Money from "#/components/Money";
import Symbol from "#/components/Symbol";
import TonalChip from "#/components/TonalChip";
import { PAYMENT_ACCENT, TRANSFER_ACCENT } from "#/lib/accents";
import { formatMoney } from "#/lib/format";
import { ACCENT } from "#/lib/m3";
import { placeLabel } from "#/lib/places";
import { canLinkRefund, canRefund, isRefund, wasRefunded } from "#/lib/refund";
import { canSplitSalary } from "#/lib/use-salary-split";
import { PAYMENT_METHOD_LABELS, type Transaction } from "#/types/api";

/** Amounts are stored positive; the type decides the sign shown and the colour. */
const TYPE_SIGN = { income: "+", expense: "−", transfer: "" } as const;
const TYPE_AMOUNT_COLOR = {
	income: "success.main",
	expense: "error.main",
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

const DIRECTION_SYMBOL = {
	income: "arrow_downward",
	expense: "arrow_upward",
	transfer: "payments",
} as const;

/** Before a big amount: a round badge with the type's arrow (the one its list tile has), in the
 * amount's colour and centred on the figure. A + or − character sits on the text baseline at
 * another size and looks adrift beside the number; a badge does not. */
function DirectionBadge({ type }: { type: Transaction["type"] }) {
	return (
		<Box
			sx={{
				width: 40,
				height: 40,
				mr: 1.5,
				flexShrink: 0,
				display: "grid",
				placeItems: "center",
				borderRadius: "50%",
				bgcolor: "color-mix(in srgb, currentColor 14%, transparent)",
			}}
		>
			<Symbol name={DIRECTION_SYMBOL[type]} size={24} />
		</Box>
	);
}

export function TxAmount({
	t,
	baseCurrency,
	coloured = false,
}: {
	t: Transaction;
	baseCurrency: string;
	/** A direction badge beside the figure, drawn in the figure font. */
	coloured?: boolean;
}) {
	return (
		<>
			<Typography
				variant="body2"
				sx={{
					fontWeight: 600,
					color: TYPE_AMOUNT_COLOR[t.type],
					fontVariantNumeric: "tabular-nums",
					// a big amount: the badge is centred on the figure, not set on its baseline
					...(coloured && { display: "flex", alignItems: "center", justifyContent: "flex-end" }),
				}}
			>
				{coloured ? <DirectionBadge type={t.type} /> : TYPE_SIGN[t.type]}
				<Money amount={t.amount} currency={t.currency} figure={coloured} />
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
	// every button is a filled key in the brand navy; Delete is the deep red
	const secondary = { variant: "contained" } as const;
	return (
		<>
			{!t.adjustment && (
				<Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={onEdit}>
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
				variant="contained"
				color="error"
				startIcon={<DeleteOutlineIcon />}
				onClick={onDelete}
			>
				Delete
			</Button>
		</>
	);
}
