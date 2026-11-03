import Box from "@mui/material/Box";
import type { CircleMarker } from "leaflet";
import { useEffect, useEffectEvent, useRef } from "react";
import { DEFAULT_CENTER } from "#/lib/places";
import type { PlaceTotal } from "#/types/api";
import { useLeafletMap } from "./useLeafletMap";

/** The popup for a spot, built from text nodes (names are typed by people, so never as HTML). */
function popup(name: string, money: string, times: string): HTMLElement {
	const box = document.createElement("div");
	const title = document.createElement("strong");
	title.textContent = name;
	const line = document.createElement("div");
	line.textContent = `${money} · ${times}`;
	box.append(title, line);
	return box;
}

/**
 * Where the spending went: a circle for each spot, bigger for more money. Clicking a circle tells
 * the page (`onFocus`), and the page can point at one with `focused`, which flies there and opens
 * its popup.
 */
export default function PlacesMap({
	places,
	names,
	money,
	focused,
	onFocus,
}: {
	places: PlaceTotal[];
	/** What to call each spot, in the same order */
	names: string[];
	/** Each spot's total as text, in the same order */
	money: string[];
	focused: number | null;
	onFocus: (index: number) => void;
}) {
	const { ref, L, map } = useLeafletMap({ center: DEFAULT_CENTER, zoom: 11 });
	const markers = useRef<CircleMarker[]>([]);
	// what to do when a circle is clicked can change every render without redrawing the circles
	const focus = useEffectEvent((index: number) => onFocus(index));

	useEffect(() => {
		if (!map || !L) return;
		const group = L.featureGroup();
		const biggest = Math.max(...places.map((p) => Number(p.spent)), 1);
		const created = places.map((p, i) => {
			const spent = Math.max(0, Number(p.spent));
			const marker = L.circleMarker([Number(p.latitude), Number(p.longitude)], {
				radius: 6 + Math.sqrt(spent / biggest) * 18,
				className: "maalu-place",
			});
			marker.bindPopup(
				popup(names[i], money[i], `${p.count} ${p.count === 1 ? "transaction" : "transactions"}`),
			);
			marker.addTo(group);
			return marker;
		});
		markers.current = created;
		// a click on any circle reaches the group, which says which one it was
		const onClick = (e: { layer?: unknown }) => {
			const index = created.indexOf(e.layer as CircleMarker);
			if (index >= 0) focus(index);
		};
		group.on("click", onClick);
		group.addTo(map);
		if (places.length > 0) map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 15 });
		return () => {
			group.off("click", onClick);
			group.remove();
			markers.current = [];
		};
	}, [map, L, places, names, money]);

	useEffect(() => {
		if (!map) return;
		markers.current.forEach((m, i) =>
			m.getElement()?.classList.toggle("is-focused", i === focused),
		);
		const marker = focused === null ? undefined : markers.current[focused];
		if (!marker) return;
		map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 14), { duration: 0.6 });
		marker.openPopup();
	}, [map, focused]);

	return (
		<Box
			ref={ref}
			className="maalu-map"
			role="application"
			aria-label="Map of where you spent"
			sx={{ height: { xs: 320, md: 440 }, width: "100%" }}
		/>
	);
}
