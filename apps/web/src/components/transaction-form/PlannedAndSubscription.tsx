import Autocomplete from "@mui/material/Autocomplete";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { type Control, Controller } from "react-hook-form";
import { Cell, RevealCell } from "./Cells";
import type { SubRef } from "./request";
import type { TxValues } from "./schema";

/** The "Planned" switch, and (for an expense) the subscription it pays for. */
export default function PlannedAndSubscription({
	control,
	onPlannedChange,
	isExpense,
	options,
}: {
	control: Control<TxValues>;
	/** Setting it yourself stops it following the date. */
	onPlannedChange: (on: boolean) => void;
	isExpense: boolean;
	options: SubRef[];
}) {
	return (
		<>
			<Cell size={12}>
				<FormControlLabel
					control={
						<Controller
							name="planned"
							control={control}
							render={({ field }) => (
								<Switch checked={field.value} onChange={(_, on) => onPlannedChange(on)} />
							)}
						/>
					}
					label="Planned"
				/>
				<Typography
					variant="caption"
					component="p"
					sx={{ color: "text.secondary", mt: -0.5, mb: 1 }}
				>
					Coming up, not happened yet. It counts toward nothing until you mark it as paid.
				</Typography>
			</Cell>

			<RevealCell size={12} show={isExpense}>
				<Controller
					name="subscription"
					control={control}
					render={({ field }) => (
						<Autocomplete
							options={options}
							value={field.value}
							onChange={(_, v) => field.onChange(v)}
							getOptionLabel={(o) => o.name}
							isOptionEqualToValue={(a, b) => a.id === b.id}
							noOptionsText="No subscriptions yet"
							renderInput={(params) => (
								<TextField
									{...params}
									label="Subscription"
									helperText="Optional. Marks this as a payment for a recurring charge"
								/>
							)}
						/>
					)}
				/>
			</RevealCell>
		</>
	);
}
