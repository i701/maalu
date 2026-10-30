import TextField from "@mui/material/TextField";
import { type FormEvent, useState } from "react";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { changePasswordFn } from "#/server/auth";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";
import SecondFactorField from "./SecondFactorField";

/** Change your password: the current one, the new one twice, and a code when two-factor is on. */
export default function ChangePasswordDialog({
	twoFactor,
	onClose,
}: {
	/** Whether a code is needed. */
	twoFactor: boolean;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const [localError, setLocalError] = useState<string | null>(null);

	async function submit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		const next = String(f.get("new_password"));
		if (next !== String(f.get("confirm_password")))
			return setLocalError("The new passwords are not the same");
		setLocalError(null);
		const code = String(f.get("code") ?? "").trim();
		const done = await run(() =>
			changePasswordFn({
				data: {
					current_password: String(f.get("current_password")),
					new_password: next,
					...(twoFactor ? { code } : {}),
				},
			}),
		);
		if (done) {
			notify("Password changed. Your other devices were signed out");
			sheet.close();
		}
	}

	return (
		<FormDialog
			title="Change password"
			submitLabel="Change password"
			error={localError ?? error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
			maxWidth="xs"
		>
			<TextField
				label="Current password"
				name="current_password"
				type="password"
				autoComplete="current-password"
				required
				autoFocus
				sx={{ mb: 2 }}
			/>
			<TextField
				label="New password"
				name="new_password"
				type="password"
				autoComplete="new-password"
				required
				helperText="At least 8 characters"
				slotProps={{ htmlInput: { minLength: 8, maxLength: 128 } }}
				sx={{ mb: 2 }}
			/>
			<TextField
				label="New password again"
				name="confirm_password"
				type="password"
				autoComplete="new-password"
				required
				slotProps={{ htmlInput: { minLength: 8, maxLength: 128 } }}
				sx={{ mb: twoFactor ? 2 : 0 }}
			/>
			{twoFactor && <SecondFactorField />}
		</FormDialog>
	);
}
