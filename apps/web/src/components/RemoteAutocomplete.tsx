import Autocomplete from "@mui/material/Autocomplete";
import LoadingIndicator from "./LoadingIndicator";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";

export type RemoteOption = {
	id: string;
	label: string;
	/** Smaller second line, e.g. "Savings · MVR". */
	hint?: string;
};

const DEBOUNCE_MS = 250;

/**
 * Autocomplete whose options come from the server, so it stays fast with thousands of records:
 * nothing is filtered in the browser, each (debounced) keystroke asks the API.
 *
 * `selected` is the current value, resolved by the parent (e.g. loaded with the page), so the
 * label shows immediately without fetching the whole list. Options load when the list opens.
 */
export default function RemoteAutocomplete({
	label,
	selected,
	onChange,
	search,
	placeholder,
}: {
	label: string;
	selected: RemoteOption | null;
	onChange: (option: RemoteOption | null) => void;
	/** Fetch the options matching `query` ("" = the first few). */
	search: (query: string) => Promise<RemoteOption[]>;
	placeholder?: string;
}) {
	// Show the pick immediately; the parent's `selected` catches up once the page reloads.
	const [value, setValue] = useState<RemoteOption | null>(selected);
	const [seen, setSeen] = useState(selected?.id);
	if (selected?.id !== seen) {
		setSeen(selected?.id);
		setValue(selected);
	}

	const [open, setOpen] = useState(false);
	const [input, setInput] = useState("");
	const [options, setOptions] = useState<RemoteOption[]>([]);
	const [loading, setLoading] = useState(false);
	const inFlight = useRef(0); // requests running, so a stale one finishing never hides the spinner

	// When the box just shows the chosen label, list everything rather than only that one match.
	const query = value && input === value.label ? "" : input;

	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		const timer = setTimeout(
			async () => {
				inFlight.current += 1;
				setLoading(true);
				try {
					const found = await search(query);
					if (!cancelled) setOptions(found);
				} catch {
					if (!cancelled) setOptions([]);
				} finally {
					inFlight.current -= 1;
					setLoading(inFlight.current > 0);
				}
			},
			query ? DEBOUNCE_MS : 0,
		);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [open, query, search]);

	return (
		<Autocomplete
			size="small"
			value={value}
			options={value && !options.some((o) => o.id === value.id) ? [value, ...options] : options}
			open={open}
			onOpen={() => setOpen(true)}
			onClose={() => setOpen(false)}
			onChange={(_, option) => {
				setValue(option);
				onChange(option);
			}}
			inputValue={input}
			onInputChange={(_, text, reason) => {
				// "reset" fires when the value changes; keep the box in step with it.
				setInput(reason === "reset" ? (value?.label ?? text) : text);
			}}
			filterOptions={(all) => all} // the server did the filtering
			getOptionLabel={(o) => o.label}
			isOptionEqualToValue={(a, b) => a.id === b.id}
			loading={open && loading}
			loadingText="Searching…"
			noOptionsText={query ? "No matches" : "Nothing yet"}
			renderOption={({ key, ...props }, option) => (
				<li key={key} {...props}>
					<div>
						<Typography variant="body2">{option.label}</Typography>
						{option.hint && (
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
								{option.hint}
							</Typography>
						)}
					</div>
				</li>
			)}
			renderInput={(params) => (
				<TextField
					{...params}
					label={label}
					placeholder={placeholder}
					slotProps={{
						...params.slotProps,
						input: {
							...params.slotProps.input,
							endAdornment: (
								<>
									{open && loading && <LoadingIndicator size={20} />}
									{params.slotProps.input.endAdornment}
								</>
							),
						},
					}}
				/>
			)}
		/>
	);
}
