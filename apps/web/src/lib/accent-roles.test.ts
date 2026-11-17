import { describe, expect, it } from "vitest";
import { ACCENT_NAMES, accentRoles, hexToRgb } from "#/lib/accent-roles";
import { M3_DARK, M3_LIGHT } from "#/lib/m3";

const linear = (v: number) => {
	const c = v / 255;
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

function luminance(hex: string): number {
	const [R, G, B] = hexToRgb(hex);
	return 0.2126 * linear(R) + 0.7152 * linear(G) + 0.0722 * linear(B);
}
const contrast = (a: string, b: string) => {
	const [x, y] = [luminance(a), luminance(b)];
	return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

describe("accent roles", () => {
	for (const accent of ACCENT_NAMES) {
		it(`${accent} keeps readable pairs in both schemes`, () => {
			const light = accentRoles(accent, "light");
			const dark = accentRoles(accent, "dark");
			// text-sized primary on a white card, and on the page
			expect(contrast(light.primary, "#ffffff")).toBeGreaterThanOrEqual(4.5);
			expect(contrast(light.primary, M3_LIGHT.surface)).toBeGreaterThanOrEqual(4.5);
			expect(contrast(light.onPrimary, light.primary)).toBeGreaterThanOrEqual(4.5);
			expect(contrast(light.onPrimaryContainer, light.primaryContainer)).toBeGreaterThanOrEqual(7);
			expect(contrast(light.onSecondaryContainer, light.secondaryContainer)).toBeGreaterThanOrEqual(
				7,
			);
			expect(contrast(dark.primary, M3_DARK.surfaceContainerLow)).toBeGreaterThanOrEqual(4.5);
			expect(contrast(dark.onPrimary, dark.primary)).toBeGreaterThanOrEqual(4.5);
			expect(contrast(dark.onPrimaryContainer, dark.primaryContainer)).toBeGreaterThanOrEqual(7);
			expect(contrast(dark.onSecondaryContainer, dark.secondaryContainer)).toBeGreaterThanOrEqual(
				7,
			);
		});
	}
});
