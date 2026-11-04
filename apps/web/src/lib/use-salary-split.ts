import { useCallback, useState } from "react";
import type { Transaction } from "#/types/api";

/** Pay in the Salary category that has arrived: the kind of transaction a split can be made from. */
export const canSplitSalary = (t: Transaction): boolean =>
	t.type === "income" && t.category_is_salary && !t.planned && t.account !== null;

/**
 * Which salary's split is open. `open` is for the button on a salary row; `afterCreate` is for a
 * salary that was just added: its split opens by itself when there are rules to propose, since that
 * is the moment the user is thinking about where the money goes.
 */
export function useSalarySplit(hasRules: boolean) {
	const [id, setId] = useState<string | null>(null);
	const open = useCallback((t: Transaction) => setId(t.id), []);
	const afterCreate = useCallback(
		(t: Transaction) => {
			if (hasRules && canSplitSalary(t)) setId(t.id);
		},
		[hasRules],
	);
	const close = useCallback(() => setId(null), []);
	return { id, open, afterCreate, close };
}
