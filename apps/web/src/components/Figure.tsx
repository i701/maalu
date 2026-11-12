import Box from "@mui/material/Box";
import { splitCurrency } from "#/lib/format";

/**
 * A headline figure: the number large and light with even-width digits, the currency in front of
 * it small and muted, so the eye lands on the number. The size comes from the text around it.
 */
export default function Figure({ children }: { children: string }) {
	const { currency, number } = splitCurrency(children);
	return (
		<Box
			component="span"
			sx={{ fontWeight: 300, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}
		>
			{currency && (
				<Box
					component="span"
					sx={{
						// smaller than the number, on the same baseline
						fontSize: "max(0.62em, 12px)",
						fontWeight: 400,
						letterSpacing: "0.02em",
						mr: "0.3em",
						// the figure's own colour, a step quieter
						color: "inherit",
						opacity: 0.72,
					}}
				>
					{currency}
				</Box>
			)}
			{number}
		</Box>
	);
}
