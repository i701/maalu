import MyLocationIcon from "@mui/icons-material/MyLocation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState } from "react";
import {
	DEFAULT_CENTER,
	formatCoordinates,
	parseCoordinates,
	toCoordinate,
	wrapLongitude,
	type PlaceValue,
} from "#/lib/places";
import { useSheet } from "#/lib/sheet";
import type { PlaceSearchHit } from "#/types/api";
import PlaceSearch from "./PlaceSearch";
import { useLeafletMap } from "./useLeafletMap";

type Point = { lat: number; lng: number };

/**
 * Marks where something happened: click the map (or drag the pin), type or paste coordinates, or
 * use where you are now. The name is optional. Saving with no pin removes the location. Nothing is
 * looked up: the coordinates are only what you chose.
 */
export default function LocationDialog({
	initial,
	title = "Location",
	onSave,
	onClose,
}: {
	initial: PlaceValue | null;
	title?: string;
	onSave: (value: PlaceValue | null) => void;
	onClose: () => void;
}) {
	const sheet = useSheet(onClose);
	const [point, setPoint] = useState<Point | null>(
		initial ? { lat: Number(initial.latitude), lng: Number(initial.longitude) } : null,
	);
	const [name, setName] = useState(initial?.place ?? "");
	const [coords, setCoords] = useState(initial ? formatCoordinates(initial) : "");
	const [geoError, setGeoError] = useState<string | null>(null);
	const { ref, L, map } = useLeafletMap({
		center: point ? [point.lat, point.lng] : DEFAULT_CENTER,
		zoom: point ? 16 : 11,
	});

	/** A pin placed on the map: its coordinates also fill the text box. */
	const drop = useCallback((lat: number, lng: number) => {
		setPoint({ lat, lng: wrapLongitude(lng) });
		setCoords(formatCoordinates({ latitude: lat, longitude: wrapLongitude(lng) }));
		setGeoError(null);
	}, []);

	useEffect(() => {
		if (!map) return;
		const onClick = (e: { latlng: { lat: number; lng: number } }) =>
			drop(e.latlng.lat, e.latlng.lng);
		map.on("click", onClick);
		return () => {
			map.off("click", onClick);
		};
	}, [map, drop]);

	useEffect(() => {
		if (!map || !L || !point) return;
		const marker = L.marker([point.lat, point.lng], {
			draggable: true,
			icon: L.divIcon({ className: "", html: '<div class="maalu-pin"></div>', iconSize: [0, 0] }),
		}).addTo(map);
		marker.on("dragend", () => {
			const at = marker.getLatLng();
			drop(at.lat, at.lng);
		});
		return () => {
			marker.off();
			marker.remove();
		};
	}, [map, L, point, drop]);

	function typed(text: string) {
		setCoords(text);
		const parsed = parseCoordinates(text);
		if (!parsed) return;
		setPoint(parsed);
		map?.setView([parsed.lat, parsed.lng], Math.max(map.getZoom(), 15));
	}

	function here() {
		if (!navigator.geolocation) return setGeoError("This browser cannot tell where you are.");
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				drop(pos.coords.latitude, pos.coords.longitude);
				map?.setView([pos.coords.latitude, pos.coords.longitude], 17);
			},
			() => setGeoError("Could not get your position. Allow location access, or click the map."),
			{ enableHighAccuracy: true, timeout: 10_000 },
		);
	}

	/** A search result: put the pin there, and name the spot after it unless it already has a name. */
	function pick(hit: PlaceSearchHit) {
		drop(Number(hit.latitude), Number(hit.longitude));
		map?.setView([Number(hit.latitude), Number(hit.longitude)], 17);
		setName((current) => current.trim() || hit.name);
	}

	function save() {
		onSave(
			point
				? {
						latitude: toCoordinate(point.lat),
						longitude: toCoordinate(point.lng),
						place: name.trim(),
					}
				: null,
		);
		sheet.close();
	}

	const typedBad = coords.trim() !== "" && parseCoordinates(coords) === null;

	return (
		<Dialog
			open={sheet.open}
			onClose={sheet.close}
			maxWidth="sm"
			fullWidth
			aria-labelledby="location-title"
			slotProps={{ transition: { onExited: sheet.onExited } }}
		>
			<DialogTitle id="location-title">{title}</DialogTitle>
			<DialogContent>
				<Stack sx={{ gap: 2, pt: 1 }}>
					<PlaceSearch
						where={() => {
							const at = map?.getCenter();
							return at ? { lat: at.lat, lng: at.lng } : null;
						}}
						onPick={pick}
					/>
					<Box
						ref={ref}
						className="maalu-map"
						role="application"
						aria-label="Map: click to place the pin"
						sx={{ height: 320, width: "100%" }}
					/>
					<Typography variant="caption" sx={{ color: "text.secondary", mt: -1 }}>
						Search above, or click the map to drop the pin, then drag it to adjust.
					</Typography>
					<Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 1.5 }}>
						<TextField
							label="Coordinates"
							value={coords}
							onChange={(e) => typed(e.target.value)}
							error={typedBad}
							helperText={typedBad ? "Latitude and longitude, like 4.1755, 73.5093" : " "}
						/>
						<Button
							variant="outlined"
							startIcon={<MyLocationIcon />}
							onClick={here}
							sx={{ flexShrink: 0, alignSelf: { sm: "flex-start" }, height: 56 }}
						>
							Where I am
						</Button>
					</Stack>
					{geoError && <Alert severity="warning">{geoError}</Alert>}
					<TextField
						label="Name (optional)"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Fish market"
						slotProps={{ htmlInput: { maxLength: 200 } }}
					/>
				</Stack>
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				{point && (
					<Button
						color="inherit"
						onClick={() => {
							setPoint(null);
							setCoords("");
						}}
						sx={{ mr: "auto" }}
					>
						Remove location
					</Button>
				)}
				<Button onClick={sheet.close} color="inherit">
					Cancel
				</Button>
				<Button variant="contained" onClick={save} disabled={typedBad}>
					Done
				</Button>
			</DialogActions>
		</Dialog>
	);
}
