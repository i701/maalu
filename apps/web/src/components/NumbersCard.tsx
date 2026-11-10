import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useAction } from "#/lib/use-action";
import { updateMeFn } from "#/server/auth";
import type { User } from "#/types/api";

/** How amounts are written. Off (the default), a figure is shown in full ("MVR 1,234.50") and only
 * a tight place, such as a strip of three figures on a phone, shortens it, from 10,000 up. On, every
 * amount of a thousand and over is shortened everywhere ("MVR 1.23K", "MVR 513.58M"). */
export default function NumbersCard({ me }: { me: User }) {
	const { run, pending, error } = useAction();
	return (
		<Card sx={{ maxWidth: 640 }}>
			<CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
				<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
					Numbers
				</Typography>
				<FormControlLabel
					control={
						<Switch
							checked={me.compact_numbers}
							disabled={pending}
							onChange={(_, on) => void run(() => updateMeFn({ data: { compact_numbers: on } }))}
						/>
					}
					label="Short numbers"
				/>
				<Typography variant="caption" component="p" sx={{ color: "text.secondary", ml: 6 }}>
					Show amounts of a thousand and over in a short form, like 1.2K or 3.4M, everywhere. Off,
					amounts are shown in full, and only tight places (a row of figures on a phone) shorten
					them, from 10,000 up. The exact amount is always on hover.
				</Typography>
				{error && (
					<Typography variant="caption" sx={{ color: "error.main" }}>
						{error}
					</Typography>
				)}
			</CardContent>
		</Card>
	);
}
