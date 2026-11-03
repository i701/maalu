import { monthBounds, shiftMonth } from "./dashboard";

/** A spot on the map as the forms and the API carry it: coordinates as decimal strings (six
 * decimals, about 10 cm) and an optional name. */
export type PlaceValue = { latitude: string; longitude: string; place: string };

/** Where the map starts when nothing is marked yet: Malé. */
export const DEFAULT_CENTER: [number, number] = [4.1755, 73.5093];

type Located = {
	latitude?: string | number | null;
	longitude?: string | number | null;
	place?: string | null;
};

/** A coordinate as the API takes it: six decimals, no exponent. */
export const toCoordinate = (n: number): string => n.toFixed(6);

/** Longitude as the map reports it can run past the edge when the world is scrolled around; fold
 * it back into -180 to 180. */
export function wrapLongitude(lng: number): number {
	return ((((lng + 180) % 360) + 360) % 360) - 180;
}

/** "4.1755, 73.5093" (as copied from a map app) or "4.1755 73.5093" as numbers; null when it is
 * not a pair of coordinates on the planet. */
export function parseCoordinates(text: string): { lat: number; lng: number } | null {
	const parts = text
		.trim()
		.split(/[\s,;]+/)
		.filter(Boolean);
	if (parts.length !== 2) return null;
	const [lat, lng] = parts.map(Number);
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
	if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
	return { lat, lng };
}

const fourDecimals = (v: string | number) => Number(Number(v).toFixed(4)).toString();

/** "4.1755, 73.5093": enough digits to tell two shops apart, few enough to read. */
export function formatCoordinates(p: { latitude: string | number; longitude: string | number }) {
	return `${fourDecimals(p.latitude)}, ${fourDecimals(p.longitude)}`;
}

/** The spot a transaction or vendor is marked at, or null when it is not marked. */
export function placeOf(item: Located): PlaceValue | null {
	if (item.latitude == null || item.longitude == null) return null;
	return {
		latitude: String(item.latitude),
		longitude: String(item.longitude),
		place: item.place ?? "",
	};
}

/** A short label for a spot: its name, else its coordinates. */
export function placeLabel(p: Located): string {
	if (p.place) return p.place;
	return p.latitude == null || p.longitude == null
		? ""
		: formatCoordinates({ latitude: p.latitude, longitude: p.longitude });
}

/** What to send for a spot when saving something that already exists: all three fields, null to
 * remove the location. */
export function placePayload(p: PlaceValue | null) {
	return p
		? { latitude: p.latitude, longitude: p.longitude, place: p.place.trim() || null }
		: { latitude: null, longitude: null, place: null };
}

/** The same for something new: nothing to send without a spot. */
export function newPlacePayload(p: PlaceValue | null) {
	return p
		? { latitude: p.latitude, longitude: p.longitude, place: p.place.trim() || undefined }
		: {};
}

/** The spans the Places page offers. */
export const PLACE_RANGES = ["month", "3months", "year", "all"] as const;
export type PlaceRange = (typeof PLACE_RANGES)[number];

export const PLACE_RANGE_LABELS: Record<PlaceRange, string> = {
	month: "This month",
	"3months": "3 months",
	year: "This year",
	all: "All time",
};

/** The first and last day a range covers, as ISO dates (none for all time), given today's date. */
export function placeRangeBounds(
	range: PlaceRange,
	today: string,
): { date_from?: string; date_to?: string } {
	const thisMonth = monthBounds(today);
	if (range === "month") return { date_from: thisMonth.start, date_to: thisMonth.end };
	if (range === "3months")
		return { date_from: shiftMonth(thisMonth.start, -2), date_to: thisMonth.end };
	if (range === "year")
		return { date_from: `${today.slice(0, 4)}-01-01`, date_to: `${today.slice(0, 4)}-12-31` };
	return {};
}
