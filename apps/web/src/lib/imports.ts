import type { Account, ImportPreview, PaymentMethod, PreviewRow } from "#/types/api";

/** A previewed row plus what the user has decided about it in the review. */
export type ReviewRow = PreviewRow & {
	/** Whether it will be imported. Off for rows already recorded as a transfer. */
	include: boolean;
	vendor_name: string;
	category_name: string;
	/** An account id when the row is a transfer between your own accounts, otherwise "". */
	transfer_account_id: string;
};

export function toReviewRows(preview: ImportPreview): ReviewRow[] {
	return preview.rows.map((r) => ({
		...r,
		include: r.duplicate !== "reference" && r.duplicate !== "transfer",
		vendor_name: r.vendor ?? "",
		category_name: r.category ?? "",
		transfer_account_id: r.transfer_account_id ?? "",
	}));
}

export type RowPatch = Partial<
	Pick<ReviewRow, "include" | "vendor_name" | "category_name" | "transfer_account_id">
>;

export const nameKey = (r: PreviewRow) => r.counterparty.trim().replace(/\s+/g, " ").toLowerCase();

/** Apply a decision to the rows at these positions. With `sameName`, also to every other row the
 * bank named the same way (so a vendor is chosen once, not per row); "include" is never spread.
 * A transfer has no vendor or category, and the other way round, so each clears the other. */
export function patchRows(
	rows: ReviewRow[],
	indexes: ReadonlySet<number>,
	patch: RowPatch,
	sameName = false,
): ReviewRow[] {
	const names = new Set(
		sameName && patch.include === undefined
			? rows.filter((r) => indexes.has(r.index) && nameKey(r)).map(nameKey)
			: [],
	);
	return rows.map((r) => {
		if (!indexes.has(r.index) && !names.has(nameKey(r))) return r;
		if (r.duplicate === "reference") return r; // already imported: nothing to decide
		const next = { ...r, ...patch };
		if (patch.transfer_account_id) return { ...next, vendor_name: "", category_name: "" };
		if (patch.vendor_name || patch.category_name) return { ...next, transfer_account_id: "" };
		return next;
	});
}

/** The rows as the API wants them. Rows already imported are sent as they are so the report says
 * so; any other row left out is sent as `skip`. */
/** One row as the import call takes it. */
export type CommitRow = {
	date: string;
	time: string | null;
	type: "income" | "expense";
	amount: string;
	description: string | null;
	reference: string | null;
	counterparty: string;
	payment_method: PaymentMethod;
	vendor_name?: string;
	category?: string;
	tags?: string[];
	transfer_account_id?: string;
	skip: boolean;
};

export function commitRows(rows: ReviewRow[]): CommitRow[] {
	return rows.map((r) => ({
		date: r.date,
		time: r.time ?? null,
		type: r.type,
		amount: String(r.amount),
		description: r.description || null,
		reference: r.reference ?? null,
		counterparty: r.counterparty,
		payment_method: r.payment_method,
		vendor_name: !r.transfer_account_id && r.vendor_name.trim() ? r.vendor_name.trim() : undefined,
		category: !r.transfer_account_id && r.category_name.trim() ? r.category_name.trim() : undefined,
		// a vendor's usual tags come along only while the vendor is the one that was suggested
		tags: r.vendor_name && r.vendor_name === r.vendor && r.tags.length ? r.tags : undefined,
		transfer_account_id: r.transfer_account_id || undefined,
		skip: !r.include && r.duplicate !== "reference",
	}));
}

/** The account whose number appears in a statement's file name (BML names the file after it). */
export function accountForFilename(accounts: Account[], filename: string): Account | null {
	const name = filename.replace(/[\s-]/g, "").toUpperCase();
	const found = accounts
		.filter((a) => a.account_number)
		.filter((a) => name.includes(a.account_number!.replace(/[\s-]/g, "").toUpperCase()))
		.toSorted((a, b) => b.account_number!.length - a.account_number!.length);
	return found[0] ?? null;
}

export type Counts = {
	toImport: number;
	leftOut: number;
	alreadyThere: number;
	uncategorised: number;
};

export function countRows(rows: ReviewRow[]): Counts {
	const included = rows.filter((r) => r.include);
	return {
		toImport: included.length,
		leftOut: rows.filter((r) => !r.include && r.duplicate !== "reference").length,
		alreadyThere: rows.filter((r) => r.duplicate === "reference").length,
		uncategorised: included.filter((r) => !r.transfer_account_id && !r.category_name.trim()).length,
	};
}

/** Whether the statement's closing balance agrees with the account after the import, in words. */
export function balanceNote(preview: ImportPreview): string | null {
	if (preview.balance_matches === null) return null;
	return preview.balance_matches
		? "The balance after importing matches your statement."
		: `After importing, the account would hold ${preview.balance_after} but the statement ends at ${preview.closing_balance}. Some rows may be missing, left out, or entered twice.`;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** One line for what an import did, for the toast and the history. */
export function resultLine(imported: number, skipped: number, failed: number): string {
	const parts = [`Imported ${plural(imported, "transaction")}`];
	if (skipped) parts.push(`${skipped} already there`);
	if (failed) parts.push(`${failed} failed`);
	return `${parts.join(". ")}.`;
}

/** What narrows the review: words to find, and a range for the amount. */
export type RowFilter = { q: string; min?: string; max?: string };

export const NO_FILTER: RowFilter = { q: "" };

export const isFiltered = (f: RowFilter) => Boolean(f.q.trim() || f.min || f.max);

/** The rows that match: every word typed must appear somewhere in the row (what the bank wrote,
 * its reference or amount, or the vendor and category chosen so far), ignoring case; the amount
 * must be within the range. Done in the browser: a statement is a few hundred rows. */
export function filterRows(rows: ReviewRow[], filter: RowFilter): ReviewRow[] {
	if (!isFiltered(filter)) return rows;
	const words = filter.q.toLowerCase().split(/\s+/).filter(Boolean);
	const min = filter.min ? Number(filter.min) : null;
	const max = filter.max ? Number(filter.max) : null;
	return rows.filter((r) => {
		const amount = Number(r.amount);
		if ((min !== null && amount < min) || (max !== null && amount > max)) return false;
		if (words.length === 0) return true;
		const text = [
			r.counterparty,
			r.description,
			r.reference ?? "",
			r.kind,
			r.vendor_name,
			r.category_name,
			String(Number(r.amount)),
		]
			.join(" ")
			.toLowerCase();
		return words.every((w) => text.includes(w));
	});
}

/** Where the row will go, in a few words. */
export function destination(r: ReviewRow, accounts: Map<string, Account>): string {
	if (r.duplicate === "reference") return "Skipped";
	if (!r.include) return "Left out";
	const account = r.transfer_account_id ? accounts.get(r.transfer_account_id) : undefined;
	if (account) return `Transfer ${r.type === "income" ? "from" : "to"} ${account.name}`;
	return [r.vendor_name, r.category_name || "Uncategorized"].filter(Boolean).join(" · ");
}

/** How many rows (that can still be acted on) the bank named each way, by normalised name. */
export function nameCounts(rows: ReviewRow[]): Map<string, number> {
	const counts = new Map<string, number>();
	for (const r of rows) {
		const key = nameKey(r);
		if (key && r.duplicate !== "reference") counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return counts;
}
