import TextField from "@mui/material/TextField";
import { useState } from "react";
import { type Control, Controller, type FieldValues, type Path } from "react-hook-form";

/** The field for a second-factor code: the 6 digits from the authenticator app, or (after a click)
 * one of the recovery codes. Switching between them clears what was typed. */
export default function SecondFactorField<T extends FieldValues, Out extends FieldValues = T>({
	control,
	name,
	required = true,
}: {
	control: Control<T, unknown, Out>;
	name: Path<T>;
	required?: boolean;
}) {
	const [recovery, setRecovery] = useState(false);
	return (
		<Controller
			name={name}
			control={control}
			render={({ field: { ref, ...field }, fieldState }) => (
				<TextField
					{...field}
					inputRef={ref}
					value={field.value ?? ""}
					label={recovery ? "Recovery code" : "Authentication code"}
					autoComplete="one-time-code"
					required={required}
					error={Boolean(fieldState.error)}
					slotProps={{
						htmlInput: recovery
							? { maxLength: 32, autoCapitalize: "none", spellCheck: false }
							: { inputMode: "numeric", maxLength: 7 },
					}}
					helperText={
						<>
							{fieldState.error && (
								<span style={{ display: "block" }}>{fieldState.error.message}</span>
							)}
							<button
								type="button"
								onClick={() => {
									setRecovery((r) => !r);
									field.onChange("");
								}}
								style={{ all: "unset", cursor: "pointer", textDecoration: "underline" }}
							>
								{recovery ? "Use my authenticator app" : "Use a recovery code instead"}
							</button>
						</>
					}
				/>
			)}
		/>
	);
}
