import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { ACCENT } from "#/lib/m3";
import { searchAccountsFn } from "#/server/accounts";
import { searchCategoriesFn } from "#/server/categories";
import { searchVendorsFn } from "#/server/vendors";
import {
	ACCOUNT_GROUP_LABELS,
	PAYMENT_METHODS,
	PAYMENT_METHOD_LABELS,
	TRANSACTION_TYPES,
	TRANSACTION_TYPE_LABELS,
	type PaymentMethod,
	type TransactionType,
} from "#/types/api";
import AmountRangeField from "./AmountRangeField";
import DateRangeField from "./DateRangeField";
import FilterChip from "./FilterChip";
import RemoteAutocomplete, { type RemoteOption } from "./RemoteAutocomplete";

/** The structured (non-text) filters, as they appear in the URL. */
export type TransactionFilterValues = {
	type?: TransactionType;
	payment_method?: PaymentMethod;
	account_id?: string;
	vendor_id?: string;
	category_id?: string;
	min_amount?: string;
	max_amount?: string;
	date_from?: string;
	date_to?: string;
};

const TYPE_SYMBOL: Record<TransactionType, string> = {
	income: "arrow_downward",
	expense: "arrow_upward",
	transfer: "payments",
};
const TYPE_ACCENT: Record<TransactionType, string> = {
	income: ACCENT.green,
	expense: ACCENT.pink,
	transfer: ACCENT.blue,
};

// Stable module-level functions: the autocompletes re-fetch when `search` changes identity.
async function searchVendorOptions(q: string): Promise<RemoteOption[]> {
	const res = await searchVendorsFn({ data: { q } });
	return res.ok ? res.data.map((v) => ({ id: v.id, label: v.name })) : [];
}

async function searchCategoryOptions(q: string): Promise<RemoteOption[]> {
	const res = await searchCategoriesFn({ data: { q } });
	return res.ok ? res.data.map((c) => ({ id: c.id, label: c.name })) : [];
}

async function searchAccountOptions(q: string): Promise<RemoteOption[]> {
	const res = await searchAccountsFn({ data: { q } });
	return res.ok
		? res.data.map((a) => ({
				id: a.id,
				label: a.name,
				hint: `${ACCOUNT_GROUP_LABELS[a.group]} · ${a.currency}`,
			}))
		: [];
}

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<Box>
			<Typography variant="subtitle2" sx={{ mb: 1 }}>
				{title}
			</Typography>
			{children}
		</Box>
	);
}

/**
 * The filter panel. It is shown beside the table on wide layouts and inside a drawer on narrow
 * ones, so it has no layout of its own. Vendor and account are server-searched autocompletes, so
 * they stay usable with hundreds of records.
 */
export default function TransactionFilters({
	filters,
	selectedAccount,
	selectedVendor,
	selectedCategory,
	baseCurrency,
	activeCount,
	onChange,
	onClear,
}: {
	filters: TransactionFilterValues;
	selectedAccount: RemoteOption | null;
	selectedVendor: RemoteOption | null;
	selectedCategory: RemoteOption | null;
	baseCurrency: string;
	activeCount: number;
	/** Merge a change into the filters; `undefined` removes one. */
	onChange: (patch: Partial<TransactionFilterValues>) => void;
	onClear: () => void;
}) {
	return (
		<Stack spacing={3}>
			<Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
				<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
					Filters
				</Typography>
				{activeCount > 0 && (
					<Button size="small" color="inherit" onClick={onClear}>
						Clear all
					</Button>
				)}
			</Stack>

			<Section title="Type">
				<Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1 }}>
					<FilterChip
						label="All"
						symbol="apps"
						selected={!filters.type}
						onClick={() => onChange({ type: undefined })}
					/>
					{TRANSACTION_TYPES.map((t) => (
						<FilterChip
							key={t}
							label={TRANSACTION_TYPE_LABELS[t]}
							symbol={TYPE_SYMBOL[t]}
							accent={TYPE_ACCENT[t]}
							selected={filters.type === t}
							onClick={() => onChange({ type: filters.type === t ? undefined : t })}
						/>
					))}
				</Stack>
			</Section>

			<Section title="Date">
				<DateRangeField
					value={{ from: filters.date_from, to: filters.date_to }}
					onChange={({ from, to }) => onChange({ date_from: from, date_to: to })}
				/>
			</Section>

			<RemoteAutocomplete
				label="Account"
				placeholder="Search accounts"
				selected={selectedAccount}
				search={searchAccountOptions}
				onChange={(option) => onChange({ account_id: option?.id })}
			/>

			<RemoteAutocomplete
				label="Vendor"
				placeholder="Search vendors"
				selected={selectedVendor}
				search={searchVendorOptions}
				onChange={(option) => onChange({ vendor_id: option?.id })}
			/>

			<RemoteAutocomplete
				label="Category"
				placeholder="Search categories"
				selected={selectedCategory}
				search={searchCategoryOptions}
				onChange={(option) => onChange({ category_id: option?.id })}
			/>

			<Section title="Payment method">
				<TextField
					select
					size="small"
					value={filters.payment_method ?? ""}
					onChange={(e) =>
						onChange({ payment_method: (e.target.value || undefined) as PaymentMethod | undefined })
					}
					slotProps={{ htmlInput: { "aria-label": "Payment method" } }}
				>
					<MenuItem value="">Any method</MenuItem>
					{PAYMENT_METHODS.map((m) => (
						<MenuItem key={m} value={m}>
							{PAYMENT_METHOD_LABELS[m]}
						</MenuItem>
					))}
				</TextField>
			</Section>

			<Section title={`Amount (${baseCurrency})`}>
				<AmountRangeField
					currency={baseCurrency}
					value={{ min: filters.min_amount, max: filters.max_amount }}
					onChange={({ min, max }) => onChange({ min_amount: min, max_amount: max })}
				/>
			</Section>
		</Stack>
	);
}
