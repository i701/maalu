import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import type { TransactionTemplate } from "#/types/api";

/** "Start from a template": choosing one refills the form from it. */
export default function TemplatePicker({
	templates,
	onPick,
}: {
	templates: TransactionTemplate[];
	onPick: (template: TransactionTemplate) => void;
}) {
	return (
		<Autocomplete
			options={templates}
			value={null}
			blurOnSelect
			onChange={(_, t) => t && onPick(t)}
			getOptionLabel={(t) => t.name}
			renderInput={(params) => (
				<TextField {...params} label="Start from a template" placeholder="Optional" />
			)}
		/>
	);
}
