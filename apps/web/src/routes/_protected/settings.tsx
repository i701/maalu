import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { createFileRoute } from "@tanstack/react-router";
import { useNotify } from "#/components/Notify";
import PageHeader from "#/components/PageHeader";
import { unwrap } from "#/lib/unwrap";
import { useAction } from "#/lib/use-action";
import { getMeFn, updateMeFn } from "#/server/auth";

export const Route = createFileRoute("/_protected/settings")({
	loader: async () => ({ me: unwrap(await getMeFn()) }),
	component: SettingsPage,
});

function SettingsPage() {
	const { me } = Route.useLoaderData();
	const { run, pending, error } = useAction();
	const notify = useNotify();

	async function setStartFromTemplate(on: boolean) {
		if (await run(() => updateMeFn({ data: { start_from_template: on } })))
			notify(on ? "Starting from a template is on" : "Starting from a template is off");
	}

	return (
		<>
			<PageHeader title="Settings" description="Choose how Maalu works for you." />
			<Card sx={{ maxWidth: 640 }}>
				<CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
					<FormControlLabel
						control={
							<Switch
								checked={me.start_from_template}
								onChange={(_, on) => setStartFromTemplate(on)}
								disabled={pending}
							/>
						}
						label="Start from a template"
					/>
					<Typography
						variant="caption"
						component="p"
						sx={{ color: error ? "error.main" : "text.secondary" }}
					>
						{error ??
							"Offer your saved templates at the top of the new transaction form. Your templates are kept either way, and you can still save a transaction as a template."}
					</Typography>
				</CardContent>
			</Card>
		</>
	);
}
