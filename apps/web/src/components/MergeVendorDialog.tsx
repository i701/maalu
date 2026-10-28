import { useCallback, useState } from "react";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { mergeVendorFn, searchVendorsFn } from "#/server/vendors";
import type { Vendor } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";
import RemoteAutocomplete, { type RemoteOption } from "./RemoteAutocomplete";

/** Moves everything of one vendor to another, then removes it: the way to fix duplicates such as
 * "Cafe Nero" and "Nero Cafe". Vendors can be many, so the target is searched on the server. */
export default function MergeVendorDialog({
	vendor,
	onClose,
}: {
	vendor: Vendor;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const [target, setTarget] = useState<RemoteOption | null>(null);

	// Stable between renders (the autocomplete re-fetches when this changes); the vendor being
	// merged is left out of the choices.
	const search = useCallback(
		async (q: string): Promise<RemoteOption[]> => {
			const res = await searchVendorsFn({ data: { q } });
			return res.ok
				? res.data
						.filter((v) => v.id !== vendor.id)
						.map((v) => ({ id: v.id, label: v.name, hint: v.currency ?? undefined }))
				: [];
		},
		[vendor.id],
	);

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!target) return;
		if (await run(() => mergeVendorFn({ data: { id: vendor.id, into_id: target.id } }))) {
			notify(`Merged "${vendor.name}" into "${target.label}"`);
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={`Merge "${vendor.name}"`}
			error={error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
			maxWidth="xs"
		>
			<RemoteAutocomplete
				label="Merge into"
				placeholder="Search vendors"
				selected={target}
				search={search}
				onChange={setTarget}
			/>
			<p style={{ margin: "12px 0 0", fontSize: 13, opacity: 0.75 }}>
				Its transactions, subscriptions and templates move there, details the other vendor lacks are
				copied over, then "{vendor.name}" is removed.
			</p>
		</FormDialog>
	);
}
