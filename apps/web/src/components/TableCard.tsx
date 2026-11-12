import Card, { type CardProps } from "@mui/material/Card";
import { createContext, useContext } from "react";
import { useViewMode } from "#/lib/view-mode";

const OnCard = createContext<boolean | null>(null);

/** Whether the list sits on a card (its toolbar then pads in from the card's edge) or flat on the
 * page (flush with everything else). Outside a `TableCard` it follows the view mode. */
export function useOnCard(): boolean {
	const onCard = useContext(OnCard);
	const cards = useViewMode() === "cards";
	return onCard ?? !cards;
}

/**
 * The surface under a list. For a table it is a card; for the card grid it is flat (transparent),
 * so the toolbar and cards sit straight on the page like the site's lists. `flat` overrides the
 * automatic choice (the Accounts list is always a card).
 */
export default function TableCard({ flat, sx, ...props }: CardProps & { flat?: boolean }) {
	const cards = useViewMode() === "cards";
	const isFlat = flat ?? cards;
	return (
		<OnCard.Provider value={!isFlat}>
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
		</OnCard.Provider>
	);
}
