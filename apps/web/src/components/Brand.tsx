import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export default function Brand({ subtitle }: { subtitle?: string }) {
	return (
		<Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
			<Avatar
				variant="rounded"
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
