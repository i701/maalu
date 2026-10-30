import Box from "@mui/material/Box";
import { categoryAccent } from "#/lib/categories";

/** A small round swatch in a category's colour, next to its name. Decorative: the name is the label. */
export default function CategoryDot({ color, size = 10 }: { color: string; size?: number }) {
	return (
		<Box
			component="span"
			aria-hidden
			sx={{
				display: "inline-block",
				flexShrink: 0,
				width: size,
				height: size,
				borderRadius: "50%",
				bgcolor: categoryAccent(color),
			}}
		/>
	);
}
