import { createContext, type ReactNode, useContext } from "react";
import { morph, morphUp } from "./shape";

/**
 * Which way a card's corners spring on hover. By default (`down`) a card rests at 28px and goes
 * squarer under the pointer, the app's rule. A page can flip it for its cards (`up`: squarer at
 * rest, rounding up on hover) by wrapping them in `CardMorph`, without every card needing a prop.
 * Cards that read it call `useCardMorph()` where they used to spread `morph("xl")`.
 */
const Direction = createContext<"down" | "up">("down");

export function CardMorph({
	direction,
	children,
}: {
	direction: "down" | "up";
	children: ReactNode;
}) {
	return <Direction.Provider value={direction}>{children}</Direction.Provider>;
}

/** The corner styles for a card (28px) in the direction the page chose. */
export function useCardMorph() {
	return useContext(Direction) === "up" ? morphUp("xl") : morph("xl");
}
