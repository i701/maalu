import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { changePasswordFn, codeField } from "#/server/auth";
import FormDialog from "./FormDialog";
import FormTextField from "./FormTextField";
import { useNotify } from "./Notify";
import SecondFactorField from "./SecondFactorField";

const password = z.string().min(8, "Use at least 8 characters").max(128);

/** The new password must be typed the same twice; the code only counts when two-factor is on. */
const passwordSchema = (twoFactor: boolean) =>
	z
		.object({
			current_password: z.string().min(1, "Enter your current password").max(128),
			new_password: password,
			confirm_password: z.string(),
			code: twoFactor ? codeField : z.string(),
		})
		.refine((v) => v.new_password === v.confirm_password, {
			path: ["confirm_password"],
			message: "The new passwords are not the same",
		});

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
	const schema = passwordSchema(twoFactor);
	const { control, handleSubmit } = useForm({
		resolver: zodResolver(schema),
		defaultValues: { current_password: "", new_password: "", confirm_password: "", code: "" },
	});

	async function submit({ current_password, new_password, code }: z.output<typeof schema>) {
		const done = await run(() =>
			changePasswordFn({
				data: { current_password, new_password, ...(twoFactor ? { code } : {}) },
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
			error={error}
			pending={pending}
			onSubmit={handleSubmit(submit)}
			sheet={sheet}
			maxWidth="xs"
		>
			<FormTextField
				control={control}
				name="current_password"
				label="Current password"
				type="password"
				autoComplete="current-password"
				required
				autoFocus
				sx={{ mb: 2 }}
			/>
			<FormTextField
				control={control}
				name="new_password"
				label="New password"
				type="password"
				autoComplete="new-password"
				required
				helperText="At least 8 characters"
				slotProps={{ htmlInput: { maxLength: 128 } }}
				sx={{ mb: 2 }}
			/>
			<FormTextField
				control={control}
				name="confirm_password"
				label="New password again"
				type="password"
				autoComplete="new-password"
				required
				slotProps={{ htmlInput: { maxLength: 128 } }}
				sx={{ mb: twoFactor ? 2 : 0 }}
			/>
			{twoFactor && <SecondFactorField control={control} name="code" />}
		</FormDialog>
	);
}
