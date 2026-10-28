import { budgetWarning } from "#/lib/budget";
import { getBudgetFn } from "#/server/budget";

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
