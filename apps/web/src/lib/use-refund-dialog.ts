import { useCallback, useState } from "react";
import type { Transaction } from "#/types/api";
import { isRefund } from "./refund";

/** A refund being made (`purchase`) or changed (`refund`). */
export type Refunding = { purchase?: Transaction; refund?: Transaction };

/**
 * What the Transactions page needs to open the refund dialog. A refund has its own, smaller form (it
 * is money back for a purchase, in that purchase's terms), so editing one opens that instead of
 * `onEdit`, which still handles every other transaction.
 */
export function useRefundDialog(onEdit: (t: Transaction) => void) {
	const [refunding, setRefunding] = useState<Refunding | null>(null);
	const refundOf = useCallback((purchase: Transaction) => setRefunding({ purchase }), []);
	const edit = useCallback(
		(t: Transaction) => (isRefund(t) ? setRefunding({ refund: t }) : onEdit(t)),
		[onEdit],
	);
	const close = useCallback(() => setRefunding(null), []);
	return { refunding, refundOf, edit, close };
}
