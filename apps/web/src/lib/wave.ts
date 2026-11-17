/** Points along a sine wave, one wavelength long plus a quarter more at each end, so a stroke drawn
 * through them and cut to one wavelength meets the next tile exactly. `height` is the tile height,
 * `thickness` the stroke, and the wave swings as far as the stroke allows. */
export function wavePoints(
	thickness: number,
	height: number,
	wavelength: number,
	steps = 24,
): { x: number; y: number }[] {
	const amplitude = (height - thickness) / 2;
	const middle = height / 2;
	const points: { x: number; y: number }[] = [];
	for (let i = -steps / 4; i <= steps + steps / 4; i++) {
		const x = (i * wavelength) / steps;
		points.push({ x, y: middle + amplitude * Math.sin((2 * Math.PI * x) / wavelength) });
	}
	return points;
}

/** A CSS `url(...)` of one wavelength of the wave as an SVG, for use as a mask (so any colour can
 * be painted through it). */
export function waveMask(thickness: number, height: number, wavelength: number): string {
	const path = wavePoints(thickness, height, wavelength)
		.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
		.join("");
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${wavelength}" height="${height}" viewBox="0 0 ${wavelength} ${height}"><path d="${path}" fill="none" stroke="black" stroke-width="${thickness}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
	return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
