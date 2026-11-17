import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import type { ApiResult } from "#/types/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { confirmSchema } from "#/server/auth";
import FormDialog from "./FormDialog";
import FormTextField from "./FormTextField";
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

	const { control, handleSubmit } = useForm({
		resolver: zodResolver(confirmSchema),
		defaultValues: { password: "", code: "" },
	});

	async function submit(values: z.output<typeof confirmSchema>) {
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
			onSubmit={handleSubmit(submit)}
			noValidate
			sheet={sheet}
			maxWidth="xs"
		>
			<FormTextField
				control={control}
				name="password"
				label="Password"
				type="password"
				autoComplete="current-password"
				required
				autoFocus
				helperText={help}
				sx={{ mb: 2 }}
			/>
			<SecondFactorField control={control} name="code" />
		</FormDialog>
	);
}
