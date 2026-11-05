import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import { useState, type FormEvent } from "react";
import { formatMoney, formatTime } from "#/lib/format";
import { baseOf, payBody } from "#/lib/mark-paid";
import { localToday } from "#/lib/planned";
import { useSheet } from "#/lib/sheet";
import { txTitle } from "#/lib/tx-display";
import { useAction } from "#/lib/use-action";
import { postTransactionFn } from "#/server/transactions";
import type { Transaction } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";

/** "45.0000" as "45": the API sends four decimals, a person types fewer. */
const tidy = (amount: string) => (amount.includes(".") ? amount.replace(/\.?0+$/, "") : amount);

/** For a bill in another currency: the rate it was paid at, or what it really cost. */
function RateFields({
	rate,
	charged,
	preview,
	planned,
	baseCurrency,
	onRate,
	onCharged,
}: {
	rate: string;
	charged: string;
	/** What the amount comes to in the base currency at this rate, if it can be worked out */
	preview: string | null;
	planned: string;
	baseCurrency: string;
	onRate: (v: string) => void;
	onCharged: (v: string) => void;
}) {
	return (
		<>
			<Grid size={6}>
				<TextField
					label="Exchange rate"
					value={rate}
					onChange={(e) => onRate(e.target.value)}
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
				<TextField
					label={`Charged in ${baseCurrency}`}
					value={charged}
					onChange={(e) => onCharged(e.target.value)}
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
	const foreign = Boolean(baseCurrency && transaction.currency !== baseCurrency);
	const plannedRate = tidy(transaction.exchange_rate);
	const [amount, setAmount] = useState(() => tidy(transaction.amount));
	const [rate, setRate] = useState(plannedRate);
	const [charged, setCharged] = useState("");

	async function submit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		const text = (k: string) => String(f.get(k) ?? "").trim();
		const ok = await run(() =>
			postTransactionFn({
				data: {
					id: transaction.id,
					transaction_date: text("date"),
					transaction_time: text("time") || null,
					...payBody({ amount: amount.trim(), foreign, rate, plannedRate, charged }),
				},
			}),
		);
		if (ok) {
			notify(`"${txTitle(transaction)}" marked as ${income ? "received" : "paid"}`);
			onPaid?.(transaction);
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={income ? "Mark as received" : "Mark as paid"}
			error={error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
			maxWidth="xs"
		>
			<Grid container spacing={2}>
				<Grid size={12}>
					<TextField
						label={income ? "Amount received" : "Amount"}
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
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
				{foreign && baseCurrency && (
					<RateFields
						rate={rate}
						charged={charged}
						preview={baseOf(amount, rate)}
						planned={plannedRate}
						baseCurrency={baseCurrency}
						onRate={setRate}
						onCharged={setCharged}
					/>
				)}
				<Grid size={6}>
					<TextField
						label={income ? "Received on" : "Paid on"}
						name="date"
						type="date"
						defaultValue={localToday()}
						required
						slotProps={{ inputLabel: { shrink: true } }}
					/>
				</Grid>
				<Grid size={6}>
					<TextField
						label="Time"
						name="time"
						type="time"
						defaultValue={formatTime(transaction.transaction_time) ?? ""}
						slotProps={{ inputLabel: { shrink: true } }}
					/>
				</Grid>
			</Grid>
		</FormDialog>
	);
}
