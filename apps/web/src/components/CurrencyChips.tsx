import AddIcon from "@mui/icons-material/Add";
import Autocomplete from "@mui/material/Autocomplete";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { currencyName } from "#/lib/currency-name";

/**
 * Currency picker as quick-select chips (the currencies you already use) plus a "+" that opens a
 * search over every currency, like Money Manager's account form.
 */
export default function CurrencyChips({
	label = "Currency",
	value,
	onChange,
	quick,
	currencies,
	disabled,
	helperText,
}: {
	label?: string;
	value: string;
	onChange: (code: string) => void;
	/** Currencies shown as chips, e.g. the base currency and ones already in use. */
	quick: string[];
	/** Every currency, for the "+" search. */
	currencies: string[];
	disabled?: boolean;
	helperText?: string;
}) {
	const [added, setAdded] = useState<string[]>([]);
	const [adding, setAdding] = useState(false);
	// Always show the current value, even if it isn't a "quick" one.
	const chips = [...new Set([...quick, ...added, value].filter(Boolean))];

	return (
		<div>
			<Typography variant="caption" sx={{ color: "text.secondary" }}>
				{label}
			</Typography>
			<Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
				<ToggleButtonGroup
					exclusive
					size="small"
					value={value}
					disabled={disabled}
					onChange={(_, code: string | null) => code && onChange(code)}
					aria-label={label}
					sx={{ flexWrap: "wrap", gap: 1, "& .MuiToggleButtonGroup-grouped": { borderRadius: 1 } }}
				>
					{chips.map((code) => (
						<ToggleButton
							key={code}
							value={code}
							color="primary"
							sx={{ px: 1.5, border: 1, borderColor: "divider", borderRadius: 1 }}
						>
							{code}
						</ToggleButton>
					))}
				</ToggleButtonGroup>
				{!disabled && (
					<ToggleButton
						value="add"
						size="small"
						selected={adding}
						onChange={() => setAdding((a) => !a)}
						aria-label="Add another currency"
						sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}
					>
						<AddIcon fontSize="small" />
					</ToggleButton>
				)}
			</Stack>
			{adding && !disabled && (
				<Autocomplete
					sx={{ mt: 1.5 }}
					size="small"
					autoHighlight
					options={currencies}
					getOptionLabel={(code) => code}
					renderOption={({ key, ...props }, code) => (
						<li key={key} {...props}>
							<Typography component="span" sx={{ fontWeight: 600, mr: 1.5, minWidth: 40 }}>
								{code}
							</Typography>
							<Typography component="span" variant="body2" sx={{ color: "text.secondary" }}>
								{currencyName(code)}
							</Typography>
						</li>
					)}
					filterOptions={(options, { inputValue }) => {
						const q = inputValue.trim().toLowerCase();
						return options.filter(
							(c) => c.toLowerCase().includes(q) || currencyName(c).toLowerCase().includes(q),
						);
					}}
					onChange={(_, code) => {
						if (!code) return;
						setAdded((a) => (a.includes(code) ? a : [...a, code]));
						onChange(code);
						setAdding(false);
					}}
					renderInput={(params) => (
						<TextField {...params} autoFocus placeholder="Search currencies" />
					)}
				/>
			)}
			{helperText && (
				<Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
					{helperText}
				</Typography>
			)}
		</div>
	);
}
