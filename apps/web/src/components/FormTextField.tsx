import TextField, { type TextFieldProps } from "@mui/material/TextField";
import { type Control, Controller, type FieldValues, type Path } from "react-hook-form";

/** A MUI TextField bound to a react-hook-form field: the schema's message shows under it when the
 * value is refused, the usual help text otherwise. */
export default function FormTextField<T extends FieldValues, Out extends FieldValues = T>({
	control,
	name,
	helperText,
	...props
}: Omit<TextFieldProps, "name" | "value" | "defaultValue" | "onChange" | "onBlur" | "error"> & {
	/** From `useForm`; `Out` is what the schema turns the values into. */
	control: Control<T, unknown, Out>;
	name: Path<T>;
}) {
	return (
		<Controller
			name={name}
			control={control}
			render={({ field, fieldState }) => (
				<TextField
					{...props}
					{...field}
					value={field.value ?? ""}
					error={Boolean(fieldState.error)}
					helperText={fieldState.error?.message ?? helperText}
				/>
			)}
		/>
	);
}
