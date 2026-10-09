import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

const displayNames = (() => {
	try {
		return new Intl.DisplayNames(["en"], { type: "currency" });
	} catch {
		return null;
	}
})();

/** English currency name for a code ("USD" -> "US Dollar"), or "" when unknown. */
export function currencyName(code: string): string {
	try {
		const name = displayNames?.of(code.toUpperCase());
		return name && name !== code.toUpperCase() ? name : "";
	} catch {
		return "";
	}
}

// Match on the code or the name, so "dollar" finds USD, AUD, CAD...
const filterOptions = createFilterOptions<string>({
	stringify: (code) => `${code} ${currencyName(code)}`,
});

export default function CurrencyField({
	name,
	label,
	currencies,
	defaultValue = "",
	required,
	helperText,
	onInputChange,
}: {
	name: string;
	label: string;
	currencies: string[];
	defaultValue?: string;
	required?: boolean;
	helperText?: string;
	onInputChange?: (value: string) => void;
}) {
	return (
		<Autocomplete
			freeSolo
			autoSelect
			options={currencies}
			defaultValue={defaultValue}
			filterOptions={filterOptions}
			onInputChange={(_, value) => onInputChange?.(value)}
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
			renderInput={(params) => (
				<TextField
					{...params}
					label={label}
					name={name}
					required={required}
					helperText={helperText}
					slotProps={{
						...params.slotProps,
						htmlInput: {
							...params.slotProps.htmlInput,
							pattern: "[A-Za-z]{3}",
							title: "3-letter currency code, e.g. USD",
						},
					}}
				/>
			)}
		/>
	);
}
