import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { memo } from "react";
import { PRESET_LABELS, PRESETS, type CustomRanges, type Preset } from "#/lib/compare";

const FIELDS: { key: keyof CustomRanges; label: string }[] = [
	{ key: "nowFrom", label: "Now: from" },
	{ key: "nowTo", label: "Now: to" },
	{ key: "beforeFrom", label: "Before: from" },
	{ key: "beforeTo", label: "Before: to" },
];

/** Which two periods to compare: one of the ready-made pairs, or two ranges typed in. */
const PeriodPicker = memo(function PeriodPicker({
	preset,
	custom,
	onPreset,
	onCustom,
}: {
	preset: Preset;
	custom: Partial<CustomRanges>;
	onPreset: (preset: Preset) => void;
	onCustom: (key: keyof CustomRanges, value: string) => void;
}) {
	return (
		<Stack spacing={1.5} sx={{ mb: 2 }}>
			<ToggleButtonGroup
				exclusive
				size="small"
				value={preset}
				onChange={(_, value: Preset | null) => value && onPreset(value)}
				aria-label="Periods to compare"
				sx={{ flexWrap: "wrap", alignSelf: "flex-start" }}
			>
				{PRESETS.map((p) => (
					<ToggleButton key={p} value={p} sx={{ px: 1.5, py: 0.5 }}>
						{PRESET_LABELS[p]}
					</ToggleButton>
				))}
			</ToggleButtonGroup>
			{preset === "custom" && (
				<Stack direction="row" useFlexGap spacing={1.5} sx={{ flexWrap: "wrap" }}>
					{FIELDS.map(({ key, label }) => (
						<TextField
							key={key}
							size="small"
							type="date"
							label={label}
							value={custom[key] ?? ""}
							onChange={(e) => onCustom(key, e.target.value)}
							slotProps={{ inputLabel: { shrink: true } }}
							sx={{ minWidth: 160 }}
						/>
					))}
				</Stack>
			)}
		</Stack>
	);
});

export default PeriodPicker;
