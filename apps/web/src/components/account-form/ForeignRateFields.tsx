import { Controller } from "react-hook-form";
import Typography from "@mui/material/Typography";
import { todayIso } from "#/lib/format";
import FormSwitch from "../FormSwitch";
import RateField from "../RateField";
import type { AccountFormControl } from "./schema";

/** For an account in another currency than yours: its rate, and whether Maalu keeps it current. */
export default function ForeignRateFields({
	control,
	currency,
	baseCurrency,
}: {
	control: AccountFormControl;
	currency: string;
	baseCurrency: string;
}) {
	return (
		<>
			<Controller
				name="exchange_rate"
				control={control}
				render={({ field, fieldState }) => (
					<RateField
						key={`rate-${currency}`}
						from={currency}
						to={baseCurrency}
						on={todayIso()}
						label={`Rate: 1 ${currency} = ? ${baseCurrency}`}
						value={field.value}
						onChange={field.onChange}
						error={fieldState.error?.message}
						hint="Used to value this account in your base currency."
					/>
				)}
			/>
			<FormSwitch
				control={control}
				name="auto_rate"
				label="Keep this rate up to date"
				sx={{ mt: 0.5 }}
			/>
			<Typography variant="caption" component="p" sx={{ color: "text.secondary", mt: -0.5 }}>
				Maalu sets the rate from the market now and again every day, so a rate you type is replaced.
				Leave it off to keep your own, such as your bank's.
			</Typography>
		</>
	);
}
