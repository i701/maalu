import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

// Generated avatar, for now. A fixed non-personal seed, so every visitor gets the same logo and
// nothing about the user is sent. The "M" shows if it can't load (offline, blocked).
const LOGO_URL = "https://api.dicebear.com/10.x/glass/svg?seed=Maalu";

export default function Brand({
	subtitle,
	iconOnly = false,
}: {
	subtitle?: string;
	/** Just the round logo, for the narrow rail. */
	iconOnly?: boolean;
}) {
	return (
		<Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
			<Avatar
				src={LOGO_URL}
				alt=""
				slotProps={{ img: { referrerPolicy: "no-referrer" } }}
				sx={{
					bgcolor: "primary.main",
					width: subtitle || iconOnly ? 44 : 36,
					height: subtitle || iconOnly ? 44 : 36,
					transition: "transform var(--spring-spatial-fast-dur) var(--spring-spatial-fast)",
					"@media (hover: hover) and (pointer: fine)": {
						"&:hover": { transform: "rotate(-12deg) scale(1.08)" },
					},
					fontWeight: 700,
					fontSize: subtitle ? 22 : 18,
				}}
			>
				M
			</Avatar>
			{!iconOnly && (
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
			)}
		</Stack>
	);
}
