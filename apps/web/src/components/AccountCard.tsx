import AccountSpark from "#/components/account/AccountSpark";
import Money from "#/components/Money";
import { accentText, tintBackground } from "#/lib/accounts";
import { MORPH_TRANSITION, morphUp } from "#/lib/shape";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import TuneIcon from "@mui/icons-material/Tune";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import AccountIdentity from "#/components/AccountIdentity";
import AdjustBalanceDialog from "#/components/AdjustBalanceDialog";
import CreditUsage from "#/components/CreditUsage";
import MobileCard from "#/components/MobileCard";
import { useNotify } from "#/components/Notify";
import RateHistoryDialog from "#/components/RateHistoryDialog";
import { RouterLink } from "#/components/RouterLinks";
import ShapeTile from "#/components/ShapeTile";
import StatementLine from "#/components/StatementLine";
import Symbol from "#/components/Symbol";
import { ACCENT, type Accent } from "#/lib/m3";
import { useAction } from "#/lib/use-action";
import { archiveAccountFn } from "#/server/accounts";
import type { Account, AccountGroup, AccountTrend, CardStatement } from "#/types/api";

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

/** One account's tile on the Accounts list: its own hue, the balance, and the row of actions. */
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
	return (
		<Box
			sx={{
				bgcolor: tintBackground(tint),
				// the action icons in the card's own hue
				"& .MuiIconButton-root": {
					color: accentText(tint),
				},
				...morphUp("xl"),
				transition: `${MORPH_TRANSITION}, transform var(--spring-spatial-fast-dur) var(--spring-spatial-fast)`,
				"&:active": { transform: "scale(.97)" },
			}}
		>
			<MobileCard
				leading={
					<ShapeTile shape={GROUP_TILE[account.group].shape} size={52} accent={ACCENT[tint]}>
						<Symbol name={GROUP_TILE[account.group].symbol} size={24} filled />
					</ShapeTile>
				}
				primary={
					<RouterLink
						to="/accounts/$id"
						params={{ id: account.id }}
						underline="hover"
						color="inherit"
						sx={{ fontWeight: 500, fontSize: 14 }}
					>
						{account.name}
					</RouterLink>
				}
				secondary={
					<>
						<AccountIdentity account={account} />
						<CreditUsage account={account} />
						<StatementLine statement={statement} />
						{account.description && (
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
								{account.description}
							</Typography>
						)}
						<AccountSpark trend={trend} />
					</>
				}
				// a compact row keeps just the name and the trend line under it
				brief={<AccountSpark trend={trend} />}
				end={
					<Typography
						variant="body2"
						sx={{
							fontWeight: 600,
							// the card's own hue; a debt keeps the error colour
							color: isNegative(account.balance) ? "error.main" : accentText(tint),
						}}
					>
						<Money amount={account.balance} currency={account.currency} />
					</Typography>
				}
				endSecondary={
					account.currency !== baseCurrency ? (
						<Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
							≈ <Money amount={account.base_balance} currency={baseCurrency} /> @{" "}
							{Number(account.exchange_rate)}
							{account.auto_rate ? " · auto" : ""}
						</Typography>
					) : (
						<></>
					)
				}
				actions={
					<>
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
					</>
				}
			/>
		</Box>
	);
}
