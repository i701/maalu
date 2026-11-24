import { setViewMode, useViewMode, type ViewMode } from "#/lib/view-mode";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import IconSymbol from "./Symbol";

/** The site's segmented List / Photos toggle: switches every list between cards and a table. */
export default function ViewToggle() {
	const mode = useViewMode();
	return (
		<ToggleButtonGroup
			exclusive
			size="small"
			value={mode}
			onChange={(_, next: ViewMode | null) => next && setViewMode(next)}
			aria-label="View"
			sx={{
				"& .MuiToggleButtonGroup-grouped": { gap: 0.75, height: 36 },
				// icons only on a phone, to save room
				"& .view-label": { display: { xs: "none", sm: "inline" } },
			}}
		>
			<ToggleButton value="cards" aria-label="Cards">
				<IconSymbol name="view_agenda" size={18} />
				<span className="view-label">Cards</span>
			</ToggleButton>
			<ToggleButton value="table" aria-label="Table">
				<IconSymbol name="view_list" size={18} />
				<span className="view-label">Table</span>
			</ToggleButton>
		</ToggleButtonGroup>
	);
}
