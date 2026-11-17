import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPES, type TransactionType } from "#/types/api";

const TYPE_COLOR = {
	income: "success",
	expense: "error",
	transfer: "info",
} as const;

/** Income, expense or transfer, at the top of the transaction form. */
export default function TypeToggle({
	type,
	onChange,
}: {
	type: TransactionType;
	onChange: (next: TransactionType) => void;
}) {
	return (
		<ToggleButtonGroup
			exclusive
			fullWidth
			size="small"
			value={type}
			onChange={(_, next: TransactionType | null) => next && onChange(next)}
			aria-label="Transaction type"
		>
			{TRANSACTION_TYPES.map((t) => (
				<ToggleButton key={t} value={t} color={TYPE_COLOR[t]} sx={{ py: 1 }}>
					{TRANSACTION_TYPE_LABELS[t]}
				</ToggleButton>
			))}
		</ToggleButtonGroup>
	);
}
