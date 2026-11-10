import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { type FormEvent, useState } from "react";
import { GRACE_OPTIONS } from "#/lib/api-keys";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { rotateApiKeyFn } from "#/server/api-keys";
import type { ApiKey, ApiKeySecret } from "#/types/api";
import FormDialog from "../FormDialog";

/** Replace a key's secret. A grace period keeps the old one working for a while, so whatever uses
 * it can be switched over without a gap; the permissions and end date do not change. */
export default function RotateDialog({
	apiKey,
	onRotated,
	onClose,
}: {
	apiKey: ApiKey;
	onRotated: (result: ApiKeySecret, grace: number) => void;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const [grace, setGrace] = useState("24");

	async function submit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		let result: ApiKeySecret | undefined;
		const hours = Number(grace);
		const done = await run(async () => {
			const res = await rotateApiKeyFn({ data: { id: apiKey.id, grace_hours: hours } });
			if (res.ok) result = res.data;
			return res;
		});
		if (done && result) {
			onRotated(result, hours);
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={`Rotate "${apiKey.name}"`}
			error={error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
			maxWidth="xs"
			submitLabel="Rotate key"
		>
			<Stack sx={{ gap: 2 }}>
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					This makes a new secret for the same key: the same name, permissions and end date. You
					will see the new one once. Whatever uses the key has to be given it.
				</Typography>
				<TextField
					select
					label="Keep the old secret working"
					value={grace}
					onChange={(e) => setGrace(e.target.value)}
					helperText="A grace period lets you switch over without a gap."
				>
					{GRACE_OPTIONS.map((o) => (
						<MenuItem key={o.value} value={o.value}>
							{o.label}
						</MenuItem>
					))}
				</TextField>
			</Stack>
		</FormDialog>
	);
}
