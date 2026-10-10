import type { ActiveFilter } from "#/components/ActiveFilters";
import type { RemoteOption } from "#/components/RemoteAutocomplete";
import { formatDate } from "#/lib/format";
import {
	PAYMENT_METHOD_LABELS,
	TRANSACTION_TYPE_LABELS,
	type PaymentMethod,
	type TransactionType,
} from "#/types/api";

/** The filter-related search params of the transactions page. */
export type TransactionFilterValues = {
	type?: TransactionType;
	payment_method?: PaymentMethod;
	account_id?: string;
	vendor_id?: string;
	min_amount?: string;
	max_amount?: string;
	date_from?: string;
	date_to?: string;
};

export type TransactionSearch = TransactionFilterValues & { q?: string };

/** Just the filter values (not paging), e.g. for the panel and the export request. */
export function pickFilterValues(s: TransactionFilterValues): TransactionFilterValues {
	return {
		type: s.type,
		payment_method: s.payment_method,
		account_id: s.account_id,
		vendor_id: s.vendor_id,
		min_amount: s.min_amount,
		max_amount: s.max_amount,
		date_from: s.date_from,
		date_to: s.date_to,
	};
}

/** Whether any filter, including the text search, is on. */
export function hasAnyFilter(s: TransactionSearch): boolean {
	return Boolean(s.q) || Object.values(pickFilterValues(s)).some(Boolean);
}

/** How many structured filters are on (a range counts once). Text search is separate. */
export function countActiveFilters(s: TransactionFilterValues): number {
	return (
		[s.type, s.payment_method, s.account_id, s.vendor_id].filter(Boolean).length +
		(s.min_amount || s.max_amount ? 1 : 0) +
		(s.date_from || s.date_to ? 1 : 0)
	);
}

function dateLabel(from?: string, to?: string): string {
	if (from && to) return `${formatDate(from)} – ${formatDate(to)}`;
	return from ? `from ${formatDate(from)}` : `until ${formatDate(to ?? "")}`;
}

function amountLabel(min: string | undefined, max: string | undefined, currency: string): string {
	if (min && max) return `${min} – ${max} ${currency}`;
	return min ? `≥ ${min} ${currency}` : `≤ ${max ?? ""} ${currency}`;
}

/** One removable chip per active filter, for narrow layouts where the panel is hidden. */
export function buildActiveFilters({
	filters,
	selectedAccount,
	selectedVendor,
	baseCurrency,
	patch,
}: {
	filters: TransactionFilterValues;
	selectedAccount: RemoteOption | null;
	selectedVendor: RemoteOption | null;
	baseCurrency: string;
	patch: (changes: Partial<TransactionFilterValues>) => void;
}): ActiveFilter[] {
	const chips: ActiveFilter[] = [];
	if (filters.type)
		chips.push({
			key: "type",
			tone: "primary",
			label: `Type: ${TRANSACTION_TYPE_LABELS[filters.type]}`,
			onDelete: () => patch({ type: undefined }),
		});
	if (filters.date_from || filters.date_to)
		chips.push({
			key: "date",
			tone: "info",
			label: `Date: ${dateLabel(filters.date_from, filters.date_to)}`,
			onDelete: () => patch({ date_from: undefined, date_to: undefined }),
		});
	if (filters.account_id)
		chips.push({
			key: "account",
			tone: "success",
			label: `Account: ${selectedAccount?.label ?? "…"}`,
			onDelete: () => patch({ account_id: undefined }),
		});
	if (filters.vendor_id)
		chips.push({
			key: "vendor",
			tone: "warning",
			label: `Vendor: ${selectedVendor?.label ?? "…"}`,
			onDelete: () => patch({ vendor_id: undefined }),
		});
	if (filters.payment_method)
		chips.push({
			key: "method",
			tone: "secondary",
			label: `Method: ${PAYMENT_METHOD_LABELS[filters.payment_method]}`,
			onDelete: () => patch({ payment_method: undefined }),
		});
	if (filters.min_amount || filters.max_amount)
		chips.push({
			key: "amount",
			tone: "error",
			label: `Amount: ${amountLabel(filters.min_amount, filters.max_amount, baseCurrency)}`,
			onDelete: () => patch({ min_amount: undefined, max_amount: undefined }),
		});
	return chips;
}
