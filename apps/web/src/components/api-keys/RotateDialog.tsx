import { zodResolver } from "@hookform/resolvers/zod";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { GRACE_OPTIONS } from "#/lib/api-keys";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { rotateApiKeyFn } from "#/server/api-keys";
import type { ApiKey, ApiKeySecret } from "#/types/api";
import FormDialog from "../FormDialog";
import FormTextField from "../FormTextField";

const schema = z.object({ grace: z.coerce.number().int().min(0).max(168) });

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
	const { control, handleSubmit } = useForm({
		resolver: zodResolver(schema),
		defaultValues: { grace: "24" },
	});

	async function submit({ grace: hours }: z.output<typeof schema>) {
		let result: ApiKeySecret | undefined;
		const done = await run(async () => {
			const res = await rotateApiKeyFn({
				data: { id: apiKey.id, grace_hours: hours },
			});
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
			onSubmit={handleSubmit(submit)}
			sheet={sheet}
			maxWidth="xs"
			submitLabel="Rotate key"
		>
			<Stack sx={{ gap: 2 }}>
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					This makes a new secret for the same key: the same name, permissions and end date. You
					will see the new one once. Whatever uses the key has to be given it.
				</Typography>
				<FormTextField
					control={control}
					name="grace"
					select
					label="Keep the old secret working"
					helperText="A grace period lets you switch over without a gap."
				>
					{GRACE_OPTIONS.map((o) => (
						<MenuItem key={o.value} value={o.value}>
							{o.label}
						</MenuItem>
					))}
				</FormTextField>
			</Stack>
		</FormDialog>
	);
}
