import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { formatMoney } from "#/lib/format";
import { accountIdentity } from "#/lib/accounts";
import { ACCOUNT_GROUP_LABELS, type AccountRef } from "#/types/api";

/** An account to pick: `balance` is there for the live ones (an archived one kept for editing has none). */
export type AccountChoice = AccountRef & { balance?: string };

const filter = createFilterOptions<AccountChoice>({
	stringify: (a) =>
		[a.name, ACCOUNT_GROUP_LABELS[a.group], a.currency, accountIdentity(a)]
			.filter(Boolean)
			.join(" "),
});

/** A type-to-search account picker; each option shows its balance. "" means none. */
export default function AccountPicker({
	accounts,
	exclude,
	value,
	onChange,
	label,
	required,
	error,
	helperText,
}: {
	accounts: AccountChoice[];
	/** An account to leave out (the other side of a transfer). */
	exclude?: string;
	value: string;
	onChange: (id: string) => void;
	label: string;
	required?: boolean;
	error?: boolean;
	helperText?: string;
}) {
	const options = accounts.filter((a) => a.id !== exclude);
	const picked = options.find((a) => a.id === value) ?? null;
	return (
		<Autocomplete
			options={options}
			value={picked}
			onChange={(_, a) => onChange(a?.id ?? "")}
			getOptionLabel={(a) => a.name}
			isOptionEqualToValue={(a, b) => a.id === b.id}
			filterOptions={filter}
			disableClearable={required}
			noOptionsText="No matching account"
			renderOption={({ key, ...props }, a) => (
				<Box
					component="li"
					key={key}
					{...props}
					sx={{ display: "flex", gap: 2, alignItems: "center" }}
				>
					<Box sx={{ minWidth: 0, flex: 1 }}>
						<Typography noWrap>{a.name}</Typography>
						<Typography variant="caption" color="text.secondary" noWrap component="div">
							{[ACCOUNT_GROUP_LABELS[a.group], a.currency, accountIdentity(a)]
								.filter(Boolean)
								.join(" · ")}
						</Typography>
					</Box>
					{a.balance !== undefined && (
						<Typography
							variant="body2"
							color="text.secondary"
							sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0, ml: "auto" }}
						>
							{formatMoney(a.balance, a.currency)}
						</Typography>
					)}
				</Box>
			)}
			renderInput={(params) => (
				<TextField
					{...params}
					slotProps={{
						...params.slotProps,
						input: {
							...params.slotProps.input,
							// the balance of the chosen account, left of the clear and arrow buttons
							endAdornment: (
								<>
									{picked?.balance !== undefined && (
										<Typography
											variant="body2"
											color="text.secondary"
											sx={{ fontVariantNumeric: "tabular-nums", mr: 0.5 }}
										>
											{formatMoney(picked.balance, picked.currency)}
										</Typography>
									)}
									{params.slotProps.input.endAdornment}
								</>
							),
						},
					}}
					label={label}
					required={required}
					error={error}
					helperText={helperText}
				/>
			)}
		/>
	);
}
