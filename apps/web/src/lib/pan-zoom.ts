/** A pan and zoom: the content is drawn at `scale`, shifted by `x` and `y` (px) from the top left. */
export type View = { scale: number; x: number; y: number };
export type Size = { width: number; height: number };

export const MIN_SCALE = 0.2;
export const MAX_SCALE = 6;

const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

/** Zoom by `factor` around a point of the viewport, so the content under that point stays put. */
export function zoomAt(view: View, factor: number, px: number, py: number): View {
	const scale = clampScale(view.scale * factor);
	const k = scale / view.scale;
	return { scale, x: px - (px - view.x) * k, y: py - (py - view.y) * k };
}

/** The view that shows all of the content, centred, never bigger than its real size. */
export function fitView(content: Size, viewport: Size, margin = 16): View {
	const scale = clampScale(
		Math.min(
			1,
			(viewport.width - 2 * margin) / content.width,
			(viewport.height - 2 * margin) / content.height,
		),
	);
	return {
		scale,
		x: (viewport.width - content.width * scale) / 2,
		y: (viewport.height - content.height * scale) / 2,
	};
}
