import Autocomplete from "@mui/material/Autocomplete";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { tagAccent } from "#/lib/tags";
import type { Tag } from "#/types/api";

export type TagMatch = "any" | "all";

/** Filter by one or more tags. With two or more, a switch says whether a transaction needs every
 * one of them or just one. Tags are few, so the list is local and needs no server search. */
export default function TagFilter({
	tags,
	selectedIds,
	match,
	onChange,
}: {
	tags: Tag[];
	selectedIds: string[];
	match: TagMatch;
	onChange: (ids: string[], match: TagMatch) => void;
}) {
	const selected = selectedIds
		.map((id) => tags.find((t) => t.id === id))
		.filter((t): t is Tag => t !== undefined);

	return (
		<>
			<Autocomplete
				multiple
				size="small"
				options={tags}
				value={selected}
				filterSelectedOptions
				getOptionLabel={(t) => t.name}
				isOptionEqualToValue={(a, b) => a.id === b.id}
				noOptionsText="No tags"
				onChange={(_, next) =>
					onChange(
						next.map((t) => t.id),
						match,
					)
				}
				renderValue={(values, getItemProps) =>
					values.map((t, index) => {
						const { key, ...itemProps } = getItemProps({ index });
						const accent = tagAccent(t.color);
						return (
							<Chip
								key={key}
								{...itemProps}
								size="small"
								label={t.name}
								sx={{
									bgcolor: `color-mix(in oklab, ${accent} 20%, var(--md-sys-color-surface-container-low))`,
									color: `color-mix(in oklab, ${accent} 70%, var(--md-sys-color-on-surface))`,
								}}
							/>
						);
					})
				}
				renderInput={(params) => (
					<TextField {...params} label="Tags" placeholder={selected.length ? "" : "Search tags"} />
				)}
			/>
			{selected.length > 1 && (
				<FormControlLabel
					sx={{ mt: 0.5 }}
					control={
						<Switch
							size="small"
							checked={match === "all"}
							onChange={(_, on) =>
								onChange(
									selected.map((t) => t.id),
									on ? "all" : "any",
								)
							}
						/>
					}
					label="Must have all of them"
				/>
			)}
		</>
	);
}
