import Autocomplete from "@mui/material/Autocomplete";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { type FormEvent, useState } from "react";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import {
	TRANSACTION_TYPES,
	TRANSACTION_TYPE_LABELS,
	type Account,
	type Category,
	type Subscription,
	type Tag,
	type Transaction,
	type TransactionTemplate,
	type TransactionType,
	type Vendor,
} from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";
import SaveTemplateDialog from "./SaveTemplateDialog";
import TagsField from "./TagsField";
import VendorField from "./VendorField";
import { Cell, RevealCell } from "./transaction-form/Cells";
import FormFooter from "./transaction-form/FormFooter";
import OrdinaryFields from "./transaction-form/OrdinaryFields";
import TemplatePicker from "./transaction-form/TemplatePicker";
import TransferFields from "./transaction-form/TransferFields";
import { messageAfterSave } from "./transaction-form/budget-warning";
import { useFormFields } from "./transaction-form/useFormFields";
import { useSplits } from "./transaction-form/useSplits";
import { useVendorDefaults } from "./transaction-form/useVendorDefaults";
import {
	accountChoices,
	buildTemplateRequest,
	buildTransactionRequest,
	seedAfterSave,
	seedFromTemplate,
	subscriptionChoices,
	type TransactionSeed,
} from "./transaction-form/request";

const TYPE_COLOR = { income: "success", expense: "error", transfer: "info" } as const;

