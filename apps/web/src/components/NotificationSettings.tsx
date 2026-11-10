import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useAction } from "#/lib/use-action";
import { updateMeFn } from "#/server/auth";
import { sendTestEmailFn } from "#/server/notifications";
import type { EmailStatus, User } from "#/types/api";
import { useNotify } from "./Notify";

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
export default function NotificationSettings({ me, email }: { me: User; email: EmailStatus }) {
	const { run, pending, error } = useAction();
	const notify = useNotify();
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
				<Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2.5 }}>
					Email
				</Typography>
				{email.configured ? (
					<Stack sx={{ gap: 0.5 }}>
						<FormControlLabel
							control={
								<Switch
									checked={me.notify_email}
									disabled={pending}
									onChange={(_, on) => void run(() => updateMeFn({ data: { notify_email: on } }))}
								/>
							}
							label={`Email me at ${me.email}`}
						/>
						<Typography variant="caption" component="p" sx={{ color: "text.secondary", ml: 6 }}>
							New notifications arrive together in one email, about ten minutes after they appear,
							from {email.sender}. Ones you have already read are not sent.
						</Typography>
						<div>
							<Button
								size="small"
								variant="outlined"
								color="inherit"
								disabled={pending}
								onClick={() =>
									void run(async () => {
										const res = await sendTestEmailFn();
										if (res.ok) notify(`A test email is on its way to ${me.email}.`, "success");
										return res;
									})
								}
								sx={{ mt: 1 }}
							>
								Send a test email
							</Button>
						</div>
					</Stack>
				) : (
					<Typography variant="caption" component="p" sx={{ color: "text.secondary" }}>
						This server is not set up to send email. Whoever runs it can add the SMTP settings
						(SMTP_HOST and SMTP_FROM, see the deployment guide); this switch appears then.
					</Typography>
				)}
				{error && (
					<Typography variant="caption" sx={{ color: "error.main" }}>
						{error}
					</Typography>
				)}
			</CardContent>
		</Card>
	);
}
