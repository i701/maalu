import TextField from "@mui/material/TextField";
import { useState } from "react";

/** The field for a second-factor code: the 6 digits from the authenticator app, or (after a click)
 * one of the recovery codes. It is named `code` so the form's `FormData` carries it. */
export default function SecondFactorField({ required = true }: { required?: boolean }) {
	const [recovery, setRecovery] = useState(false);
	return (
		<TextField
			key={recovery ? "recovery" : "app"}
			label={recovery ? "Recovery code" : "Authentication code"}
			name="code"
			autoComplete="one-time-code"
			required={required}
			slotProps={{
				htmlInput: recovery
					? { maxLength: 32, autoCapitalize: "none", spellCheck: false }
					: { inputMode: "numeric", pattern: "[0-9 ]*", maxLength: 7 },
			}}
			helperText={
				<button
					type="button"
					onClick={() => setRecovery((r) => !r)}
					style={{ all: "unset", cursor: "pointer", textDecoration: "underline" }}
				>
					{recovery ? "Use my authenticator app" : "Use a recovery code instead"}
				</button>
			}
		/>
	);
}
