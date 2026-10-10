import Card, { type CardProps } from "@mui/material/Card";

/** Card that wraps a table. Corners come from the theme's single `shape.borderRadius`. */
export default function TableCard(props: CardProps) {
	return <Card {...props} />;
}
