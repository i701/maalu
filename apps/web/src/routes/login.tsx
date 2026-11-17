import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import AuthLayout from "#/components/AuthLayout";
import FormTextField from "#/components/FormTextField";
import { RouterLink } from "#/components/RouterLinks";
import TwoFactorStep from "#/components/TwoFactorStep";
import { safeRedirect } from "#/lib/safe-redirect";
import {
	cancelTwoFactorFn,
	getRegistrationFn,
	getSessionFn,
	loginFn,
	loginSchema,
} from "#/server/auth";

export const Route = createFileRoute("/login")({
	validateSearch: z.object({
		redirect: z.string().optional().catch(undefined),
	}),
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
	const { control, handleSubmit } = useForm({
		resolver: zodResolver(loginSchema),
		defaultValues: { email: "", password: "" },
	});

	function finish() {
		router.clearCache();
		router.history.push(safeRedirect(search.redirect));
	}

	async function backToPassword(message?: string) {
		await cancelTwoFactorFn();
		setError(message ?? null);
		setStep("password");
	}

	async function submit(data: z.output<typeof loginSchema>) {
		setPending(true);
		setError(null);
		try {
			const res = await loginFn({ data });
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
			<Stack component="form" onSubmit={handleSubmit(submit)} noValidate spacing={2.5}>
				<FormTextField
					control={control}
					name="email"
					label="Email"
					type="email"
					autoComplete="email"
					required
					autoFocus
				/>
				<FormTextField
					control={control}
					name="password"
					label="Password"
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
