import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { hasCreditLimit } from "#/lib/accounts";
import type { AccountGroup } from "#/types/api";
import FormTextField from "../FormTextField";
import type { AccountFormControl } from "./schema";

/** What only owed accounts have: a credit limit (cards and overdrafts) and, for a credit card, the
 * days its statement closes and its payment is due. */
export default function CardFields({
	control,
	group,
	currency,
}: {
	control: AccountFormControl;
	group: AccountGroup;
	currency: string;
}) {
	return (
		<>
			{hasCreditLimit(group) && (
				<Grid size={12}>
					<FormTextField
						control={control}
						name="credit_limit"
						label="Credit limit"
						placeholder="10000"
						helperText={`The most you can owe on it, in ${currency}. It changes no balance: it only shows how much is used.`}
						slotProps={{ htmlInput: { inputMode: "decimal" } }}
					/>
				</Grid>
			)}
			{group === "card" && (
				<>
					<Grid size={{ xs: 12, sm: 6 }}>
						<FormTextField
							control={control}
							name="statement_day"
							label="Statement closes on day"
							placeholder="5"
							slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 2 } }}
						/>
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }}>
						<FormTextField
							control={control}
							name="due_day"
							label="Payment due on day"
							placeholder="25"
							slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 2 } }}
						/>
					</Grid>
					<Grid size={12}>
						<Typography
							variant="caption"
							sx={{ color: "text.secondary", mt: -1, display: "block" }}
						>
							Optional. Day of the month, 1 to 31 (a short month uses its last day). With both set,
							Maalu shows what is owed on the last statement, when to pay it, and tells you before
							it is due.
						</Typography>
					</Grid>
				</>
			)}
		</>
	);
}
