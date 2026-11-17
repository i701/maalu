import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { getString } from "#/lib/utils";
import type { ApiResult } from "#/types/api";
import TextField from "@mui/material/TextField";
import type { SubmitEvent } from "react";
import FormDialog from "./FormDialog";
import SecondFactorField from "./SecondFactorField";

/** Asks for your password and a code (from the app, or a recovery code) before something that
 * could lock you out of two-factor or weaken it. `send` makes the request. */
export default function TwoFactorConfirmDialog<T>({
	title,
	submitLabel,
	help,
	send,
	onDone,
	onClose,
}: {
	title: string;
	submitLabel: string;
	help: string;
	send: (values: { password: string; code: string }) => Promise<ApiResult<T>>;
	onDone: (data: T) => void;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);

	async function submit(e: SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		const values = {
			password: getString(f, "password"),
			code: getString(f, "code").trim(),
		};
		let sent: { data: T } | undefined;
		const done = await run(async () => {
			const res = await send(values);
			if (res.ok) sent = { data: res.data };
			return res;
		});
		if (done && sent) {
			onDone(sent.data);
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={title}
			submitLabel={submitLabel}
			error={error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
			maxWidth="xs"
		>
			<TextField
				label="Password"
				name="password"
				type="password"
				autoComplete="current-password"
				required
				autoFocus
				helperText={help}
				sx={{ mb: 2 }}
			/>
			<SecondFactorField />
		</FormDialog>
	);
}
