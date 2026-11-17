import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { Controller } from "react-hook-form";
import FormSwitch from "../FormSwitch";
import FormTextField from "../FormTextField";
import type { LimitControl } from "./form";

/** The "only for certain dates" switch and, when it is on, the two dates. */
export default function DatesFields({
	control,
	dated,
	repeat,
	start,
}: {
	control: LimitControl;
	dated: boolean;
	repeat: boolean;
	start: string;
}) {
	return (
		<>
			<Grid size={12}>
				<FormSwitch control={control} name="dated" label="Only for certain dates" />
			</Grid>
			{dated && (
				<>
					<Grid size={{ xs: 12, sm: 6 }}>
						<FormTextField
							control={control}
							name="start"
							label="From"
							type="date"
							required
							slotProps={{ inputLabel: { shrink: true } }}
						/>
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }}>
						<FormTextField
							control={control}
							name="end"
							label="Until"
							type="date"
							required
							helperText={
								repeat
									? "Inclusive. Whole periods count, so the dates snap to them"
									: "Inclusive. The limit is one total for the whole stretch"
							}
							slotProps={{
								inputLabel: { shrink: true },
								htmlInput: { min: start || undefined },
							}}
						/>
					</Grid>
					<Grid size={12}>
						<Controller
							name="repeat"
							control={control}
							render={({ field }) => (
								<TextField
									select
									label="How it counts"
									value={field.value ? "monthly" : "total"}
									onChange={(e) => field.onChange(e.target.value === "monthly")}
								>
									<MenuItem value="total">One total for the whole stretch</MenuItem>
									<MenuItem value="monthly">A limit for every period between these dates</MenuItem>
								</TextField>
							)}
						/>
					</Grid>
				</>
			)}
		</>
	);
}
