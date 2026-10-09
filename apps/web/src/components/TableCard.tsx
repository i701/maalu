import Card, { type CardProps } from "@mui/material/Card";
import { LARGE_SURFACE_RADIUS } from "#/theme";

/** Card that wraps a table: rounder than the small stat/profile cards. */
export default function TableCard({ sx, ...props }: CardProps) {
	return (
		<Card
			sx={[{ borderRadius: `${LARGE_SURFACE_RADIUS}px` }, ...(Array.isArray(sx) ? sx : [sx])]}
			{...props}
		/>
	);
}
