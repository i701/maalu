import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { friendlyError } from "#/lib/use-action";
import { twoFactorCodeSchema, verifyTwoFactorFn } from "#/server/auth";
import FormTextField from "./FormTextField";
import OtpField, { type OtpState } from "./OtpField";

/** How long the fused "Verified" capsule shows before the app opens (as on iOS). */
const VERIFIED_MS = 1100;

/** The second step of signing in: a code from the authenticator app, or a recovery code. The proof
 * of the right password is held by the web server, not here. */
export default function TwoFactorStep({
	onDone,
	onBack,
}: {
	onDone: () => void;
	/** Back to the password; the message says why when the attempt ran out. */
	onBack: (message?: string) => void;
}) {
	const [recovery, setRecovery] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const [verified, setVerified] = useState(false);
	const [failures, setFailures] = useState(0);
	const { control, handleSubmit, setValue } = useForm({
		resolver: zodResolver(twoFactorCodeSchema),
		defaultValues: { code: "" },
	});

	async function submit(data: z.output<typeof twoFactorCodeSchema>) {
		setPending(true);
		setError(null);
		try {
			const res = await verifyTwoFactorFn({ data });
			if (res.ok) {
				// the cells fuse into the capsule for a moment before the app opens
				if (recovery) return onDone();
				setVerified(true);
				await new Promise((resolve) => setTimeout(resolve, VERIFIED_MS));
				return onDone();
			}
			if (res.error === "Sign in again") return onBack("That sign-in timed out. Start again");
			setError(res.error);
			setFailures((n) => n + 1);
		} catch (err) {
			setError(friendlyError(err));
		} finally {
			setPending(false);
		}
	}

	const code = useWatch({ control, name: "code" });
	const clearCode = useCallback((next: string) => setValue("code", next), [setValue]);
	const otpState: OtpState = verified ? "verified" : pending ? "checking" : "typing";

	return (
		<Stack component="form" onSubmit={handleSubmit(submit)} noValidate spacing={2.5}>
			{recovery ? (
				<FormTextField
					control={control}
					name="code"
					key="recovery"
					label="Recovery code"
					autoComplete="one-time-code"
					autoFocus
					required
					slotProps={{ htmlInput: { maxLength: 32, autoCapitalize: "none", spellCheck: false } }}
					helperText="One of the codes you saved when you turned two-factor on. Each works once"
				/>
			) : (
				<>
					<OtpField
						code={code}
						onChange={clearCode}
						state={otpState}
						failures={failures}
						onComplete={() => void handleSubmit(submit)()}
					/>
					<Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center" }}>
						The 6 digits from your authenticator app
					</Typography>
				</>
			)}
			{error && <Alert severity="error">{error}</Alert>}
			{recovery && (
				<Button type="submit" variant="contained" size="large" loading={pending}>
					Verify
				</Button>
			)}
			<Stack spacing={1} sx={{ alignItems: "center" }}>
				<Button
					size="small"
					color="inherit"
					onClick={() => {
						setRecovery((r) => !r);
						setValue("code", "");
						setError(null);
					}}
				>
					{recovery ? "Use my authenticator app" : "Use a recovery code instead"}
				</Button>
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					<Button size="small" color="inherit" onClick={() => onBack()}>
						Back to sign in
					</Button>
				</Typography>
			</Stack>
		</Stack>
	);
}
