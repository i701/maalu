import SalarySplitDialog from "./SalarySplitDialog";

/** The split dialog while a salary is picked, nothing otherwise. */
export default function SalarySplitHost({
	id,
	onClose,
}: {
	id: string | null;
	onClose: () => void;
}) {
	return id ? <SalarySplitDialog transactionId={id} onClose={onClose} /> : null;
}
