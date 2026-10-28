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
import { getSessionFn, loginFn } from "#/server/auth";

export const Route = createFileRoute("/login")({
	validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
	beforeLoad: async () => {
		if (await getSessionFn()) throw redirect({ to: "/dashboard" });
	},
	component: LoginPage,
});

function LoginPage() {
	const router = useRouter();
	const search = Route.useSearch();
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

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
			router.clearCache();
			router.history.push(safeRedirect(search.redirect));
		} catch {
			setError("Enter a valid email and password");
		} finally {
			setPending(false);
		}
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
				<Typography variant="body2" sx={{ textAlign: "center", color: "text.secondary" }}>
					No account? <RouterLink to="/register">Create one</RouterLink>
				</Typography>
			</Stack>
		</AuthLayout>
	);
}
