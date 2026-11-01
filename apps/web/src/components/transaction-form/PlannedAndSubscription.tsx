import Autocomplete from "@mui/material/Autocomplete";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Cell, RevealCell } from "./Cells";
import type { SubRef } from "./request";

/** The "Planned" switch, and (for an expense) the subscription it pays for. */
export default function PlannedAndSubscription({
	planned,
	onPlannedChange,
	isExpense,
	options,
	subscription,
	onSubscriptionChange,
}: {
	planned: boolean;
	onPlannedChange: (on: boolean) => void;
	isExpense: boolean;
	options: SubRef[];
	subscription: SubRef | null;
	onSubscriptionChange: (value: SubRef | null) => void;
}) {
	return (
		<>
			<Cell size={12}>
				<FormControlLabel
					control={<Switch checked={planned} onChange={(_, on) => onPlannedChange(on)} />}
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
				<Autocomplete
					options={options}
					value={subscription}
					onChange={(_, v) => onSubscriptionChange(v)}
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
			</RevealCell>
		</>
	);
}
