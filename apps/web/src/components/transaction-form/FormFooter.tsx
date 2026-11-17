import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";

/** Under the fields: "Add another" (keep the form open after saving a new transaction) and
 * "Save as template". */
export default function FormFooter({
	another,
	onAnotherChange,
	onSaveTemplate,
}: {
	/** undefined when editing: there is no "add another" then. */
	another: boolean | undefined;
	onAnotherChange: (on: boolean) => void;
	onSaveTemplate: () => void;
}) {
	return (
		<Stack
			direction="row"
			sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}
		>
			{another === undefined ? (
				<span />
			) : (
				<FormControlLabel
					control={<Switch checked={another} onChange={(_, v) => onAnotherChange(v)} />}
					label="Add another"
				/>
			)}
			<Button color="inherit" size="small" onClick={onSaveTemplate}>
				Save as template
			</Button>
		</Stack>
	);
}
