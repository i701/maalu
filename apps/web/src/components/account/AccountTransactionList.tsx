import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { useState } from "react";
import type {
	Account,
	Card,
	Category,
	Subscription,
	Tag,
	Transaction,
	TransactionTemplate,
	TransactionType,
	Vendor,
} from "#/types/api";
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPES } from "#/types/api";
import { txTitle } from "#/lib/tx-display";
import { deleteTransactionFn } from "#/server/transactions";
import ChipFilter from "../ChipFilter";
import ConfirmDelete from "../ConfirmDelete";
import DateRangeField from "../DateRangeField";
import EmptyState from "../EmptyState";
import PendingOverlay from "../PendingOverlay";
import SearchField from "../SearchField";
import TableCard from "../TableCard";
import TablePager from "../TablePager";
import TableToolbar from "../TableToolbar";
import TransactionForm from "../TransactionForm";
import type { TransactionSeed } from "../transaction-form/request";
import AccountTransactions from "./AccountTransactions";

export type AccountFilters = {
	q?: string;
	type?: TransactionType;
	date_from?: string;
	date_to?: string;
};

/** What the transaction form needs, loaded once for the page. */
export type FormLists = {
	templates: TransactionTemplate[];
	tags: Tag[];
	vendors: Vendor[];
	categories: Category[];
	subscriptions: Subscription[];
	accounts: Account[];
	cards: Card[];
	currencies: string[];
	baseCurrency: string;
};

/** An account's transactions with search and filters, a pager, and the form and delete dialogs. */
export default function AccountTransactionList({
	account,
	items,
	total,
	page,
	pageSize,
	filters,
	lists,
	adding,
	seed,
	onAddingDone,
	onFilters,
	onPage,
	onPageSize,
}: {
	account: Account;
	items: Transaction[];
	total: number;
	page: number;
	pageSize: number;
	filters: AccountFilters;
	lists: FormLists;
	/** The "Add transaction" button above was pressed */
	adding: boolean;
	/** Pre-fills the new transaction, e.g. a credit card repayment */
	seed?: TransactionSeed;
	onAddingDone: () => void;
	onFilters: (change: AccountFilters) => void;
	onPage: (page: number) => void;
	onPageSize: (size: number) => void;
}) {
	const [editing, setEditing] = useState<Transaction | null>(null);
	const [deleting, setDeleting] = useState<Transaction | null>(null);
	const filtered = Boolean(filters.q || filters.type || filters.date_from || filters.date_to);

	return (
		<>
			<PendingOverlay>
				<TableCard>
					<TableToolbar
						summary={`${total} ${total === 1 ? "transaction" : "transactions"}`}
						filters={
							<>
								<SearchField
									value={filters.q ?? ""}
									placeholder="Search description, vendor, category"
									onChange={(q) => onFilters({ q: q || undefined })}
								/>
								<DateRangeField
									value={{ from: filters.date_from, to: filters.date_to }}
									onChange={({ from, to }) => onFilters({ date_from: from, date_to: to })}
								/>
								{filtered && (
									<Button
										color="inherit"
										onClick={() =>
											onFilters({
												q: undefined,
												type: undefined,
												date_from: undefined,
												date_to: undefined,
											})
										}
									>
										Clear filters
									</Button>
								)}
							</>
						}
						chips={
							<ChipFilter
								allLabel="All types"
								value={filters.type}
								options={TRANSACTION_TYPES.map((t) => ({
									value: t,
									label: TRANSACTION_TYPE_LABELS[t],
								}))}
								onChange={(type) => onFilters({ type })}
							/>
						}
					/>
					{items.length === 0 ? (
						<EmptyState
							firstRun={!filtered}
							symbol={filtered ? "search" : "receipt_long"}
							accent={filtered ? "slate" : "green"}
							shape={1}
						>
							{filtered
								? "No transactions in this account match these filters."
								: "Nothing has happened in this account yet. Add a transaction to start its history."}
						</EmptyState>
					) : (
						<AccountTransactions
							items={items}
							accountId={account.id}
							onEdit={setEditing}
							onDelete={setDeleting}
						/>
					)}
					<Box>
						<TablePager
							total={total}
							page={page}
							pageSize={pageSize}
							onPageChange={onPage}
							onPageSizeChange={onPageSize}
						/>
					</Box>
				</TableCard>
			</PendingOverlay>

			<TransactionDialogs
				account={account}
				lists={lists}
				editing={editing}
				adding={adding}
				seed={seed}
				deleting={deleting}
				onEditingDone={() => {
					setEditing(null);
					onAddingDone();
				}}
				onDeletingDone={() => setDeleting(null)}
			/>
		</>
	);
}

/** The add / edit form and the delete confirmation for the list above. */
function TransactionDialogs({
	account,
	lists,
	editing,
	adding,
	seed,
	deleting,
	onEditingDone,
	onDeletingDone,
}: {
	account: Account;
	lists: FormLists;
	editing: Transaction | null;
	adding: boolean;
	seed?: TransactionSeed;
	deleting: Transaction | null;
	onEditingDone: () => void;
	onDeletingDone: () => void;
}) {
	return (
		<>
			{(adding || editing) && (
				<TransactionForm
					transaction={editing ?? undefined}
					seed={editing ? undefined : seed}
					defaultAccountId={account.id}
					{...lists}
					onClose={onEditingDone}
				/>
			)}
			{deleting && (
				<ConfirmDelete
					title="Delete transaction"
					message={`Move "${txTitle(deleting)}" to the trash? You can restore it from there.`}
					onConfirm={() => deleteTransactionFn({ data: { id: deleting.id } })}
					onClose={onDeletingDone}
				/>
			)}
		</>
	);
}
