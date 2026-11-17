import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import AuthLayout from "#/components/AuthLayout";
import CurrencyField from "#/components/CurrencyField";
import FormTextField from "#/components/FormTextField";
import { RouterButton, RouterLink } from "#/components/RouterLinks";
import { getRegistrationFn, getSessionFn, registerFn, registerSchema } from "#/server/auth";
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
	const { control, handleSubmit } = useForm({
		resolver: zodResolver(registerSchema),
		defaultValues: { email: "", password: "", base_currency: "MVR" },
	});

	async function submit(data: z.output<typeof registerSchema>) {
		setPending(true);
		setError(null);
		try {
			const res = await registerFn({ data });
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
					autoComplete="new-password"
					helperText="At least 8 characters"
					required
					slotProps={{ htmlInput: { maxLength: 128 } }}
				/>
				<Controller
					name="base_currency"
					control={control}
					render={({ field, fieldState }) => (
						<CurrencyField
							label="Primary currency"
							currencies={currencies}
							defaultValue={field.value}
							onInputChange={field.onChange}
							error={fieldState.error?.message}
							helperText="Totals are shown in this currency. It can't be changed later."
							required
						/>
					)}
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
