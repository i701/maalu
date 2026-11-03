import type { Map as LeafletMap } from "leaflet";
import { useCallback, useRef, useState } from "react";
import { useMapConfig } from "#/lib/map-config";

export type Leaflet = typeof import("leaflet");

/**
 * A Leaflet map in the element the returned `ref` is put on, with the server's tile source. Leaflet
 * needs the browser, so it is loaded when the element mounts (never during server rendering), and
 * `L` and `map` are null until it is there. `view` is only where the map starts.
 */
export function useLeafletMap(view: { center: [number, number]; zoom: number }) {
	const { tileUrl, attribution } = useMapConfig();
	const start = useRef(view);
	const [ready, setReady] = useState<{ L: Leaflet; map: LeafletMap } | null>(null);

	const ref = useCallback(
		(el: HTMLDivElement | null) => {
			if (!el) return;
			let cancelled = false;
			let map: LeafletMap | null = null;
			let observer: ResizeObserver | null = null;
			void import("leaflet").then((mod) => {
				if (cancelled) return;
				const L = ((mod as unknown as { default?: Leaflet }).default ?? mod) as Leaflet;
				map = L.map(el).setView(start.current.center, start.current.zoom);
				L.tileLayer(tileUrl, { attribution, maxZoom: 19 }).addTo(map);
				// a map made inside a dialog that is still opening has no size yet
				observer = new ResizeObserver(() => map?.invalidateSize());
				observer.observe(el);
				setReady({ L, map });
			});
			return () => {
				cancelled = true;
				observer?.disconnect();
				map?.remove();
				setReady(null);
			};
		},
		[tileUrl, attribution],
	);

	return { ref, L: ready?.L ?? null, map: ready?.map ?? null };
}
