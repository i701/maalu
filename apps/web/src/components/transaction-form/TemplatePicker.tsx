import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import FilterChip from "#/components/FilterChip";
import type { TransactionTemplate } from "#/types/api";

/** "Start from a template": a row of chips, one per template; picking one refills the form from it
 * and the chip stays marked as the one the form started from (`picked`, kept by the form, which
 * remounts its fields when it refills). The row scrolls sideways rather than taking several lines
 * when there are many. */
export default function TemplatePicker({
	templates,
	picked,
	onPick,
}: {
	templates: TransactionTemplate[];
	picked: string | null;
	onPick: (template: TransactionTemplate) => void;
}) {
	return (
		<Box>
			<Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.75 }}>
				Start from a template
			</Typography>
			<Box sx={{ display: "flex", gap: 1, overflowX: "auto", pb: 0.5, scrollbarWidth: "thin" }}>
				{templates.map((t) => (
					<Box key={t.id} sx={{ flexShrink: 0 }}>
						<FilterChip label={t.name} selected={picked === t.id} onClick={() => onPick(t)} />
					</Box>
				))}
			</Box>
		</Box>
	);
}
