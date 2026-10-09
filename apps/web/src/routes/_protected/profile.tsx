import LogoutIcon from "@mui/icons-material/Logout";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import PageHeader from "#/components/PageHeader";
import { formatDate } from "#/lib/format";
import { unwrap } from "#/lib/unwrap";
import { getMeFn, logoutFn } from "#/server/auth";

export const Route = createFileRoute("/_protected/profile")({
	loader: async () => ({ me: unwrap(await getMeFn()) }),
	component: ProfilePage,
});

function ProfilePage() {
	const { me } = Route.useLoaderData();
	const router = useRouter();

	async function logout() {
		await logoutFn();
		router.clearCache(); // drop cached page data so the next user never sees it
		await router.navigate({ to: "/login" });
	}

	const rows = [
		["Email", me.email],
		["Primary currency", me.base_currency],
		["Member since", formatDate(me.created_at)],
	];

	return (
		<>
			<PageHeader title="Profile" description="Your account details." />
			<Card sx={{ maxWidth: 640 }}>
				<CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
					<Stack direction="row" spacing={2} sx={{ mb: 3, alignItems: "center" }}>
						<Avatar sx={{ width: 64, height: 64, bgcolor: "primary.main", fontSize: 28 }}>
							{me.email[0].toUpperCase()}
						</Avatar>
						<div>
							<Typography variant="h6" noWrap>
								{me.email}
							</Typography>
							<Typography variant="body2" sx={{ color: "text.secondary" }}>
								Maalu account
							</Typography>
						</div>
					</Stack>
					<Stack divider={<Divider flexItem />} component="dl" sx={{ m: 0 }}>
						{rows.map(([label, value]) => (
							<Stack key={label} direction="row" sx={{ py: 1.5, justifyContent: "space-between" }}>
								<Typography component="dt" variant="body2" sx={{ color: "text.secondary" }}>
									{label}
								</Typography>
								<Typography component="dd" variant="body2" sx={{ m: 0, fontWeight: 500 }}>
									{value}
								</Typography>
							</Stack>
						))}
					</Stack>
					<Typography variant="caption" component="p" sx={{ mt: 2, color: "text.secondary" }}>
						Your primary currency is fixed because every transaction's converted amount is stored in
						it.
					</Typography>
					<Button
						variant="outlined"
						color="inherit"
						startIcon={<LogoutIcon />}
						sx={{ mt: 3 }}
						onClick={logout}
					>
						Sign out
					</Button>
				</CardContent>
			</Card>
		</>
	);
}
