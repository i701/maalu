import { useCallback, useState } from "react";
import type { Transaction } from "#/types/api";
import { isRefund } from "./refund";

/** A refund being made (`purchase`), changed (`refund`), or made out of existing income (`income`,
 * to be linked to the purchase it gave money back for). */
export type Refunding = { purchase?: Transaction; refund?: Transaction; income?: Transaction };

/**
 * What the Transactions page needs to open the refund dialog. A refund has its own, smaller form (it
 * is money back for a purchase, in that purchase's terms), so editing one opens that instead of
 * `onEdit`, which still handles every other transaction.
 */
export function useRefundDialog(onEdit: (t: Transaction) => void) {
	const [refunding, setRefunding] = useState<Refunding | null>(null);
	// "Refund" on an expense, "Link to a purchase" on income: the same button position and callback.
	const refundOf = useCallback(
		(t: Transaction) => setRefunding(t.type === "income" ? { income: t } : { purchase: t }),
		[],
	);
	const edit = useCallback(
		(t: Transaction) => (isRefund(t) ? setRefunding({ refund: t }) : onEdit(t)),
		[onEdit],
	);
	const close = useCallback(() => setRefunding(null), []);
	return { refunding, refundOf, edit, close };
}
