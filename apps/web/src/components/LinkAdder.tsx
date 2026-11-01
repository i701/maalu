import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useState } from "react";

/**
 * The small "address and name" entry for a web link. It sits inside the transaction form, so it
 * is not a form of its own: Enter adds the link and is kept from submitting the transaction.
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
	const [url, setUrl] = useState("");
	const [title, setTitle] = useState("");

	async function add() {
		if (await onAdd(url, title)) {
			setUrl("");
			setTitle("");
			onClose();
		}
	}

	function onEnter(e: React.KeyboardEvent) {
		if (e.key !== "Enter") return;
		e.preventDefault();
		void add();
	}

	return (
		<Box sx={{ display: "grid", gap: 1 }}>
			<TextField
				label="Web address"
				placeholder="https://shop.example.com/orders/123"
				value={url}
				onChange={(e) => setUrl(e.target.value)}
				onKeyDown={onEnter}
				size="small"
				autoFocus
				slotProps={{ htmlInput: { maxLength: 2000, inputMode: "url" } }}
			/>
			<TextField
				label="Name (optional)"
				placeholder="Order confirmation"
				value={title}
				onChange={(e) => setTitle(e.target.value)}
				onKeyDown={onEnter}
				size="small"
				slotProps={{ htmlInput: { maxLength: 200 } }}
			/>
			<Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
				<Button size="small" color="inherit" onClick={onClose}>
					Cancel
				</Button>
				<Button size="small" variant="contained" loading={busy} onClick={() => void add()}>
					Add
				</Button>
			</Box>
		</Box>
	);
}
