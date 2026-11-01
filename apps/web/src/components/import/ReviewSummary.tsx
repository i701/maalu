import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { balanceNote, plural, type Counts } from "#/lib/imports";
import type { ImportPreview } from "#/types/api";

/** What the import will do, whether the balance agrees with the statement, and any error. */
export default function ReviewSummary({
	preview,
	filename,
	counts,
	error,
}: {
	preview: ImportPreview;
	filename: string;
	counts: Counts;
	error: string | null;
}) {
	const note = balanceNote(preview);
	return (
		<Stack sx={{ gap: 2, mb: 2 }}>
			<Typography variant="body2" sx={{ color: "text.secondary" }}>
				{filename} · {preview.account.name} · {plural(preview.rows.length, "row")}
			</Typography>
			<Alert severity="info">
				{plural(counts.toImport, "row")} will be imported
				{counts.alreadyThere > 0 && `, ${counts.alreadyThere} already imported`}
				{counts.leftOut > 0 && `, ${counts.leftOut} left out`}.
				{counts.uncategorised > 0 &&
					` ${plural(counts.uncategorised, "row")} will go in "Uncategorized" until you give them a category.`}
			</Alert>
			{note && <Alert severity={preview.balance_matches ? "success" : "warning"}>{note}</Alert>}
			{error && <Alert severity="error">{error}</Alert>}
		</Stack>
	);
}
