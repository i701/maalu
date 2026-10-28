import Autocomplete from "@mui/material/Autocomplete";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import type { Tag } from "#/types/api";
import { tagAccent } from "#/lib/tags";

const MAX_TAGS = 10;
const clean = (s: string) => s.trim().replace(/\s+/g, " ");

/**
 * Several tags on a transaction: pick existing ones or type a new name and press Enter. Like
 * vendors and categories, a new tag is only created when the form is saved.
 *
 * Renders one hidden input named `name` per tag, so the form reads them with `getAll`.
 */
export default function TagsField({
	tags,
	defaultValue = [],
	name = "tags",
}: {
	/** Every existing tag, to pick from */
	tags: Tag[];
	defaultValue?: string[];
	name?: string;
}) {
	const [value, setValue] = useState<string[]>(defaultValue);
	const known = new Map(tags.map((t) => [t.name.toLowerCase(), t]));

	return (
		<>
			<Autocomplete
				multiple
				freeSolo
				autoHighlight
				options={tags.map((t) => t.name)}
				value={value}
				filterSelectedOptions
				onChange={(_, next) => {
					// Keep the first spelling of a name typed twice, and cap the count.
					const seen = new Set<string>();
					const unique = next
						.map((v) => clean(v))
						.filter((v) => v && !seen.has(v.toLowerCase()) && seen.add(v.toLowerCase()));
					setValue(unique.slice(0, MAX_TAGS));
				}}
				renderValue={(values, getItemProps) =>
					values.map((v, index) => {
						const { key, ...itemProps } = getItemProps({ index });
						const accent = tagAccent(known.get(v.toLowerCase())?.color ?? "");
						return (
							<Chip
								key={key}
								{...itemProps}
								size="small"
								label={v}
								sx={{
									bgcolor: `color-mix(in oklab, ${accent} 20%, var(--md-sys-color-surface-container-low))`,
									color: `color-mix(in oklab, ${accent} 70%, var(--md-sys-color-on-surface))`,
								}}
							/>
						);
					})
				}
				renderInput={(params) => (
					<TextField
						{...params}
						label="Tags"
						slotProps={{
							...params.slotProps,
							htmlInput: { ...params.slotProps.htmlInput, maxLength: 50 },
						}}
						helperText={
							value.length >= MAX_TAGS
								? `Up to ${MAX_TAGS} tags`
								: "Optional. Type a tag and press Enter, for example Trip"
						}
					/>
				)}
			/>
			{value.map((v) => (
				<input key={v} type="hidden" name={name} value={v} />
			))}
		</>
	);
}
