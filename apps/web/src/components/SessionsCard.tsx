import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { memo } from "react";
import { formatAgo } from "#/lib/format";
import { useAction } from "#/lib/use-action";
import { describeDevice } from "#/lib/user-agent";
import { endOtherSessionsFn, endSessionFn } from "#/server/sessions";
import type { SessionInfo } from "#/types/api";
import { useNotify } from "./Notify";
import { ROW_FILL } from "./ResponsiveTable";

/** One sign-in. It ends itself, so the list passes it nothing but the data. */
const SessionRow = memo(function SessionRow({ session }: { session: SessionInfo }) {
	const { run, pending } = useAction();
	const notify = useNotify();

	async function end() {
		if (await run(() => endSessionFn({ data: { id: session.id } })))
			notify("Signed out that device");
	}

	return (
		<Stack
			direction="row"
			spacing={2}
			sx={{
				alignItems: "center",
				justifyContent: "space-between",
				px: 2,
				py: 1.5,
				bgcolor: ROW_FILL,
				borderRadius: "var(--shape-md)",
			}}
		>
			<div>
				<Typography sx={{ fontWeight: 500 }}>{describeDevice(session.user_agent)}</Typography>
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					Last used {formatAgo(session.last_used_at)}
					{session.ip_address ? ` · ${session.ip_address}` : ""}
				</Typography>
			</div>
			{session.current ? (
				<Chip size="small" color="primary" label="This device" />
			) : (
				<Button size="small" color="error" loading={pending} onClick={end}>
					Sign out
				</Button>
			)}
		</Stack>
	);
});

/** The Settings card listing where you are signed in, with a way to end the others. */
export default function SessionsCard({ sessions }: { sessions: SessionInfo[] }) {
	const { run, pending, error } = useAction();
	const notify = useNotify();
	const others = sessions.filter((s) => !s.current).length;

	async function endOthers() {
		let ended = 0;
		const done = await run(async () => {
			const res = await endOtherSessionsFn();
			if (res.ok) ended = res.data.ended;
			return res;
		});
		if (done) notify(`Signed out ${ended} other ${ended === 1 ? "device" : "devices"}`);
	}

	return (
		<Card sx={{ maxWidth: 640 }}>
			<CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
				<Typography variant="h2" component="h2" sx={{ mb: 0.5 }}>
					Where you are signed in
				</Typography>
				<Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
					A sign-in ends 30 days after you last used it. Sign out any you don't recognise.
				</Typography>
				<Stack spacing={1}>
					{sessions.map((s) => (
						<SessionRow key={s.id} session={s} />
					))}
				</Stack>
				{error && (
					<Alert severity="error" sx={{ mt: 1 }}>
						{error}
					</Alert>
				)}
				<Button
					variant="outlined"
					color="error"
					disabled={pending || others === 0}
					onClick={endOthers}
					sx={{ mt: 2 }}
				>
					Sign out all other devices
				</Button>
			</CardContent>
		</Card>
	);
}
