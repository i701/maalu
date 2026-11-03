import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PlaceSearchResponse } from "#/types/api";
import { apiRequest } from "./api";

export type MapConfig = { tileUrl: string; attribution: string };

const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
	'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

/** Where the map's tiles come from. Set by whoever runs the server (`MAP_TILE_URL`, with
 * `MAP_ATTRIBUTION` crediting the source), so a self-hoster can use their own tile server; the
 * default is OpenStreetMap's public one, which asks for light personal use only. The browser
 * fetches the tiles itself, so it tells that server which area is being looked at. */
export const getMapConfigFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<MapConfig> => ({
		tileUrl: process.env.MAP_TILE_URL || OSM_TILES,
		attribution: process.env.MAP_ATTRIBUTION || OSM_ATTRIBUTION,
	}),
);

/** Find places by name, to put a pin on the map. Only the typed text (and roughly where the map is,
 * to prefer nearby places) goes to the geocoder, and only when the person presses Search. */
export const searchPlacesFn = createServerFn({ method: "GET" })
	.validator(
		z.object({
			q: z.string().trim().min(2).max(200),
			near_lat: z.number().min(-90).max(90).optional(),
			near_lng: z.number().min(-180).max(180).optional(),
		}),
	)
	.handler(async ({ data }) =>
		apiRequest<PlaceSearchResponse>("/places/search", {
			query: { q: data.q, near_lat: data.near_lat, near_lng: data.near_lng },
		}),
	);
