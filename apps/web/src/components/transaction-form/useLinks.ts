import { useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MAX_LINKS, parseUrl } from "#/lib/links";
import { addLinkFn, deleteLinkFn, listLinksFn } from "#/server/attachments";
import type { TransactionLink } from "#/types/api";

/** A link waiting for its transaction to be saved; the key is only for rendering the list. */
export type PendingLink = { key: string; url: string; title: string };

/** Add the links one after the other (so they keep their order). Resolves to the failures. */
function addAll(transactionId: string, links: PendingLink[]): Promise<string[]> {
	return links.reduce<Promise<string[]>>(
		(chain, link) =>
			chain.then(async (failures) => {
				const res = await addLinkFn({
					data: { transaction_id: transactionId, url: link.url, title: link.title || null },
				});
				return res.ok ? failures : [...failures, res.error];
			}),
		Promise.resolve([]),
	);
}

/**
 * The web links of the transaction in the form. Like the files: on a saved transaction they are
 * added and removed at once, on a new one they wait in `pending` until it has an id.
 */
export function useLinks(transactionId: string | undefined) {
	const router = useRouter();
	const [saved, setSaved] = useState<TransactionLink[]>([]);
	const [pending, setPending] = useState<PendingLink[]>([]);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!transactionId) return;
		let current = true;
		void listLinksFn({ data: { transaction_id: transactionId } }).then((res) => {
			if (current && res.ok) setSaved(res.data);
		});
		return () => {
			current = false;
		};
	}, [transactionId]);

	async function refresh(id: string) {
		const res = await listLinksFn({ data: { transaction_id: id } });
		if (res.ok) setSaved(res.data);
		await router.invalidate(); // the list's paperclip count
	}

	/** Resolves to true when the link was taken, so the form can clear its fields. */
	async function add(address: string, title: string): Promise<boolean> {
		const parsed = parseUrl(address);
		if ("error" in parsed) {
			setError(parsed.error);
			return false;
		}
		if (saved.length + pending.length >= MAX_LINKS) {
			setError(`A transaction can have at most ${MAX_LINKS} links`);
			return false;
		}
		setError(null);
		if (!transactionId) {
			setPending((p) => [...p, { key: crypto.randomUUID(), url: parsed.url, title: title.trim() }]);
			return true;
		}
		setBusy(true);
		try {
			const res = await addLinkFn({
				data: { transaction_id: transactionId, url: parsed.url, title: title.trim() || null },
			});
			if (!res.ok) {
				setError(res.error);
				return false;
			}
			await refresh(transactionId);
			return true;
		} finally {
			setBusy(false);
		}
	}

	async function remove(id: string) {
		if (!transactionId) return;
		setBusy(true);
		try {
			const res = await deleteLinkFn({ data: { id } });
			setError(res.ok ? null : res.error);
			await refresh(transactionId);
		} finally {
			setBusy(false);
		}
	}

	/** After a new transaction is saved: add what was waiting. Resolves to a message about any
	 * that failed, or null. */
	async function savePending(id: string): Promise<string | null> {
		const links = pending;
		setPending([]);
		const failures = await addAll(id, links);
		// the list was loaded before these were added: refresh it for the paperclip
		if (links.length > failures.length) await router.invalidate();
		if (failures.length === 0) return null;
		return failures.length === links.length
			? failures[0]
			: `${links.length - failures.length} of ${links.length} links added. ${failures[0]}`;
	}

	return {
		saved,
		pending,
		busy,
		error,
		add,
		remove,
		removePending: (key: string) => setPending((p) => p.filter((l) => l.key !== key)),
		savePending,
	};
}

export type LinksState = ReturnType<typeof useLinks>;
