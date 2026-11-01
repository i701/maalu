import { useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
	checkFile,
	deleteAttachment,
	MAX_ATTACHMENTS,
	uploadAll,
	uploadSummary,
} from "#/lib/attachments";
import { listAttachmentsFn } from "#/server/attachments";
import type { Attachment } from "#/types/api";

/** A file waiting for its transaction to be saved; the key is only for rendering the list. */
export type PendingFile = { key: string; file: File };

/**
 * The files of the transaction in the form. On a saved transaction, adding or removing a file
 * happens at once (it is a separate thing from saving the form). On a new one the files wait in
 * `pending` and go up after the transaction is created, since they need its id.
 */
export function useAttachments(transactionId: string | undefined) {
	const router = useRouter();
	const [saved, setSaved] = useState<Attachment[]>([]);
	const [pending, setPending] = useState<PendingFile[]>([]);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!transactionId) return;
		let current = true;
		void listAttachmentsFn({ data: { transaction_id: transactionId } }).then((res) => {
			if (current && res.ok) setSaved(res.data);
		});
		return () => {
			current = false;
		};
	}, [transactionId]);

	async function refresh(id: string) {
		const res = await listAttachmentsFn({ data: { transaction_id: id } });
		if (res.ok) setSaved(res.data);
		await router.invalidate(); // the list's paperclip count
	}

	async function add(files: File[]) {
		const room = MAX_ATTACHMENTS - saved.length - pending.length;
		const problems: string[] = [];
		const ok = files.filter((f) => {
			const why = checkFile(f);
			if (why) problems.push(why);
			return !why;
		});
		if (ok.length > room) problems.push(`A transaction can have at most ${MAX_ATTACHMENTS} files`);
		const take = ok.slice(0, Math.max(room, 0));
		setError(problems[0] ?? null);
		if (take.length === 0) return;
		if (!transactionId) {
			setPending((p) => [...p, ...take.map((file) => ({ key: crypto.randomUUID(), file }))]);
			return;
		}
		setBusy(true);
		try {
			const failures = await uploadAll(transactionId, take);
			await refresh(transactionId);
			if (failures.length) setError(failures[0]);
		} finally {
			setBusy(false);
		}
	}

	async function remove(id: string) {
		if (!transactionId) return;
		setBusy(true);
		try {
			setError(await deleteAttachment(id));
			await refresh(transactionId);
		} finally {
			setBusy(false);
		}
	}

	/** After a new transaction is saved: upload what was waiting. Resolves to a message about any
	 * that failed, or null. */
	async function uploadPending(id: string): Promise<string | null> {
		const files = pending.map((p) => p.file);
		setPending([]);
		const failures = await uploadAll(id, files);
		// the list was loaded before these went up: refresh it for the paperclip
		if (files.length > failures.length) await router.invalidate();
		return uploadSummary(files.length, failures);
	}

	return {
		saved,
		pending,
		busy,
		error,
		add,
		remove,
		removePending: (key: string) => setPending((p) => p.filter((f) => f.key !== key)),
		uploadPending,
	};
}

export type AttachmentsState = ReturnType<typeof useAttachments>;
