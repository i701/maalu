import TextField from "@mui/material/TextField";
import { type FormEvent, useState } from "react";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import type { ApiResult } from "#/types/api";
import FormDialog from "./FormDialog";

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
	const [recovery, setRecovery] = useState(false);

	async function submit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		const values = { password: String(f.get("password")), code: String(f.get("code")).trim() };
		let data: T | undefined;
		const done = await run(async () => {
			const res = await send(values);
			if (res.ok) data = res.data;
			return res;
		});
		if (done) {
			onDone(data as T);
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
			<TextField
				key={recovery ? "recovery" : "app"}
				label={recovery ? "Recovery code" : "Authentication code"}
				name="code"
				autoComplete="one-time-code"
				required
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
		</FormDialog>
	);
}
