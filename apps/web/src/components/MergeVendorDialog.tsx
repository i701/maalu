import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { mergeVendorFn, searchVendorsFn } from "#/server/vendors";
import type { Vendor } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";
import RemoteAutocomplete, { type RemoteOption } from "./RemoteAutocomplete";

const schema = z.object({
	target: z
		.object({ id: z.string(), label: z.string(), hint: z.string().optional() })
		.nullable()
		.transform((v, ctx) => {
			if (v) return v;
			ctx.addIssue({ code: "custom", message: "Choose the vendor to merge into" });
			return z.NEVER;
		}),
});

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
	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
		resolver: zodResolver(schema),
		defaultValues: { target: null },
	});

	// Stable between renders (the autocomplete re-fetches when this changes); the vendor being
	// merged is left out of the choices.
	const search = useCallback(
		async (q: string): Promise<RemoteOption[]> => {
			const res = await searchVendorsFn({ data: { q } });
			return res.ok
				? res.data
						.filter((v) => v.id !== vendor.id)
						.map((v) => ({
							id: v.id,
							label: v.name,
							hint: v.currency ?? undefined,
						}))
				: [];
		},
		[vendor.id],
	);

	async function submit({ target }: z.output<typeof schema>) {
		if (await run(() => mergeVendorFn({ data: { id: vendor.id, into_id: target.id } }))) {
			notify(`Merged "${vendor.name}" into "${target.label}"`);
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={`Merge "${vendor.name}"`}
			error={errors.target?.message ?? error}
			pending={pending}
			onSubmit={handleSubmit(submit)}
			sheet={sheet}
			maxWidth="xs"
		>
			<Controller
				name="target"
				control={control}
				render={({ field }) => (
					<RemoteAutocomplete
						label="Merge into"
						placeholder="Search vendors"
						selected={field.value}
						search={search}
						onChange={field.onChange}
					/>
				)}
			/>
			<p style={{ margin: "12px 0 0", fontSize: 13, opacity: 0.75 }}>
				Its transactions, subscriptions and templates move there, details the other vendor lacks are
				copied over, then "{vendor.name}" is removed.
			</p>
		</FormDialog>
	);
}