export default function TransactionForm({
	transaction,
	seed: startSeed,
	templates,
	tags,
	vendors,
	categories,
	subscriptions,
	accounts: activeAccounts,
	currencies,
	baseCurrency,
	onClose,
}: {
	/** undefined = create a new transaction */
	transaction?: Transaction;
	/** Pre-fills a new transaction, for example a duplicate of an existing one. */
	seed?: TransactionSeed;
	/** Saved starting points to choose from when adding a transaction. */
	templates: TransactionTemplate[];
	/** Every existing tag, to pick from. */
	tags: Tag[];
	vendors: Vendor[];
	categories: Category[];
	subscriptions: Subscription[];
	accounts: Account[];
	currencies: string[];
	baseCurrency: string;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const [localError, setLocalError] = useState<string | null>(null);
	const [another, setAnother] = useState(false);
	const [savingTemplate, setSavingTemplate] = useState<FormData | null>(null);
	const accounts = accountChoices(activeAccounts, transaction);
	const fields = useFormFields({ transaction, startSeed, accounts, baseCurrency });
	const {
		seed,
		type,
		isTransfer,
		accountId,
		toAccountId,
		account,
		toAccount,
		currency,
		effectiveCurrency,
		foreign,
		crossCurrency,
		paymentMethod,
		subscription,
		date,
		switched,
	} = fields;
	const splits = useSplits(seed);
	const vendorDefaults = useVendorDefaults(vendors, seed, !splits.enabled);
	const subscriptionOptions = subscriptionChoices(subscriptions, transaction);

	function changeType(next: TransactionType) {
		fields.changeType(next);
		setLocalError(null);
	}

	function fillFrom(next: TransactionSeed) {
		fields.fillFrom(next);
		vendorDefaults.reset(next);
		splits.reset();
		setLocalError(null);
	}

	const formState = () => ({
		type,
		transaction,
		accountId,
		toAccountId,
		account,
		toAccount,
		crossCurrency,
		foreign,
		subscription,
		splits: type !== "transfer" && splits.enabled ? splits : null,
	});

	async function submit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const form = new FormData(e.currentTarget); // read now: the event is gone after an await
		const request = buildTransactionRequest(form, formState());
		if ("error" in request) return setLocalError(request.error);
		setLocalError(null);
		if (await run(request.send)) {
			const message = await messageAfterSave({
				success: request.success,
				type,
				form,
				itemCategories: splits.enabled ? splits.rows.map((r) => r.category) : null,
			});
			notify(message.text, message.severity);
			if (another && !transaction) {
				fillFrom(seedAfterSave(form, formState()));
				// the form was cleared: put the cursor back on the amount, ready for the next one
				requestAnimationFrame(() =>
					document.querySelector<HTMLInputElement>('input[name="amount"]')?.focus(),
				);
			} else sheet.close();
		}
	}

	return (
		<>
			<FormDialog
				title={transaction ? "Edit transaction" : "Add transaction"}
				error={localError ?? error}
				pending={pending}
				onSubmit={submit}
				sheet={sheet}
			>
				<Grid container columnSpacing={2} key={fields.round}>
					{!transaction && templates.length > 0 && (
						<Cell size={12}>
							<TemplatePicker templates={templates} onPick={(t) => fillFrom(seedFromTemplate(t))} />
						</Cell>
					)}
					<Cell size={12}>
						<ToggleButtonGroup
							exclusive
							fullWidth
							size="small"
							value={type}
							onChange={(_, next: TransactionType | null) => next && changeType(next)}
							aria-label="Transaction type"
						>
							{TRANSACTION_TYPES.map((t) => (
								<ToggleButton key={t} value={t} color={TYPE_COLOR[t]} sx={{ py: 1 }}>
									{TRANSACTION_TYPE_LABELS[t]}
								</ToggleButton>
							))}
						</ToggleButtonGroup>
					</Cell>

					{isTransfer ? (
						<TransferFields
							key="transfer"
							accounts={accounts}
							accountId={accountId}
							toAccountId={toAccountId}
							onPickAccount={fields.pickAccount}
							onPickToAccount={fields.setToAccountId}
							crossCurrency={crossCurrency}
							seed={seed}
							switched={switched}
						/>
					) : (
						<OrdinaryFields
							key="ordinary"
							type={type}
							accounts={accounts}
							accountId={accountId}
							onPickAccount={fields.pickAccount}
							currencies={currencies}
							currency={currency}
							onCurrencyChange={fields.setCurrency}
							effectiveCurrency={effectiveCurrency}
							foreign={foreign}
							baseCurrency={baseCurrency}
							paymentMethod={paymentMethod}
							onPaymentMethodChange={fields.setPaymentMethod}
							seed={seed}
							switched={switched}
							splits={splits}
							date={date}
							categories={categories}
							category={{
								defaultValue: vendorDefaults.categoryDefault,
								remountKey: vendorDefaults.categoryKey,
								onChange: vendorDefaults.onCategoryChange,
							}}
						/>
					)}

					<Cell size={{ xs: 12, sm: isTransfer ? 12 : 6 }}>
						<TextField
							label="Date"
							name="transaction_date"
							type="date"
							value={date}
							onChange={(e) => fields.setDate(e.target.value)}
							required
							slotProps={{ inputLabel: { shrink: true } }}
						/>
					</Cell>

					<RevealCell size={{ xs: 12, sm: 6 }} show={!isTransfer}>
						<VendorField
							vendors={vendors}
							defaultValue={seed?.vendorName ?? ""}
							onValueChange={vendorDefaults.onVendorChange}
						/>
					</RevealCell>

					<RevealCell size={12} show={type === "expense"}>
						<Autocomplete
							options={subscriptionOptions}
							value={subscription}
							onChange={(_, v) => fields.setSubscription(v)}
							getOptionLabel={(o) => o.name}
							isOptionEqualToValue={(a, b) => a.id === b.id}
							noOptionsText="No subscriptions yet"
							renderInput={(params) => (
								<TextField
									{...params}
									label="Subscription"
									helperText="Optional. Marks this as a payment for a recurring charge"
								/>
							)}
						/>
					</RevealCell>

					<Cell size={12}>
						<TagsField
							key={vendorDefaults.tagsKey}
							tags={tags}
							defaultValue={vendorDefaults.tagsDefault}
							onChange={vendorDefaults.onTagsChange}
						/>
					</Cell>

					<Cell size={12}>
						<TextField
							label="Description"
							name="description"
							defaultValue={seed?.description ?? ""}
							multiline
							minRows={2}
						/>
					</Cell>

					<Cell size={12}>
						<FormFooter
							another={transaction ? undefined : another}
							onAnotherChange={setAnother}
							onSaveTemplate={setSavingTemplate}
						/>
					</Cell>
				</Grid>
			</FormDialog>
			{savingTemplate && (
				<SaveTemplateDialog
					build={(name) => buildTemplateRequest(savingTemplate, formState(), name)}
					onClose={() => setSavingTemplate(null)}
				/>
			)}
		</>
	);
}
