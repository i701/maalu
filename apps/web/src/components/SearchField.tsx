import { morph } from "#/lib/shape";
import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { useEffect, useEffectEvent, useState } from "react";

const DEBOUNCE_MS = 300;

/**
 * Search box that reports its (trimmed) text after you pause typing, so every keystroke doesn't
 * trigger a request. `value` is the committed value (e.g. from the URL); changing it from outside,
 * such as "Clear filters", updates the box.
 */
export default function SearchField({
	value,
	onChange,
	placeholder = "Search",
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}) {
	const [text, setText] = useState(value);

	// Follow external changes to `value` (e.g. "Clear filters"), but don't fight the user
	// mid-typing (say a trailing space). This is React's pattern for resetting state when a prop
	// changes: adjust during render rather than in an effect.
	const [seen, setSeen] = useState(value);
	if (value !== seen) {
		setSeen(value);
		if (text.trim() !== value) setText(value);
	}

	// Always the latest onChange, without restarting the debounce when its identity changes.
	const report = useEffectEvent((next: string) => onChange(next));

	useEffect(() => {
		const next = text.trim();
		if (next === value) return;
		const timer = setTimeout(() => report(next), DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [text, value]);

	return (
		<TextField
			variant="filled"
			size="small"
			hiddenLabel
			type="search"
			value={text}
			onChange={(e) => setText(e.target.value)}
			placeholder={placeholder}
			aria-label={placeholder}
			sx={{
				minWidth: { sm: 320 },
				maxWidth: { sm: 440 },
				// The demo's search bar: a 56px pill on the highest container with a soft lift. It
				// has no label, so hiddenLabel stops MUI reserving room for one.
				"& .MuiFilledInput-root": {
					...morph("xl", "md"),
					// the morph's spring, then the field's own colour and shadow easing
					transition:
						"border-radius var(--spring-spatial-fast-dur) var(--spring-spatial-fast), background-color var(--spring-effects-fast-dur) var(--spring-effects-fast), box-shadow var(--spring-effects-fast-dur) var(--spring-effects-fast)",
					minHeight: 56,
					pl: 2.25,
					pr: 1,
					boxShadow: "var(--elev-3)",
					"&.Mui-focused": {
						boxShadow: "var(--elev-2), inset 0 0 0 2px var(--md-sys-color-primary)",
					},
				},
				"& .MuiFilledInput-input": { py: 1.75, fontSize: 16 },
			}}
			slotProps={{
				htmlInput: { maxLength: 100 },
				input: {
					startAdornment: (
						<InputAdornment position="start">
							<SearchIcon />
						</InputAdornment>
					),
					endAdornment: text ? (
						<InputAdornment position="end">
							<IconButton
								size="small"
								aria-label="Clear search"
								edge="end"
								onClick={() => {
									setText("");
									onChange("");
								}}
							>
								<ClearIcon fontSize="small" />
							</IconButton>
						</InputAdornment>
					) : undefined,
				},
			}}
		/>
	);
}
