import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { setCategoryKindsFn } from "#/server/categories";
import {
	CATEGORY_KIND_LABELS,
	CATEGORY_KINDS,
	type Category,
	type CategoryKind,
} from "#/types/api";
import CategoryDot from "./CategoryDot";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";

type Choice = CategoryKind | "none";

const choiceOf = (c: Category): Choice => c.kind ?? "none";

/** Every category with a Need / Want / Not sorted switch, to sort many at once instead of opening
 * each one. Only what changed is sent. */
export default function SortKindsDialog({
	categories,
	onClose,
}: {
	categories: Category[];
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const [choices, setChoices] = useState<Record<string, Choice>>(() =>
		Object.fromEntries(categories.map((c) => [c.id, choiceOf(c)])),
	);
	const [onlyUnsorted, setOnlyUnsorted] = useState(false);

	const changed = useMemo(
		() => categories.filter((c) => choices[c.id] !== choiceOf(c)),
		[categories, choices],
	);
	// "Unsorted" is judged on what was opened, so a row doesn't vanish the moment it is set.
	const shown = onlyUnsorted ? categories.filter((c) => c.effective_kind == null) : categories;

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const groups = [...CATEGORY_KINDS, "none" as const].map((choice) => ({
			kind: choice === "none" ? null : choice,
			ids: changed.filter((c) => choices[c.id] === choice).map((c) => c.id),
		}));
		const ok = await run(async () => {
			let last: Awaited<ReturnType<typeof setCategoryKindsFn>> | null = null;
			for (const { kind, ids } of groups) {
				if (ids.length === 0) continue;
				last = await setCategoryKindsFn({ data: { ids, kind } });
				if (!last.ok) return last;
			}
			return last ?? { ok: true as const, data: { updated: 0 } };
		});
		if (ok) {
			notify(changed.length === 1 ? "1 category sorted" : `${changed.length} categories sorted`);
			sheet.close();
		}
	}

	return (
		<FormDialog
			title="Needs and wants"
			error={error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
			submitLabel={changed.length > 0 ? `Save ${changed.length}` : "Save"}
			submitDisabled={changed.length === 0}
		>
			<Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
				Mark what you can't do without as a need and the rest as a want. A sub-category you leave
				unset takes its parent's.
			</Typography>
			<FormControlLabel
				control={
					<Switch checked={onlyUnsorted} onChange={(e) => setOnlyUnsorted(e.target.checked)} />
				}
				label="Only the ones not sorted yet"
				sx={{ mb: 1 }}
			/>
			<Box sx={{ display: "grid", gap: 0.5 }}>
				{shown.map((c) => (
					<Box
						key={c.id}
						sx={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: 1,
							pl: c.parent_id ? 3 : 0,
							py: 0.5,
						}}
					>
						<Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
							<CategoryDot color={c.color} />
							<Typography noWrap variant="body2" sx={{ fontWeight: 500 }}>
								{c.name}
							</Typography>
						</Box>
						<ToggleButtonGroup
							exclusive
							size="small"
							value={choices[c.id]}
							onChange={(_, next: Choice | null) =>
								next && setChoices((prev) => ({ ...prev, [c.id]: next }))
							}
							aria-label={`${c.name}: need or want`}
						>
							{CATEGORY_KINDS.map((k) => (
								<ToggleButton key={k} value={k} sx={{ px: 1.5, py: 0.25 }}>
									{CATEGORY_KIND_LABELS[k]}
								</ToggleButton>
							))}
							<ToggleButton value="none" sx={{ px: 1.5, py: 0.25 }}>
								Not set
							</ToggleButton>
						</ToggleButtonGroup>
					</Box>
				))}
				{shown.length === 0 && (
					<Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
						Everything is sorted.
					</Typography>
				)}
			</Box>
		</FormDialog>
	);
}
