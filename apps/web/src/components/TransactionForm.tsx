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
	type Card,
	type Category,
	type Subscription,
	type Tag,
	type Transaction,
	type TransactionTemplate,
	type TransactionType,
	type Vendor,
} from "#/types/api";
import { placeOf } from "#/lib/places";
import AttachmentsField from "./AttachmentsField";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";
import SaveTemplateDialog from "./SaveTemplateDialog";
import TagsField from "./TagsField";
import LocationField from "./LocationField";
import VendorField from "./VendorField";
import { formatTime } from "#/lib/format";
import { Cell, RevealCell } from "./transaction-form/Cells";
import FormFooter from "./transaction-form/FormFooter";
import OrdinaryFields from "./transaction-form/OrdinaryFields";
import TemplatePicker from "./transaction-form/TemplatePicker";
import TransferFields from "./transaction-form/TransferFields";
import { messageAfterSave } from "./transaction-form/budget-warning";
import PlannedAndSubscription from "./transaction-form/PlannedAndSubscription";
import { useAttachments } from "./transaction-form/useAttachments";
import { useLinks } from "./transaction-form/useLinks";
import { useFormFields } from "./transaction-form/useFormFields";
import { useSplits } from "./transaction-form/useSplits";
import { useVendorDefaults } from "./transaction-form/useVendorDefaults";
import {
	accountChoices,
	buildTemplateRequest,
	buildTransactionRequest,
	seedAfterSave,
	seedFromTemplate,
	stateFrom,
	subscriptionChoices,
	type TransactionSeed,
} from "./transaction-form/request";

const TYPE_COLOR = { income: "success", expense: "error", transfer: "info" } as const;

export default function TransactionForm({
	transaction,
	seed: startSeed,
	templates,
	tags,
	defaultAccountId,
	vendors,
	categories,
	subscriptions,
	accounts: activeAccounts,
	cards,
	currencies,
	baseCurrency,
	onClose,
	onCreated,
}: {
	/** undefined = create a new transaction */
	transaction?: Transaction;
	/** Pre-fills a new transaction, for example a duplicate of an existing one. */
	seed?: TransactionSeed;
	/** Saved starting points to choose from when adding a transaction. */
	templates: TransactionTemplate[];
	/** Every existing tag, to pick from. */
	tags: Tag[];
	/** The account a new transaction starts in, if you set one. */
	defaultAccountId?: string | null;
	vendors: Vendor[];
	categories: Category[];
	subscriptions: Subscription[];
	accounts: Account[];
	/** Every card, to pick the one a purchase was paid with. */
	cards: Card[];
	currencies: string[];
	baseCurrency: string;
	onClose: () => void;
	/** Called with a transaction that was just created (not edited). */
	onCreated?: (created: Transaction) => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const [localError, setLocalError] = useState<string | null>(null);
	const [another, setAnother] = useState(false);
	const [savingTemplate, setSavingTemplate] = useState<FormData | null>(null);
	const accounts = accountChoices(activeAccounts, transaction);
	const fields = useFormFields({
		transaction,
		startSeed,
		accounts,
		cards,
		baseCurrency,
		defaultAccount: activeAccounts.find((a) => a.id === defaultAccountId),
	});
	const {
		seed,
		type,
		isTransfer,
		accountId,
		toAccountId,
		currency,
		effectiveCurrency,
		foreign,
		crossCurrency,
		paymentMethod,
		subscription,
		date,
		planned,
		switched,
		location,
	} = fields;
	const attachments = useAttachments(transaction?.id);
	const links = useLinks(transaction?.id);
	const splits = useSplits(seed);
	const vendorDefaults = useVendorDefaults(vendors, seed, !splits.enabled);
	const subscriptionOptions = subscriptionChoices(subscriptions, transaction);

	/** Picking a known vendor also marks its usual place, unless a place is already marked. */
	function onVendorChange(value: string, fromUser: boolean) {
		vendorDefaults.onVendorChange(value, fromUser);
		if (!fromUser || location) return;
		const typed = value.trim().toLowerCase();
		const spot = placeOf(vendors.find((v) => v.name.toLowerCase() === typed) ?? {});
		if (spot) fields.setLocation(spot);
	}

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

	const formState = () => stateFrom(fields, transaction, splits);

	async function submit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const form = new FormData(e.currentTarget); // read now: the event is gone after an await
		const request = buildTransactionRequest(form, formState());
		if ("error" in request) return setLocalError(request.error);
		setLocalError(null);
		let created: Transaction | undefined;
		const send = async () => {
			const res = await request.send();
			if (res.ok && !transaction) created = res.data;
			return res;
		};
		if (await run(send)) {
			const message = await messageAfterSave({
				success: request.success,
				type,
				form,
				itemCategories: splits.enabled ? splits.rows.map((r) => r.category) : null,
				planned,
			});
			notify(message.text, message.severity);
			// files picked on a new transaction go up now that it has an id
			for (const text of created ? await uploadPending(created.id, attachments, links) : [])
				if (text) notify(text, "warning");
			if (another && !transaction) {
				fillFrom(seedAfterSave(form, formState()));
				focusAmount(); // the form was cleared: ready for the next one
			} else sheet.close();
			if (created) onCreated?.(created);
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
							cards={cards}
							cardId={fields.cardId}
							onPickCard={fields.pickCard}
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

					<Cell size={6}>
						<TextField
							label="Date"
							name="transaction_date"
							type="date"
							value={date}
							onChange={(e) => fields.changeDate(e.target.value)}
							required
							slotProps={{ inputLabel: { shrink: true } }}
						/>
					</Cell>

					<Cell size={6}>
						<TextField
							label="Time"
							name="transaction_time"
							type="time"
							defaultValue={formatTime(transaction?.transaction_time ?? null) ?? ""}
							slotProps={{ inputLabel: { shrink: true } }}
						/>
					</Cell>

					<RevealCell size={12} show={!isTransfer}>
						<VendorField
							vendors={vendors}
							defaultValue={seed?.vendorName ?? ""}
							onValueChange={onVendorChange}
						/>
					</RevealCell>

					<RevealCell size={12} show={!isTransfer}>
						<LocationField value={location} onChange={fields.setLocation} />
					</RevealCell>

					<PlannedAndSubscription
						planned={planned}
						onPlannedChange={fields.setPlanned}
						isExpense={type === "expense"}
						options={subscriptionOptions}
						subscription={subscription}
						onSubscriptionChange={fields.setSubscription}
					/>

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
						<AttachmentsField state={attachments} links={links} />
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
} /** Put the cursor back on the amount. */
const focusAmount = () =>
	requestAnimationFrame(() =>
		document.querySelector<HTMLInputElement>('input[name="amount"]')?.focus(),
	);

/** Files and links picked on a new transaction go up now that it has an id: any that were skipped. */
const uploadPending = (
	id: string,
	attachments: ReturnType<typeof useAttachments>,
	links: ReturnType<typeof useLinks>,
) => Promise.all([attachments.uploadPending(id), links.savePending(id)]);
