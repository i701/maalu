import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";
import { type Control, Controller, type FieldValues, type Path } from "react-hook-form";

/** A labelled MUI Switch bound to a true/false field of a react-hook-form form. */
export default function FormSwitch<T extends FieldValues, Out extends FieldValues = T>({
	control,
	name,
	label,
	onChange,
	sx,
}: {
	control: Control<T, unknown, Out>;
	name: Path<T>;
	label: ReactNode;
	/** In place of setting the field, for a switch whose change sets more than itself. */
	onChange?: (on: boolean) => void;
	sx?: SxProps<Theme>;
}) {
	return (
		<FormControlLabel
			sx={sx}
			label={label}
			control={
				<Controller
					name={name}
					control={control}
					render={({ field }) => (
						<Switch
							checked={Boolean(field.value)}
							onChange={(_, on) => (onChange ? onChange(on) : field.onChange(on))}
						/>
					)}
				/>
			}
		/>
	);
}
