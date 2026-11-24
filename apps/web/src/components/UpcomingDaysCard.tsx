import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Slider from "@mui/material/Slider";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { UPCOMING_DAYS_MAX, UPCOMING_DAYS_MIN } from "#/lib/dashboard";
import { useAction } from "#/lib/use-action";
import { updateMeFn } from "#/server/auth";
import type { User } from "#/types/api";

/** How far ahead planned transactions are shown on the dashboard's Coming up card and on the
 * Transactions page's upcoming strip. The Month plan page and account pages list all of them. */
export default function UpcomingDaysCard({ me }: { me: User }) {
	const { run, pending, error } = useAction();
	const [days, setDays] = useState(me.upcoming_days);
	return (
		<Card sx={{ maxWidth: 640 }}>
			<CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
				<Typography variant="subtitle1" sx={{ mb: 1 }}>
					Coming up
				</Typography>
				<Typography variant="body2" sx={{ mb: 1 }}>
					Look ahead {days} days
				</Typography>
				<Slider
					value={days}
					min={UPCOMING_DAYS_MIN}
					max={UPCOMING_DAYS_MAX}
					step={1}
					valueLabelDisplay="auto"
					disabled={pending}
					aria-label="Days ahead for upcoming transactions"
					onChange={(_, value) => setDays(value)}
					onChangeCommitted={async (_, value) => {
						// a refused save puts the slider back on what the server still has
						if (!(await run(() => updateMeFn({ data: { upcoming_days: value } }))))
							setDays(me.upcoming_days);
					}}
				/>
				<Typography
					variant="caption"
					component="p"
					sx={{ color: error ? "error.main" : "text.secondary", mt: 0.5 }}
				>
					{error ??
						`How far ahead planned transactions show on the dashboard and the Transactions page, from ${UPCOMING_DAYS_MIN} to ${UPCOMING_DAYS_MAX} days. Overdue ones always show.`}
				</Typography>
			</CardContent>
		</Card>
	);
}
