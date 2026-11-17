import Grid from "@mui/material/Grid";
import { useState } from "react";
import { useWatch } from "react-hook-form";
import { placeOf } from "#/lib/places";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import {
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
import AttachmentsField from "./AttachmentsField";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";
import SaveTemplateDialog from "./SaveTemplateDialog";
import { messageAfterSave } from "./transaction-form/budget-warning";
import { Cell } from "./transaction-form/Cells";
import FormFooter from "./transaction-form/FormFooter";
import OrdinaryFields from "./transaction-form/OrdinaryFields";
import PlannedAndSubscription from "./transaction-form/PlannedAndSubscription";
import {
	accountChoices,
	buildTemplateRequest,
	buildTransactionRequest,
	seedAfterSave,
	seedFromTemplate,
	seedFromTransaction,
	subscriptionChoices,
	type TransactionSeed,
} from "./transaction-form/request";
import type { TxValues } from "./transaction-form/schema";
import TemplatePicker from "./transaction-form/TemplatePicker";
import TagsAndNote from "./transaction-form/TagsAndNote";
import TransferFields from "./transaction-form/TransferFields";
import TypeToggle from "./transaction-form/TypeToggle";
import { useAttachments } from "./transaction-form/useAttachments";
import { useFormFields } from "./transaction-form/useFormFields";
import { useLinks } from "./transaction-form/useLinks";
import { useSplits } from "./transaction-form/useSplits";
import { useVendorDefaults } from "./transaction-form/useVendorDefaults";
import WhenAndWhere from "./transaction-form/WhenAndWhere";

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
	// True from pressing Save until everything is done, not only while the save call runs: the
	// follow-up (budget warning, receipt uploads) happens after it, and the form stays locked then.
	const [busy, setBusy] = useState(false);
	const [another, setAnother] = useState(false);
	const [savingTemplate, setSavingTemplate] = useState(false);
	const accounts = accountChoices(activeAccounts, transaction);
	const firstSeed = transaction ? seedFromTransaction(transaction) : startSeed;
	const splits = useSplits(firstSeed);
	const fields = useFormFields({
		transaction,
		startSeed: firstSeed,
		accounts,
		cards,
		baseCurrency,
		defaultAccount: activeAccounts.find((a) => a.id === defaultAccountId),
		splits,
	});
	const { form, type, isTransfer, account, effectiveCurrency, foreign, crossCurrency, switched } =
		fields;
	const { control, handleSubmit, getValues, setValue } = form;
	const date = useWatch({ control, name: "transaction_date" });
	const attachments = useAttachments(transaction?.id);
	const links = useLinks(transaction?.id);
	const vendorDefaults = useVendorDefaults(vendors, form, !splits.enabled);
	const subscriptionOptions = subscriptionChoices(subscriptions, transaction);

	/** Picking a known vendor also marks its usual place, unless a place is already marked. */
	function onVendorChange(value: string, fromUser: boolean) {
		vendorDefaults.onVendorChange(value, fromUser);
		if (!fromUser || getValues("location")) return;
		const typed = value.trim().toLowerCase();
		const spot = placeOf(vendors.find((v) => v.name.toLowerCase() === typed) ?? {});
		if (spot) setValue("location", spot);
	}

	function changeType(next: TransactionType) {
		fields.changeType(next);
		setLocalError(null);
	}

	function fillFrom(next: TransactionSeed) {
		fields.fillFrom(next);
		splits.reset();
		setLocalError(null);
	}

	async function submit(values: TxValues) {
		const state = fields.lookups();
		const request = buildTransactionRequest(values, state);
		if ("error" in request) return setLocalError(request.error);
		setLocalError(null);
		let refocus = false;
		setBusy(true);
		try {
			let created: Transaction | undefined;
			const send = async () => {
				const res = await request.send();
				if (res.ok && !transaction) created = res.data;
				return res;
			};
			if (await run(send)) {
				const message = await messageAfterSave({
					success: request.success,
					type: values.type,
					date: values.transaction_date,
					categories: state.splits ? state.splits.rows.map((r) => r.category) : [values.category],
					planned: values.planned,
				});
				notify(message.text, message.severity);
				// files picked on a new transaction go up now that it has an id
				for (const text of created ? await uploadPending(created.id, attachments, links) : [])
					if (text) notify(text, "warning");
				if (another && !transaction) {
					fillFrom(seedAfterSave(values, state));
					refocus = true; // the form was cleared: ready for the next one (once it is enabled again)
				} else sheet.close();
				if (created) onCreated?.(created);
			}
		} finally {
			setBusy(false);
		}
		if (refocus) focusAmount();
	}

	return (
		<>
			<FormDialog
				title={transaction ? "Edit transaction" : "Add transaction"}
				error={localError ?? error}
				pending={pending || busy}
				onSubmit={handleSubmit(submit)}
				sheet={sheet}
			>
				<Grid container columnSpacing={2} key={fields.round}>
					{!transaction && templates.length > 0 && (
						<Cell size={12}>
							<TemplatePicker templates={templates} onPick={(t) => fillFrom(seedFromTemplate(t))} />
						</Cell>
					)}
					<Cell size={12}>
						<TypeToggle type={type} onChange={changeType} />
					</Cell>

					{isTransfer ? (
						<TransferFields
							key="transfer"
							control={control}
							accounts={accounts}
							onPickAccount={fields.pickAccount}
							crossCurrency={crossCurrency}
							switched={switched}
						/>
					) : (
						<OrdinaryFields
							key="ordinary"
							control={control}
							type={type}
							accounts={accounts}
							account={account}
							onPickAccount={fields.pickAccount}
							cards={cards}
							onPickCard={fields.pickCard}
							currencies={currencies}
							onCurrencyChange={fields.changeCurrency}
							effectiveCurrency={effectiveCurrency}
							foreign={foreign}
							baseCurrency={baseCurrency}
							switched={switched}
							splits={splits}
							date={date}
							categories={categories}
							categoryKey={vendorDefaults.categoryKey}
						/>
					)}

					<WhenAndWhere
						control={control}
						isTransfer={isTransfer}
						vendors={vendors}
						onDateChange={fields.changeDate}
						onVendorChange={onVendorChange}
					/>

					<PlannedAndSubscription
						control={control}
						onPlannedChange={fields.setPlanned}
						isExpense={type === "expense"}
						options={subscriptionOptions}
					/>

					<TagsAndNote control={control} tags={tags} tagsKey={vendorDefaults.tagsKey} />

					<Cell size={12}>
						<AttachmentsField state={attachments} links={links} />
					</Cell>

					<Cell size={12}>
						<FormFooter
							another={transaction ? undefined : another}
							onAnotherChange={setAnother}
							onSaveTemplate={() => setSavingTemplate(true)}
						/>
					</Cell>
				</Grid>
			</FormDialog>
			{savingTemplate && (
				<SaveTemplateDialog
					build={(name) => buildTemplateRequest(getValues(), fields.lookups(), name)}
					onClose={() => setSavingTemplate(false)}
				/>
			)}
		</>
	);
} /** Put the cursor back on the amount. */
const focusAmount = () =>
	// two frames: the fields are enabled again only after React has rendered the end of the save
	requestAnimationFrame(() =>
		requestAnimationFrame(() =>
			document.querySelector<HTMLInputElement>('input[name="amount"]')?.focus(),
		),
	);

/** Files and links picked on a new transaction go up now that it has an id: any that were skipped. */
const uploadPending = (
	id: string,
	attachments: ReturnType<typeof useAttachments>,
	links: ReturnType<typeof useLinks>,
) => Promise.all([attachments.uploadPending(id), links.savePending(id)]);
