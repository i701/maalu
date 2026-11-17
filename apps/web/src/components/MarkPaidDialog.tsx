import { zodResolver } from "@hookform/resolvers/zod";
import Grid from "@mui/material/Grid";
import { type Control, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { formatMoney, formatTime } from "#/lib/format";
import { baseOf, payBody } from "#/lib/mark-paid";
import { localToday } from "#/lib/planned";
import { useSheet } from "#/lib/sheet";
import { txTitle } from "#/lib/tx-display";
import { useAction } from "#/lib/use-action";
import { exchangeRate, positiveAmount, postTransactionFn, timeOfDay } from "#/server/transactions";
import type { Transaction } from "#/types/api";
import FormDialog from "./FormDialog";
import FormTextField from "./FormTextField";
import { useNotify } from "./Notify";

/** "45.0000" as "45": the API sends four decimals, a person types fewer. */
const tidy = (amount: string) => (amount.includes(".") ? amount.replace(/\.?0+$/, "") : amount);

/** A transfer only takes the day and time; a rate only counts when no charged amount is given. */
const markPaidSchema = (transfer: boolean) =>
	z
		.object({
			amount: transfer ? z.string() : positiveAmount,
			rate: z.string().trim(),
			charged: positiveAmount.or(z.literal("")),
			date: z.iso.date("Choose a date"),
			time: timeOfDay.or(z.literal("")),
		})
		.superRefine(({ rate, charged }, ctx) => {
			if (charged === "" && rate !== "" && !exchangeRate.safeParse(rate).success)
				ctx.addIssue({ code: "custom", path: ["rate"], message: "Enter a valid rate" });
		});

type Schema = ReturnType<typeof markPaidSchema>;
type FormControl = Control<z.input<Schema>, unknown, z.output<Schema>>;

/** For a bill in another currency: the rate it was paid at, or what it really cost. */
function RateFields({
	control,
	charged,
	preview,
	planned,
	baseCurrency,
}: {
	control: FormControl;
	charged: string;
	/** What the amount comes to in the base currency at this rate, if it can be worked out */
	preview: string | null;
	planned: string;
	baseCurrency: string;
}) {
	return (
		<>
			<Grid size={6}>
				<FormTextField
					control={control}
					name="rate"
					label="Exchange rate"
					disabled={charged.trim() !== ""}
					helperText={
						preview && charged.trim() === ""
							? `Planned at ${planned}. Comes to ${formatMoney(preview, baseCurrency)}`
							: `Planned at ${planned}`
					}
					slotProps={{ htmlInput: { inputMode: "decimal" } }}
				/>
			</Grid>
			<Grid size={6}>
				<FormTextField
					control={control}
					name="charged"
					label={`Charged in ${baseCurrency}`}
					helperText="Optional: the exact amount taken. The rate is worked out from it"
					slotProps={{ htmlInput: { inputMode: "decimal" } }}
				/>
			</Grid>
		</>
	);
}

/** Turns a planned transaction into a real one. The bill is rarely exactly what was planned (and a
 * salary never is), so the date (today) and the amount can be corrected on the way. A bill in
 * another currency can also take the rate it was really paid at, or what it really cost, since a
 * server bill in dollars changes both. */
export default function MarkPaidDialog({
	transaction,
	baseCurrency,
	onPaid,
	onClose,
}: {
	transaction: Transaction;
	/** Your base currency: a bill in any other currency shows the rate fields */
	baseCurrency?: string;
	/** Called once it has been marked, with the planned transaction as it was */
	onPaid?: (transaction: Transaction) => void;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const income = transaction.type === "income";
	// a transfer moves what was planned: only the day (and time) it happened can differ
	const transfer = transaction.type === "transfer";
	const foreign = Boolean(baseCurrency && transaction.currency !== baseCurrency);
	const plannedRate = tidy(transaction.exchange_rate);
	const { control, handleSubmit } = useForm<z.input<Schema>, unknown, z.output<Schema>>({
		resolver: zodResolver(markPaidSchema(transfer)),
		defaultValues: {
			amount: tidy(transaction.amount),
			rate: plannedRate,
			charged: "",
			date: localToday(),
			time: formatTime(transaction.transaction_time) ?? "",
		},
	});
	const [amount, rate, charged] = useWatch({ control, name: ["amount", "rate", "charged"] });

	async function submit(v: z.output<Schema>) {
		const ok = await run(() =>
			postTransactionFn({
				data: {
					id: transaction.id,
					transaction_date: v.date,
					transaction_time: v.time || null,
					...(transfer
						? {}
						: payBody({
								amount: v.amount,
								foreign,
								rate: v.rate,
								plannedRate,
								charged: v.charged,
							})),
				},
			}),
		);
		if (ok) {
			notify(
				`"${txTitle(transaction)}" marked as ${transfer ? "done" : income ? "received" : "paid"}`,
			);
			onPaid?.(transaction);
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={transfer ? "Mark as done" : income ? "Mark as received" : "Mark as paid"}
			error={error}
			pending={pending}
			onSubmit={handleSubmit(submit)}
			sheet={sheet}
			maxWidth="xs"
		>
			<Grid container spacing={2}>
				{!transfer && (
					<Grid size={12}>
						<FormTextField
							control={control}
							name="amount"
							label={income ? "Amount received" : "Amount"}
							required
							autoFocus
							onFocus={(e) => e.target.select()}
							helperText={
								income
									? `Expected: ${formatMoney(transaction.amount, transaction.currency)}. Type what actually arrived`
									: `Planned: ${formatMoney(transaction.amount, transaction.currency)}. Change it if the real amount differs`
							}
							slotProps={{ htmlInput: { inputMode: "decimal" } }}
						/>
					</Grid>
				)}
				{foreign && baseCurrency && !transfer && (
					<RateFields
						control={control}
						charged={charged}
						preview={baseOf(amount, rate)}
						planned={plannedRate}
						baseCurrency={baseCurrency}
					/>
				)}
				<Grid size={6}>
					<FormTextField
						control={control}
						name="date"
						label={transfer ? "Done on" : income ? "Received on" : "Paid on"}
						type="date"
						required
						slotProps={{ inputLabel: { shrink: true } }}
					/>
				</Grid>
				<Grid size={6}>
					<FormTextField
						control={control}
						name="time"
						label="Time"
						type="time"
						slotProps={{ inputLabel: { shrink: true } }}
					/>
				</Grid>
			</Grid>
		</FormDialog>
	);
}
