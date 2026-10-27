import Slide, { type SlideProps } from "@mui/material/Slide";
import { forwardRef } from "react";

/** Slides a sheet up from the bottom edge on the default spatial spring, and back down faster on
 * exit. The transition every dialog uses (set as the theme's Dialog default). */
const SheetTransition = forwardRef<unknown, SlideProps>(function SheetTransition(props, ref) {
	return (
		<Slide
			ref={ref}
			direction="up"
			easing={{ enter: "var(--spring-spatial-default)", exit: "var(--ease-emph-accel)" }}
			{...props}
		/>
	);
});

export default SheetTransition;
