import { describe, expect, it } from "vitest";
import { accentForPath, BOTTOM_NAV_ITEMS, inBottomBar, NAV_ITEMS } from "./nav";

describe("the bottom bar", () => {
	it("has four destinations, leaving room for More", () => {
		expect(BOTTOM_NAV_ITEMS).toHaveLength(4);
	});

	it("knows its own pages and the pages under them", () => {
		expect(inBottomBar("/dashboard")).toBe(true);
		expect(inBottomBar("/accounts")).toBe(true);
		expect(inBottomBar("/accounts/7a1c")).toBe(true);
	});

	it("leaves every other page to More", () => {
		expect(inBottomBar("/trends")).toBe(false);
		expect(inBottomBar("/settings")).toBe(false);
		// a name that only starts the same is not under it
		expect(inBottomBar("/budgetary")).toBe(false);
		for (const item of NAV_ITEMS.filter((i) => !i.bottom)) expect(inBottomBar(item.to)).toBe(false);
	});
});

describe("a page's accent", () => {
	it("is its destination's colour, and its parent's for a page under one", () => {
		expect(accentForPath("/accounts")).toBe("green");
		expect(accentForPath("/accounts/abc")).toBe("green");
		expect(accentForPath("/budget")).toBe("amber");
	});

	it("is none outside the nav, and a name that merely starts alike is not a match", () => {
		expect(accentForPath("/settings")).toBeUndefined();
		expect(accentForPath("/login")).toBeUndefined();
		expect(accentForPath("/accountsfoo")).toBeUndefined();
	});
});
