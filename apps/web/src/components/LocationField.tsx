import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import { useState } from "react";
import { placeLabel, type PlaceValue } from "#/lib/places";
import LocationDialog from "./map/LocationDialog";

/** "Add location" or the spot that is marked: click it to change, its cross removes it. The dialog
 * with the map opens on top, so this fits in any form. */
export default function LocationField({
	value,
	onChange,
	title,
}: {
	value: PlaceValue | null;
	onChange: (value: PlaceValue | null) => void;
	title?: string;
}) {
	const [open, setOpen] = useState(false);
	return (
		<>
			{value ? (
				<Chip
					icon={<PlaceOutlinedIcon />}
					label={placeLabel(value)}
					onClick={() => setOpen(true)}
					onDelete={() => onChange(null)}
					aria-label={`Location: ${placeLabel(value)}. Change`}
					sx={{ maxWidth: "100%" }}
				/>
			) : (
				<Button
					size="small"
					color="inherit"
					startIcon={<PlaceOutlinedIcon />}
					onClick={() => setOpen(true)}
				>
					Add location
				</Button>
			)}
			{open && (
				<LocationDialog
					initial={value}
					title={title}
					onSave={onChange}
					onClose={() => setOpen(false)}
				/>
			)}
		</>
	);
}
