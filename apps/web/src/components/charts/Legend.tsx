import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

/** A legend for two or more series: a swatch mirroring the mark (a square for bars) and the name
 * in text colours, never the series colour. */
export default function Legend({ items }: { items: { name: string; color: string }[] }) {
	return (
		<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
			{items.map((item) => (
				<Box key={item.name} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
					<Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: item.color }} />
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						{item.name}
					</Typography>
				</Box>
			))}
		</Box>
	);
}
