import AccountSpark from "#/components/account/AccountSpark";
import AdjustBalanceDialog from "#/components/AdjustBalanceDialog";
import BankChip from "#/components/BankChip";
import CreditUsage from "#/components/CreditUsage";
import Money from "#/components/Money";
import { useNotify } from "#/components/Notify";
import RateHistoryDialog from "#/components/RateHistoryDialog";
import { RouterLink } from "#/components/RouterLinks";
import ShapeTile from "#/components/ShapeTile";
import StatementLine from "#/components/StatementLine";
import IconSymbol from "#/components/Symbol";
import { accentText, creditUsage, tintBackground } from "#/lib/accounts";
import { ACCENT, type Accent } from "#/lib/m3";
import { MORPH_TRANSITION, morphUp } from "#/lib/shape";
import { useAction } from "#/lib/use-action";
import { archiveAccountFn } from "#/server/accounts";
import type { Account, AccountGroup, AccountTrend, CardStatement } from "#/types/api";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import TuneIcon from "@mui/icons-material/Tune";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useState } from "react";

/** Icon and blob shape for each account type's cards (the colour is the card's own tint). */
const GROUP_TILE: Record<AccountGroup, { symbol: string; shape: number }> = {
	cash: { symbol: "payments", shape: 1 },
	accounts: { symbol: "account_balance", shape: 0 },
	card: { symbol: "credit_card", shape: 3 },
	savings: { symbol: "savings", shape: 5 },
	prepaid: { symbol: "sell", shape: 4 },
	investments: { symbol: "savings", shape: 6 },
	overdrafts: { symbol: "info", shape: 7 },
	loan: { symbol: "receipt_long", shape: 3 },
	insurance: { symbol: "verified", shape: 2 },
	others: { symbol: "category", shape: 0 },
};

const isNegative = (amount: string) => amount.startsWith("-");

/** Closes the account straight away: nothing is lost and "Archived" below brings it back. */
function ArchiveButton({ account }: { account: Account }) {
	const { run, pending } = useAction();
	const notify = useNotify();
	return (
		<IconButton
			aria-label="Archive"
			title="Archive"
			size="small"
			disabled={pending}
			onClick={async () => {
				if (await run(() => archiveAccountFn({ data: { id: account.id } })))
					notify(`"${account.name}" archived. You'll find it under Archived`);
			}}
		>
			<Inventory2OutlinedIcon fontSize="small" />
		</IconButton>
	);
}

/** Opens the dialog that makes an account match its bank. */
function AdjustButton({ account }: { account: Account }) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<IconButton
				aria-label="Adjust balance"
				title="Adjust balance"
				size="small"
				onClick={() => setOpen(true)}
			>
				<TuneIcon fontSize="small" />
			</IconButton>
			{open && <AdjustBalanceDialog account={account} onClose={() => setOpen(false)} />}
		</>
	);
}

/** Opens the history of the market rate for a foreign-currency account. */
function RateHistoryButton({ account, baseCurrency }: { account: Account; baseCurrency: string }) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<IconButton
				aria-label="Rate history"
				title="Rate history"
				size="small"
				onClick={() => setOpen(true)}
			>
				<ShowChartIcon fontSize="small" />
			</IconButton>
			{open && (
				<RateHistoryDialog
					account={account}
					baseCurrency={baseCurrency}
					onClose={() => setOpen(false)}
				/>
			)}
		</>
	);
}

/** One account's tile on the Accounts list: its own hue, the balance, and the row of actions.
 * Three rows with room between them: who it is (the name, then the bank and the number) and what
 * it holds on the right; the lines about credit and statements when it has any; and the balance's
 * trend with the actions. */
