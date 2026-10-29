import { budgetWarning } from "#/lib/budget";
import { getBudgetFn } from "#/server/budget";
import type { TransactionType } from "#/types/api";

/** After an expense is saved: a sentence if it left a budget limit close or over, else null. Never
 * throws, because a failed lookup must not get in the way of a saved transaction. */
export async function warningAfterExpense({
	date,
	categories,
}: {
	date: string;
	categories: string[];
}): Promise<string | null> {
	try {
		const res = await getBudgetFn({ data: { on: date } });
		return res.ok ? budgetWarning(res.data, categories) : null;
	} catch {
		return null;
	}
}

/** The message to show once a transaction is saved: what happened, plus a budget warning when an
 * expense left a limit close or over (then the severity is "warning"). */
export async function messageAfterSave({
	success,
	type,
	form,
	itemCategories,
	planned,
}: {
	success: string;
	type: TransactionType;
	form: FormData;
	/** The categories of the items, when the transaction is split. */
	itemCategories: string[] | null;
	/** A planned expense counts toward nothing yet, so it cannot push a limit. */
	planned: boolean;
}): Promise<{ text: string; severity: "success" | "warning" }> {
	const warning =
		type === "expense" && !planned
			? await warningAfterExpense({
					date: String(form.get("transaction_date") ?? ""),
					categories: itemCategories ?? [String(form.get("category") ?? "")],
				})
			: null;
	return warning
		? { text: `${success}. ${warning}`, severity: "warning" }
		: { text: success, severity: "success" };
}
