import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { memo, useState } from "react";
import { cardText, cardsOf, repaymentSeed } from "#/lib/cards";
import { deleteCardFn } from "#/server/cards";
import { CARD_KIND_LABELS, type Account, type Card } from "#/types/api";
import CardDialog from "../CardDialog";
import ConfirmDelete from "../ConfirmDelete";
import TonalChip from "../TonalChip";
import { ACCENT } from "#/lib/m3";

/** An account's cards: the ones that spend from it (or, for a credit card account, the cards that
 * make up its debt), and the credit cards that are repaid from it. A credit card with a repayment
 * account has a Repay button, which starts the transfer that pays it off. */
const AccountCards = memo(function AccountCards({
	account,
	accounts,
	cards,
	onRepay,
}: {
	account: Account;
	accounts: Account[];
	cards: Card[];
	/** Start a repayment: opens the transaction form as a transfer */
	onRepay: (card: Card) => void;
}) {
	const [dialog, setDialog] = useState<{ card?: Card } | null>(null);
	const [deleting, setDeleting] = useState<Card | null>(null);
	const { own, repaid } = cardsOf(cards, account.id);
	const archived = account.archived_at !== null;
	// Only an account that holds money you spend, or a credit card, has cards.
	const canHaveCards = !["loan", "overdrafts"].includes(account.group);
	if (!canHaveCards && own.length === 0 && repaid.length === 0) return null;

	return (
		<Box
			sx={{
				p: 2.5,
				mb: 2,
				borderRadius: "var(--shape-xl)",
				bgcolor: "var(--md-sys-color-surface-container-low)",
			}}
		>
			<Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
				<Typography variant="h2" sx={{ fontSize: 18, fontWeight: 600 }}>
					Cards
				</Typography>
				{canHaveCards && !archived && (
					<Button size="small" startIcon={<AddIcon />} onClick={() => setDialog({})}>
						{account.group === "card" ? "Add credit card" : "Add debit card"}
					</Button>
				)}
			</Box>
			{own.length === 0 && repaid.length === 0 && (
				<Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
					{account.group === "card"
						? "Add the card to pick it on purchases. What you spend with it is owed here."
						: "Add the debit card for this account to pick it on purchases. It spends from this account."}
				</Typography>
			)}
			<Box component="ul" sx={{ listStyle: "none", m: 0, mt: 1, p: 0, display: "grid", gap: 1 }}>
				{own.map((c) => (
					<Box
						component="li"
						key={c.id}
						sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
					>
						<Typography sx={{ fontWeight: 500, fontSize: 14 }}>{cardText(c)}</Typography>
						<TonalChip
							label={CARD_KIND_LABELS[c.kind]}
							accent={c.kind === "credit" ? ACCENT.orange : ACCENT.blue}
						/>
						{c.repay_account && (
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
								Repaid from {c.repay_account.name}
							</Typography>
						)}
						<Box sx={{ flexGrow: 1 }} />
						{repaymentSeed(c) && !archived && (
							<Button size="small" onClick={() => onRepay(c)}>
								Repay
							</Button>
						)}
						<IconButton
							size="small"
							aria-label={`Edit ${c.name}`}
							onClick={() => setDialog({ card: c })}
						>
							<EditOutlinedIcon fontSize="small" />
						</IconButton>
						<IconButton size="small" aria-label={`Delete ${c.name}`} onClick={() => setDeleting(c)}>
							<DeleteOutlineIcon fontSize="small" />
						</IconButton>
					</Box>
				))}
				{repaid.map((c) => (
					<Box component="li" key={c.id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							{cardText(c)} is repaid from this account
						</Typography>
						{!archived && (
							<Button size="small" onClick={() => onRepay(c)}>
								Repay
							</Button>
						)}
					</Box>
				))}
			</Box>
			{dialog && (
				<CardDialog
					account={account}
					accounts={accounts}
					card={dialog.card}
					onClose={() => setDialog(null)}
				/>
			)}
			{deleting && (
				<ConfirmDelete
					title="Delete card"
					message={`Delete "${cardText(deleting)}"? Its transactions stay, and keep their account.`}
					onConfirm={() => deleteCardFn({ data: { id: deleting.id } })}
					onClose={() => setDeleting(null)}
				/>
			)}
		</Box>
	);
});

export default AccountCards;
