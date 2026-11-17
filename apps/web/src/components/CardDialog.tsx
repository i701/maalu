import { zodResolver } from "@hookform/resolvers/zod";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { canRepayFrom } from "#/lib/cards";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { cardFormSchema, createCardFn, updateCardFn } from "#/server/cards";
import type { Account, Card } from "#/types/api";
import FormDialog from "./FormDialog";
import FormTextField from "./FormTextField";
import { useNotify } from "./Notify";

/**
 * Add or change a card on an account. The account decides the kind: a card on a credit card
 * account is a credit card (repaid from a bank account you choose), a card on any other account is
 * a debit card that spends from it.
 */
export default function CardDialog({
	account,
	accounts,
	card,
	onClose,
}: {
	account: Account;
	/** Every account, for choosing what a credit card is repaid from */
	accounts: Account[];
	/** undefined = add a new card */
	card?: Card;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const credit = account.group === "card";
	const repayChoices = accounts.filter(
		(a) => a.id !== account.id && a.archived_at === null && canRepayFrom(a.group),
	);

	const { control, handleSubmit } = useForm({
		resolver: zodResolver(cardFormSchema),
		defaultValues: {
			name: card?.name ?? "",
			last_digits: card?.last_digits ?? "",
			repay: card?.repay_account?.id ?? "",
		},
	});

	async function submit({ name, last_digits: digits, repay }: z.output<typeof cardFormSchema>) {
		const ok = await run(() =>
			card
				? updateCardFn({
						data: {
							id: card.id,
							changes: {
								name,
								last_digits: digits || null,
								...(credit ? { repay_account_id: repay || null } : {}),
							},
						},
					})
				: createCardFn({
						data: {
							name,
							kind: credit ? "credit" : "debit",
							last_digits: digits || undefined,
							account_id: account.id,
							repay_account_id: credit && repay ? repay : undefined,
						},
					}),
		);
		if (ok) {
			notify(card ? "Card updated" : "Card added");
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={card ? "Edit card" : credit ? "Add credit card" : "Add debit card"}
			error={error}
			pending={pending}
			onSubmit={handleSubmit(submit)}
			noValidate
			sheet={sheet}
			maxWidth="xs"
		>
			<Grid container spacing={2}>
				<Grid size={12}>
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						{credit
							? `What you spend with this card is owed on ${account.name}.`
							: `This card spends from ${account.name}: it has no balance of its own.`}
					</Typography>
				</Grid>
				<Grid size={{ xs: 12, sm: 8 }}>
					<FormTextField
						control={control}
						name="name"
						label="Name"
						placeholder={credit ? "BML Visa credit" : "MIB Visa debit"}
						required
						autoFocus
						slotProps={{ htmlInput: { maxLength: 100 } }}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 4 }}>
					<FormTextField
						control={control}
						name="last_digits"
						label="Last 4 digits"
						placeholder="2815"
						slotProps={{
							htmlInput: {
								inputMode: "numeric",
								maxLength: 4,
							},
						}}
					/>
				</Grid>
				{credit && (
					<Grid size={12}>
						<FormTextField
							control={control}
							name="repay"
							select
							label="Repaid from"
							helperText="The bank account that pays this card off. Optional"
						>
							<MenuItem value="">Not set</MenuItem>
							{repayChoices.map((a) => (
								<MenuItem key={a.id} value={a.id}>
									{a.name}
								</MenuItem>
							))}
						</FormTextField>
					</Grid>
				)}
			</Grid>
		</FormDialog>
	);
}
