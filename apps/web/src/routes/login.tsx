import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import AuthLayout from "#/components/AuthLayout";
import { RouterLink } from "#/components/RouterLinks";
import { safeRedirect } from "#/lib/safe-redirect";
import TwoFactorStep from "#/components/TwoFactorStep";
import { cancelTwoFactorFn, getRegistrationFn, getSessionFn, loginFn } from "#/server/auth";

export const Route = createFileRoute("/login")({
	validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
	beforeLoad: async () => {
		if (await getSessionFn()) throw redirect({ to: "/dashboard" });
	},
	loader: () => getRegistrationFn(),
	component: LoginPage,
});

function LoginPage() {
	const registration = Route.useLoaderData();
	const router = useRouter();
	const search = Route.useSearch();
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	// After a right password with two-factor on, the code comes next.
	const [step, setStep] = useState<"password" | "code">("password");

	function finish() {
		router.clearCache();
		router.history.push(safeRedirect(search.redirect));
	}

	async function backToPassword(message?: string) {
		await cancelTwoFactorFn();
		setError(message ?? null);
		setStep("password");
	}

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		setPending(true);
		setError(null);
		try {
			const res = await loginFn({
				data: { email: String(f.get("email")), password: String(f.get("password")) },
			});
			if (!res.ok) return setError(res.error);
			if (res.data.twoFactor) return setStep("code");
			finish();
		} catch {
			setError("Enter a valid email and password");
		} finally {
			setPending(false);
		}
	}

	if (step === "code") {
		return (
			<AuthLayout title="Two-factor" subtitle="Enter the code from your authenticator app.">
				<TwoFactorStep onDone={finish} onBack={backToPassword} />
			</AuthLayout>
		);
	}

	return (
		<AuthLayout title="Sign in" subtitle="Welcome back. Enter your email and password.">
			<Stack component="form" onSubmit={submit} spacing={2.5}>
				<TextField
					label="Email"
					name="email"
					type="email"
					autoComplete="email"
					required
					autoFocus
				/>
				<TextField
					label="Password"
					name="password"
					type="password"
					autoComplete="current-password"
					required
				/>
				{error && <Alert severity="error">{error}</Alert>}
				<Button type="submit" variant="contained" size="large" loading={pending}>
					Sign in
				</Button>
				{registration.open && (
					<Typography variant="body2" sx={{ textAlign: "center", color: "text.secondary" }}>
						No account? <RouterLink to="/register">Create one</RouterLink>
					</Typography>
				)}
			</Stack>
		</AuthLayout>
	);
}
