import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import AuthLayout from "#/components/AuthLayout";
import CurrencyField from "#/components/CurrencyField";
import { RouterButton, RouterLink } from "#/components/RouterLinks";
import { getRegistrationFn, getSessionFn, registerFn } from "#/server/auth";
import { listCurrenciesFn } from "#/server/currencies";

export const Route = createFileRoute("/register")({
	beforeLoad: async () => {
		if (await getSessionFn()) throw redirect({ to: "/dashboard" });
	},
	loader: async () => {
		const registration = await getRegistrationFn();
		return {
			open: registration.open,
			currencies: registration.open ? await listCurrenciesFn() : [],
		};
	},
	component: RegisterPage,
});

function RegisterPage() {
	const { open, currencies } = Route.useLoaderData();
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		setPending(true);
		setError(null);
		try {
			const res = await registerFn({
				data: {
					email: String(f.get("email")),
					password: String(f.get("password")),
					base_currency: String(f.get("base_currency")).toUpperCase(),
				},
			});
			if (!res.ok) return setError(res.error);
			router.clearCache();
			await router.navigate({ to: "/dashboard" });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Check your details and try again");
		} finally {
			setPending(false);
		}
	}

	if (!open)
		return (
			<AuthLayout title="Sign-up is closed">
				<Stack spacing={2.5}>
					<Alert severity="info">Ask the person who runs this Maalu to add you.</Alert>
					<RouterButton to="/login" variant="contained" size="large">
						Sign in
					</RouterButton>
				</Stack>
			</AuthLayout>
		);

	return (
		<AuthLayout title="Create account" subtitle="Track your money in one place.">
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
					autoComplete="new-password"
					helperText="At least 8 characters"
					required
					slotProps={{ htmlInput: { minLength: 8, maxLength: 128 } }}
				/>
				<CurrencyField
					name="base_currency"
					label="Primary currency"
					currencies={currencies}
					defaultValue="MVR"
					helperText="Totals are shown in this currency. It can't be changed later."
					required
				/>
				{error && <Alert severity="error">{error}</Alert>}
				<Button type="submit" variant="contained" size="large" loading={pending}>
					Create account
				</Button>
				<Typography variant="body2" sx={{ textAlign: "center", color: "text.secondary" }}>
					Already registered? <RouterLink to="/login">Sign in</RouterLink>
				</Typography>
			</Stack>
		</AuthLayout>
	);
}
