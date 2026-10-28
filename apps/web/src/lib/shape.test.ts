import { describe, expect, it } from "vitest";
import { morph } from "./shape";

const HOVER = "@media (pointer: fine) and (hover: hover)";

const active = (rest: Parameters<typeof morph>[0]) => morph(rest)[HOVER]["&:hover"].borderRadius;

describe("morph", () => {
	it("rests at the token and goes one step less rounded on hover and focus", () => {
		const card = morph("xl");
		expect(card.borderRadius).toBe("var(--shape-xl)");
		expect(card[HOVER]["&:hover"].borderRadius).toBe("var(--shape-lg)");
		expect(card["&:focus-visible, &:focus-within"].borderRadius).toBe("var(--shape-lg)");
	});

	it("steps down the whole scale", () => {
		expect(active("xxl")).toBe("var(--shape-xl)");
		expect(active("lg")).toBe("var(--shape-md)");
		expect(active("md")).toBe("var(--shape-sm)");
		expect(active("sm")).toBe("var(--shape-xs)");
		expect(active("xs")).toBe("var(--shape-xs)"); // nothing squarer to go to
	});

	it("drops a fully round shape to the medium corner", () => {
		expect(morph("full")[HOVER]["&:hover"].borderRadius).toBe("var(--shape-md)");
	});

	it("accepts a raw radius and an explicit target", () => {
		const pill = morph("24px", "md");
		expect(pill.borderRadius).toBe("24px");
		expect(pill[HOVER]["&:hover"].borderRadius).toBe("var(--shape-md)");
		expect(morph("20px")[HOVER]["&:hover"].borderRadius).toBe("var(--shape-md)");
	});

	it("springs the corners, and stops for reduced motion", () => {
		const m = morph("xl");
		expect(m.transition).toContain("border-radius");
		expect(m["@media (prefers-reduced-motion: reduce)"].transition).toBe("none");
	});

	it("uses a media key different from the usual hover query, so spreading it can't be overridden", () => {
		expect(Object.keys(morph("xl"))).not.toContain("@media (hover: hover) and (pointer: fine)");
	});
});