export default function AccountCard({
	account,
	tint,
	baseCurrency,
	statement,
	trend,
	onEdit,
	onDelete,
}: {
	account: Account;
	tint: Accent;
	baseCurrency: string;
	statement?: CardStatement;
	trend?: AccountTrend;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const tile = GROUP_TILE[account.group];
	return (
		<Box
			sx={{
				bgcolor: tintBackground(tint),
				p: 2,
				// a column that fills the grid cell, so the footer can sit at the bottom of every card
				display: "flex",
				flexDirection: "column",
				gap: 1.5,
				// the action icons in the card's own hue
				"& .MuiIconButton-root": {
					color: accentText(tint),
				},
				...morphUp("xl"),
				transition: `${MORPH_TRANSITION}, transform var(--spring-spatial-fast-dur) var(--spring-spatial-fast)`,
				"&:active": { transform: "scale(.97)" },
			}}
		>
			<Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
				<Box sx={{ display: { xs: "none", md: "block" }, flexShrink: 0 }}>
					<ShapeTile shape={tile.shape} size={48} accent={ACCENT[tint]}>
						<IconSymbol name={tile.symbol} size={22} filled />
					</ShapeTile>
				</Box>
				<Box sx={{ flex: 1, minWidth: 0 }}>
					<RouterLink
						to="/accounts/$id"
						params={{ id: account.id }}
						underline="hover"
						color="inherit"
						noWrap
						sx={{ display: "block", fontWeight: 600, fontSize: 15, lineHeight: 1.35 }}
					>
						{account.name}
					</RouterLink>
					{account.bank && (
						<Box sx={{ mt: 0.75 }}>
							<BankChip bank={account.bank} />
						</Box>
					)}
				</Box>
				<Box sx={{ textAlign: "right", flexShrink: 0, maxWidth: "55%" }}>
					<Typography
						sx={{
							fontWeight: 600,
							fontSize: 22,
							lineHeight: 1.25,
							// the card's own hue; a debt keeps the error colour
							color: isNegative(account.balance) ? "error.main" : accentText(tint),
						}}
					>
						<Money amount={account.balance} currency={account.currency} />
					</Typography>
					{account.currency !== baseCurrency && (
						<Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
							≈ <Money amount={account.base_balance} currency={baseCurrency} /> @{" "}
							{Number(account.exchange_rate)}
							{account.auto_rate ? " · auto" : ""}
						</Typography>
					)}
					<Box sx={{ mt: 0.75 }}>
						<AccountSpark trend={trend} align="end" />
					</Box>
				</Box>
			</Box>
			{(account.description || account.exclude_from_stats || creditUsage(account) || statement) && (
				<Box sx={{ display: "grid", gap: 0.5 }}>
					<CreditUsage account={account} />
					<StatementLine statement={statement} />
					{account.description && (
						<Typography variant="caption" sx={{ color: "text.secondary" }}>
							{account.description}
						</Typography>
					)}
				</Box>
			)}
			{/* always the bottom of the card, whatever the cards beside it hold, so they all line up */}
			<Box sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 34, mt: "auto" }}>
				{account.account_number && (
					<Typography
						noWrap
						title={account.account_number}
						sx={{
							flex: 1,
							minWidth: 0,
							fontSize: 13,
							fontVariantNumeric: "tabular-nums",
							color: "text.secondary",
						}}
					>
						{account.account_number}
					</Typography>
				)}
				<Box sx={{ display: "flex", ml: "auto", mr: -0.5, flexShrink: 0 }}>
					<IconButton aria-label="Edit" title="Edit" size="small" onClick={onEdit}>
						<EditOutlinedIcon fontSize="small" />
					</IconButton>
					{account.currency !== baseCurrency && (
						<RateHistoryButton account={account} baseCurrency={baseCurrency} />
					)}
					<AdjustButton account={account} />
					<ArchiveButton account={account} />
					<IconButton aria-label="Delete" title="Delete" size="small" onClick={onDelete}>
						<DeleteOutlineIcon fontSize="small" />
					</IconButton>
				</Box>
			</Box>
		</Box>
	);
}
