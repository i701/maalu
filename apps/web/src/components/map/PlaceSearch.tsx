import SearchIcon from "@mui/icons-material/Search";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { searchPlacesFn } from "#/server/map";
import type { PlaceSearchHit } from "#/types/api";

/**
 * A box to look a place up by name. It searches when you press Search or Enter, not as you type:
 * the text goes to a geocoding service, so it is only sent when you ask. `where` says roughly where
 * the map is, to prefer places nearby. Choosing a result hands it to `onPick`.
 */
export default function PlaceSearch({
	where,
	onPick,
}: {
	where: () => { lat: number; lng: number } | null;
	onPick: (hit: PlaceSearchHit) => void;
}) {
	const [text, setText] = useState("");
	const [hits, setHits] = useState<PlaceSearchHit[] | null>(null);
	const [busy, setBusy] = useState(false);
	const [problem, setProblem] = useState<string | null>(null);

	async function search() {
		const q = text.trim();
		if (q.length < 2) return;
		setBusy(true);
		setProblem(null);
		const near = where();
		try {
			const res = await searchPlacesFn({
				data: { q, near_lat: near?.lat, near_lng: near?.lng },
			});
			if (res.ok) setHits(res.data.results);
			else {
				setHits(null);
				setProblem(res.error);
			}
		} catch {
			setHits(null);
			setProblem("The search failed. Try again.");
		} finally {
			setBusy(false);
		}
	}

	return (
		<Stack sx={{ gap: 1 }}>
			<Stack direction="row" sx={{ gap: 1 }}>
				<TextField
					label="Search for a place"
					value={text}
					onChange={(e) => setText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							void search();
						}
					}}
					placeholder="Male Fish Market"
					slotProps={{ htmlInput: { maxLength: 200 } }}
				/>
				<Button
					variant="outlined"
					startIcon={<SearchIcon />}
					onClick={() => void search()}
					disabled={busy || text.trim().length < 2}
					sx={{ flexShrink: 0, height: 56 }}
				>
					{busy ? "Searching…" : "Search"}
				</Button>
			</Stack>
			{problem && <Alert severity="warning">{problem}</Alert>}
			{hits?.length === 0 && <Alert severity="info">No place found. Try other words.</Alert>}
			{hits && hits.length > 0 && (
				<List
					dense
					disablePadding
					aria-label="Places found"
					sx={{ maxHeight: 200, overflowY: "auto" }}
				>
					{hits.map((h) => (
						<ListItemButton
							key={`${h.latitude},${h.longitude},${h.address}`}
							onClick={() => onPick(h)}
						>
							<ListItemText
								primary={h.name}
								secondary={h.address}
								slotProps={{ secondary: { noWrap: true } }}
							/>
						</ListItemButton>
					))}
				</List>
			)}
		</Stack>
	);
}
