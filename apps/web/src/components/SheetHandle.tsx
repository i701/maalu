import Box from "@mui/material/Box";

/** The small grab bar at the top of a bottom sheet. Decorative, so hidden from assistive tech. */
export default function SheetHandle() {
	return (
		<Box
			aria-hidden
			sx={{
				width: 32,
				height: 4,
				borderRadius: 2,
				bgcolor: "var(--md-sys-color-outline)",
				opacity: 0.5,
				alignSelf: "center",
				flexShrink: 0,
				mt: 1.5,
				mb: 0.5,
			}}
		/>
	);
}
