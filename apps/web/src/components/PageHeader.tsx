import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export default function PageHeader({
	title,
	description,
	action,
}: {
	title: string;
	description?: string;
	action?: ReactNode;
}) {
	return (
		<Stack
			direction="row"
			sx={{
				mb: 3,
				justifyContent: "space-between",
				alignItems: "center",
				flexWrap: "wrap",
				gap: 2,
			}}
		>
			<div>
				<Typography variant="h1" component="h1">
					{title}
				</Typography>
				{description && (
					<Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary" }}>
						{description}
					</Typography>
				)}
			</div>
			{action}
		</Stack>
	);
}
