import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

// Generated avatar, for now. A fixed non-personal seed, so every visitor gets the same logo and
// nothing about the user is sent. The "M" shows if it can't load (offline, blocked).
const LOGO_URL = "https://api.dicebear.com/10.x/glass/svg?seed=Maalu";

export default function Brand({ subtitle }: { subtitle?: string }) {
	return (
		<Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
			<Avatar
				src={LOGO_URL}
				alt=""
				slotProps={{ img: { referrerPolicy: "no-referrer" } }}
				sx={{
					bgcolor: "primary.main",
					width: subtitle ? 44 : 36,
					height: subtitle ? 44 : 36,
					fontWeight: 700,
					fontSize: subtitle ? 22 : 18,
				}}
			>
				M
			</Avatar>
			<div>
				<Typography component="div" sx={{ fontWeight: 600, lineHeight: 1.2, fontSize: 18 }}>
					Maalu{" "}
					<Typography component="span" variant="body2" lang="dv" sx={{ color: "text.secondary" }}>
						މާލު
					</Typography>
				</Typography>
				{subtitle && (
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						{subtitle}
					</Typography>
				)}
			</div>
		</Stack>
	);
}
