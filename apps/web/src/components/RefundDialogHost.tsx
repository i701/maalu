import type { Refunding } from "#/lib/use-refund-dialog";
import type { Account } from "#/types/api";
import LinkRefundDialog from "./LinkRefundDialog";
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
	if (state.income) return <LinkRefundDialog income={state.income} onClose={onClose} />;
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
