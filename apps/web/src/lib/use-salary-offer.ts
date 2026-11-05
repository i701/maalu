import { useCallback, useState } from "react";
import { listSalaryRulesFn } from "#/server/salary";
import type { Transaction } from "#/types/api";

/** A planned salary (income in the Salary category, in an account): the kind that can be split once it arrives. */
export const isSalaryToSplit = (t: Transaction): boolean =>
	t.type === "income" && t.category_is_salary && t.account !== null;

/**
 * Offers the split of a salary that was just marked received. `offer` is given the planned
 * transaction after it was posted; when it is a salary and there are rules to propose, `id` is set
 * and the page shows the split dialog (a prompt, nothing moves until it is confirmed).
 */
export function useSalaryOffer() {
	const [id, setId] = useState<string | null>(null);
	const offer = useCallback(async (t: Transaction) => {
		if (!isSalaryToSplit(t)) return;
		const rules = await listSalaryRulesFn();
		if (rules.ok && rules.data.length > 0) setId(t.id);
	}, []);
	const close = useCallback(() => setId(null), []);
	return { id, offer, close };
}
