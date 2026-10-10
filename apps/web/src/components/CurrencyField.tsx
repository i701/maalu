import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { currencyName } from "#/lib/currency-name";

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
