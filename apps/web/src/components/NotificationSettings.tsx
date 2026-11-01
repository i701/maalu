import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useAction } from "#/lib/use-action";
import { updateMeFn } from "#/server/auth";
import type { User } from "#/types/api";

const KINDS = [
	{
		key: "notify_payments",
		label: "Payments",
		hint: "A planned payment, such as a subscription, is due soon or overdue.",
	},
	{
		key: "notify_budget",
		label: "Budget",
		hint: "A budget limit is close to being used up, or over.",
	},
	{ key: "notify_goals", label: "Goals", hint: "A savings goal is reached." },
] as const;

/** Which kinds of notification Maalu makes for you. Switching one off stops new ones; the ones
 * already in the bell stay. */
export default function NotificationSettings({ me }: { me: User }) {
	const { run, pending, error } = useAction();
	return (
		<Card sx={{ maxWidth: 640 }}>
			<CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
				<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
					Notifications
				</Typography>
				<Stack sx={{ gap: 1 }}>
					{KINDS.map((k) => (
						<div key={k.key}>
							<FormControlLabel
								control={
									<Switch
										checked={me[k.key]}
										disabled={pending}
										onChange={(_, on) => void run(() => updateMeFn({ data: { [k.key]: on } }))}
									/>
								}
								label={k.label}
							/>
							<Typography variant="caption" component="p" sx={{ color: "text.secondary", ml: 6 }}>
								{k.hint}
							</Typography>
						</div>
					))}
				</Stack>
				{error && (
					<Typography variant="caption" sx={{ color: "error.main" }}>
						{error}
					</Typography>
				)}
			</CardContent>
		</Card>
	);
}
