import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { groupSpendsByDefault } from "#/lib/accounts";
import type { AccountGroup } from "#/types/api";

/** One switch: do you spend from this account? It starts at what the group says (cash, bank
 * accounts and prepaid do) until you change it. Not offered for what you owe. */
export default function SpendableField({
	group,
	value,
	onChange,
}: {
	group: AccountGroup;
	/** Your choice, or null while you have not made one (the group decides) */
	value: boolean | null;
	onChange: (spend: boolean) => void;
}) {
	return (
		<>
			<FormControlLabel
				control={
					<Switch
						checked={value ?? groupSpendsByDefault(group)}
						onChange={(_, checked) => onChange(checked)}
					/>
				}
				label="I spend from this account"
			/>
			<Typography variant="caption" component="p" sx={{ color: "text.secondary", mt: -0.5 }}>
				When on, its money counts toward what you can spend this month. When off, it is kept apart,
				like savings. A savings goal that follows the account keeps it apart either way.
			</Typography>
		</>
	);
}
