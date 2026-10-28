import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";

/** Under the fields: "Add another" (keep the form open after saving a new transaction) and
 * "Save as template" (reads the form it sits in). */
export default function FormFooter({
	another,
	onAnotherChange,
	onSaveTemplate,
}: {
	/** undefined when editing: there is no "add another" then. */
	another: boolean | undefined;
	onAnotherChange: (on: boolean) => void;
	onSaveTemplate: (form: FormData) => void;
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
			<Button
				color="inherit"
				size="small"
				onClick={(e) => {
					const form = e.currentTarget.closest("form");
					if (form) onSaveTemplate(new FormData(form));
				}}
			>
				Save as template
			</Button>
		</Stack>
	);
}
