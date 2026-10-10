import { type ReactNode, useEffect, useState } from "react";
import { DURATION, EASE_OUT, useReducedMotion } from "#/lib/motion";

/**
 * Smoothly shows/hides content that would otherwise pop in and shove everything below it. The
 * space opens and closes while the content fades.
 *
 * Height is animated with `grid-template-rows: 0fr <-> 1fr`, which needs no measuring. Opening is
 * a two-step: mount the content while still closed, then open one frame later, because the browser
 * can only animate from a state it has already drawn. The content is unmounted once fully closed,
 * so hidden form fields never take part in validation.
 *
 * Put any spacing *inside* the children (padding), not outside: margins outside the wrapper would
 * jump. With reduced motion the size change is instant and only a short fade remains.
 */
export default function Reveal({ in: show, children }: { in: boolean; children: ReactNode }) {
	const reduced = useReducedMotion();
	const [present, setPresent] = useState(show); // is the content mounted?
	const [armed, setArmed] = useState(show); // has the open state been drawn at least once?
	if (show && !present) setPresent(true); // opening: mount it (still closed)

	useEffect(() => {
		if (!show) return;
		let inner = 0;
		const outer = requestAnimationFrame(() => {
			inner = requestAnimationFrame(() => setArmed(true));
		});
		return () => {
			cancelAnimationFrame(outer);
			cancelAnimationFrame(inner);
		};
	}, [show]);

	const open = show && armed;
	const ms = reduced ? 120 : DURATION.reveal;

	return (
		<div
			style={{
				display: "grid",
				gridTemplateRows: open ? "1fr" : "0fr",
				opacity: open ? 1 : 0,
				transition: reduced
					? `opacity ${ms}ms ${EASE_OUT}`
					: `grid-template-rows ${ms}ms ${EASE_OUT}, opacity ${ms}ms ${EASE_OUT}`,
			}}
			onTransitionEnd={(e) => {
				// Fully closed: unmount the content and reset for the next open.
				if (e.target === e.currentTarget && !show) {
					setPresent(false);
					setArmed(false);
				}
			}}
		>
			<div style={{ overflow: "hidden", minHeight: 0 }}>{present ? children : null}</div>
		</div>
	);
}
