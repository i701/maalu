import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { friendlyError } from "#/lib/use-action";
import { verifyTwoFactorFn } from "#/server/auth";

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

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const code = String(new FormData(e.currentTarget).get("code") ?? "");
		setPending(true);
		setError(null);
		try {
			const res = await verifyTwoFactorFn({ data: { code } });
			if (res.ok) return onDone();
			if (res.error === "Sign in again") return onBack("That sign-in timed out. Start again");
			setError(res.error);
		} catch (err) {
			setError(friendlyError(err));
		} finally {
			setPending(false);
		}
	}

	return (
		<Stack component="form" onSubmit={submit} spacing={2.5}>
			<TextField
				key={recovery ? "recovery" : "app"}
				label={recovery ? "Recovery code" : "Authentication code"}
				name="code"
				autoComplete="one-time-code"
				autoFocus
				required
				slotProps={{
					htmlInput: recovery
						? { maxLength: 32, autoCapitalize: "none", spellCheck: false }
						: { inputMode: "numeric", pattern: "[0-9 ]*", maxLength: 7 },
				}}
				helperText={
					recovery
						? "One of the codes you saved when you turned two-factor on. Each works once"
						: "The 6 digits from your authenticator app"
				}
			/>
			{error && <Alert severity="error">{error}</Alert>}
			<Button type="submit" variant="contained" size="large" loading={pending}>
				Verify
			</Button>
			<Stack spacing={1} sx={{ alignItems: "center" }}>
				<Button
					size="small"
					color="inherit"
					onClick={() => {
						setRecovery((r) => !r);
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
