import type { Refunding } from "#/lib/use-refund-dialog";
import type { Account } from "#/types/api";
import RefundDialog from "./RefundDialog";

/** Shows the refund dialog while one is open, so a page only holds the state, not the markup. */
export default function RefundDialogHost({
	state,
	accounts,
	baseCurrency,
	onClose,
}: {
	state: Refunding | null;
	accounts: Account[];
	baseCurrency: string;
	onClose: () => void;
}) {
	if (!state) return null;
	return (
		<RefundDialog
			purchase={state.purchase}
			refund={state.refund}
			accounts={accounts}
			baseCurrency={baseCurrency}
			onClose={onClose}
		/>
	);
}
