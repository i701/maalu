import TextField from "@mui/material/TextField";
import { type Control, Controller } from "react-hook-form";
import type { Vendor } from "#/types/api";
import FormTextField from "../FormTextField";
import LocationField from "../LocationField";
import VendorField from "../VendorField";
import { Cell, RevealCell } from "./Cells";
import type { TxValues } from "./schema";

/** When it happened, and (not for a transfer) with whom and where. */
export default function WhenAndWhere({
	control,
	isTransfer,
	vendors,
	onDateChange,
	onVendorChange,
}: {
	control: Control<TxValues>;
	isTransfer: boolean;
	vendors: Vendor[];
	/** The date also decides whether "Planned" turns on by itself. */
	onDateChange: (date: string) => void;
	/** After the vendor is set: `fromUser` is false when the field sets its own starting value. */
	onVendorChange: (value: string, fromUser: boolean) => void;
}) {
	return (
		<>
			<Cell size={6}>
				<Controller
					name="transaction_date"
					control={control}
					render={({ field, fieldState }) => (
						<TextField
							label="Date"
							type="date"
							value={field.value}
							onChange={(e) => onDateChange(e.target.value)}
							error={Boolean(fieldState.error)}
							helperText={fieldState.error?.message}
							required
							slotProps={{ inputLabel: { shrink: true } }}
						/>
					)}
				/>
			</Cell>

			<Cell size={6}>
				<FormTextField
					control={control}
					name="transaction_time"
					label="Time"
					type="time"
					slotProps={{ inputLabel: { shrink: true } }}
				/>
			</Cell>

			<RevealCell size={12} show={!isTransfer}>
				<Controller
					name="vendor"
					control={control}
					render={({ field, fieldState }) => (
						<VendorField
							vendors={vendors}
							defaultValue={field.value}
							onValueChange={(value, fromUser) => {
								field.onChange(value);
								onVendorChange(value, fromUser);
							}}
							error={fieldState.error?.message}
						/>
					)}
				/>
			</RevealCell>

			<RevealCell size={12} show={!isTransfer}>
				<Controller
					name="location"
					control={control}
					render={({ field }) => <LocationField value={field.value} onChange={field.onChange} />}
				/>
			</RevealCell>
		</>
	);
}
