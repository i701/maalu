import { describe, expect, it } from "vitest";
import {
	formatCoordinates,
	newPlacePayload,
	parseCoordinates,
	placeLabel,
	placeRangeBounds,
	placeOf,
	placePayload,
	toCoordinate,
	wrapLongitude,
} from "./places";

describe("toCoordinate", () => {
	it("is six decimals", () => {
		expect(toCoordinate(4.1755)).toBe("4.175500");
		expect(toCoordinate(-73.50931234567)).toBe("-73.509312");
	});
});

describe("wrapLongitude", () => {
	it("leaves a valid longitude alone", () => {
		expect(wrapLongitude(73.5)).toBe(73.5);
		expect(wrapLongitude(-179.9)).toBeCloseTo(-179.9);
	});
	it("folds a scrolled-around world back", () => {
		expect(wrapLongitude(190)).toBeCloseTo(-170);
		expect(wrapLongitude(-190)).toBeCloseTo(170);
		expect(wrapLongitude(433.5)).toBeCloseTo(73.5);
	});
});

describe("parseCoordinates", () => {
	it("reads a pair as copied from a map app", () => {
		expect(parseCoordinates("4.1755, 73.5093")).toEqual({ lat: 4.1755, lng: 73.5093 });
		expect(parseCoordinates("  4.1755 73.5093 ")).toEqual({ lat: 4.1755, lng: 73.5093 });
		expect(parseCoordinates("-33.86;151.2")).toEqual({ lat: -33.86, lng: 151.2 });
	});
	it("refuses anything else", () => {
		expect(parseCoordinates("")).toBeNull();
		expect(parseCoordinates("4.1755")).toBeNull();
		expect(parseCoordinates("4.1755, 73.5093, 9")).toBeNull();
		expect(parseCoordinates("north, east")).toBeNull();
		expect(parseCoordinates("91, 10")).toBeNull();
		expect(parseCoordinates("10, 181")).toBeNull();
	});
	it("allows the edges", () => {
		expect(parseCoordinates("-90, 180")).toEqual({ lat: -90, lng: 180 });
	});
});

describe("formatCoordinates and placeLabel", () => {
	it("shows four decimals without needless zeros", () => {
		expect(formatCoordinates({ latitude: "4.175500", longitude: "73.509300" })).toBe(
			"4.1755, 73.5093",
		);
		expect(formatCoordinates({ latitude: 4, longitude: "73.12345678" })).toBe("4, 73.1235");
	});
	it("prefers the name and falls back to the coordinates", () => {
		expect(placeLabel({ place: "Fish market", latitude: 1, longitude: 2 })).toBe("Fish market");
		expect(placeLabel({ place: null, latitude: "4.1755", longitude: "73.5093" })).toBe(
			"4.1755, 73.5093",
		);
		expect(placeLabel({ place: null, latitude: null, longitude: null })).toBe("");
	});
});

describe("placeOf", () => {
	it("is null without both coordinates", () => {
		expect(placeOf({ latitude: null, longitude: null })).toBeNull();
		expect(placeOf({ latitude: "1", longitude: null })).toBeNull();
	});
	it("carries the coordinates as strings and a missing name as empty", () => {
		expect(placeOf({ latitude: 4.1755, longitude: "73.5093", place: null })).toEqual({
			latitude: "4.1755",
			longitude: "73.5093",
			place: "",
		});
	});
});

describe("what is sent", () => {
	const spot = { latitude: "4.175500", longitude: "73.509300", place: "  Cafe " };
	it("sends the trimmed name, or null, and null everywhere to remove", () => {
		expect(placePayload(spot)).toEqual({
			latitude: "4.175500",
			longitude: "73.509300",
			place: "Cafe",
		});
		expect(placePayload({ ...spot, place: "  " }).place).toBeNull();
		expect(placePayload(null)).toEqual({ latitude: null, longitude: null, place: null });
	});
	it("sends nothing for a new thing without a spot, and no empty name with one", () => {
		expect(newPlacePayload(null)).toEqual({});
		expect(newPlacePayload({ ...spot, place: "" }).place).toBeUndefined();
	});
});

describe("placeRangeBounds", () => {
	it("covers the month, three months back, the year or everything", () => {
		expect(placeRangeBounds("month", "2026-11-15")).toEqual({
			date_from: "2026-11-01",
			date_to: "2026-11-30",
		});
		expect(placeRangeBounds("3months", "2026-11-15")).toEqual({
			date_from: "2026-09-01",
			date_to: "2026-11-30",
		});
		expect(placeRangeBounds("year", "2026-11-15")).toEqual({
			date_from: "2026-01-01",
			date_to: "2026-12-31",
		});
		expect(placeRangeBounds("all", "2026-11-15")).toEqual({});
	});

	it("reaches back over a year boundary", () => {
		expect(placeRangeBounds("3months", "2026-01-10").date_from).toBe("2025-11-01");
	});
});
