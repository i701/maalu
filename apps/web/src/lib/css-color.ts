/** A colour as 0 to 1 red, green and blue channels. */
export type Rgb = [number, number, number];

/**
 * Any CSS colour the browser understands, `var()` and `color-mix()` included, as 0 to 1 channels.
 * It is resolved on `el`, so theme variables take the values of the current colour mode. Returns
 * `fallback` when the browser cannot read it.
 */
export function resolveCssColor(el: HTMLElement, value: string, fallback: Rgb): Rgb {
	el.style.color = "";
	el.style.color = value;
	const text = getComputedStyle(el).color;
	const rgb = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(text);
	if (rgb) return [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255];
	const srgb = /color\(srgb\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)/.exec(text);
	if (srgb) return [Number(srgb[1]), Number(srgb[2]), Number(srgb[3])];
	return fallback;
}
