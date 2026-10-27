import Card, { type CardProps } from "@mui/material/Card";
import { useViewMode } from "#/lib/view-mode";

/**
 * The surface under a list. For a table it is a card; for the card grid it is flat (transparent),
 * so the toolbar and cards sit straight on the page like the site's lists. `flat` overrides the
 * automatic choice (the Accounts table is always a card).
 */
export default function TableCard({ flat, sx, ...props }: CardProps & { flat?: boolean }) {
	const cards = useViewMode() === "cards";
	const isFlat = flat ?? cards;
	return (
		<Card
			{...props}
			sx={[
				isFlat && {
					bgcolor: "transparent",
					borderRadius: 0,
					overflow: "visible",
				},
				...(Array.isArray(sx) ? sx : [sx]),
			]}
		/>
	);
}
