import { zodResolver } from "@hookform/resolvers/zod";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { parseUrl } from "#/lib/links";
import FormTextField from "./FormTextField";

const schema = z.object({
	url: z.string().superRefine((typed, ctx) => {
		const parsed = parseUrl(typed);
		if ("error" in parsed) ctx.addIssue({ code: "custom", message: parsed.error });
	}),
	title: z.string().trim().max(200),
});

/**
 * The small "address and name" entry for a web link. It sits inside the transaction form, so it
 * is not a form of its own: its button and Enter submit it, and Enter is kept from submitting the
 * transaction.
 */
export default function LinkAdder({
	busy,
	onAdd,
	onClose,
}: {
	busy: boolean;
	/** Resolves to true when the link was taken. */
	onAdd: (url: string, title: string) => Promise<boolean>;
	onClose: () => void;
}) {
	const { control, handleSubmit, reset } = useForm({
		resolver: zodResolver(schema),
		defaultValues: { url: "", title: "" },
	});

	async function add({ url, title }: z.output<typeof schema>) {
		if (await onAdd(url, title)) {
			reset();
			onClose();
		}
	}

	function onEnter(e: React.KeyboardEvent) {
		if (e.key !== "Enter") return;
		e.preventDefault();
		void handleSubmit(add)();
	}

	return (
		<Box sx={{ display: "grid", gap: 1.5, mt: 0.5 }}>
			<FormTextField
				control={control}
				name="url"
				label="Web address"
				placeholder="https://shop.example.com/orders/123"
				onKeyDown={onEnter}
				size="small"
				autoFocus
				slotProps={{ htmlInput: { maxLength: 2000, inputMode: "url" } }}
			/>
			<FormTextField
				control={control}
				name="title"
				label="Name (optional)"
				placeholder="Order confirmation"
				onKeyDown={onEnter}
				size="small"
				slotProps={{ htmlInput: { maxLength: 200 } }}
			/>
			<Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", pb: 1 }}>
				<Button size="small" color="inherit" onClick={onClose}>
					Cancel
				</Button>
				<Button
					size="small"
					variant="contained"
					loading={busy}
					onClick={() => void handleSubmit(add)()}
				>
					Add
				</Button>
			</Box>
		</Box>
	);
}
