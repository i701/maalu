/** What can be attached to a transaction: receipt photos and PDFs. The API decides from the file's
 * own bytes; this only saves a pointless upload and says why in plain words. */
export const ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const ATTACHMENT_ACCEPT =
	".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf";
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS = 10;

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Why this file can't be attached, or null when it looks fine. */
export function checkFile(file: { name: string; type: string; size: number }): string | null {
	if (file.size === 0) return `${file.name} is empty`;
	if (file.size > MAX_ATTACHMENT_BYTES)
		return `${file.name} is too large (the limit is ${formatBytes(MAX_ATTACHMENT_BYTES)})`;
	const named = /\.(jpe?g|png|webp|pdf)$/i.test(file.name);
	if (!ATTACHMENT_TYPES.includes(file.type) && !named)
		return `${file.name} is not a JPEG, PNG, WebP or PDF`;
	return null;
}

export const isImage = (mime: string) => mime.startsWith("image/");

export const attachmentUrl = (id: string, download = false) =>
	`/api/attachments/${id}${download ? "?download=true" : ""}`;

/** Upload one file to a saved transaction. Resolves to an error message, or null on success. */
export async function uploadAttachment(transactionId: string, file: File): Promise<string | null> {
	try {
		const params = new URLSearchParams({ transaction_id: transactionId, filename: file.name });
		const res = await fetch(`/api/attachments?${params}`, { method: "POST", body: file });
		if (!res.ok) {
			const body = await res.json().catch(() => null);
			return typeof body?.detail === "string" ? body.detail : `${file.name} could not be attached`;
		}
		return null;
	} catch {
		return `${file.name} could not be attached`;
	}
}

/** Upload files one after the other (so they keep their order). Resolves to the messages of those
 * that failed. */
export function uploadAll(transactionId: string, files: File[]): Promise<string[]> {
	return files.reduce<Promise<string[]>>(
		(chain, file) =>
			chain.then(async (failures) => {
				const why = await uploadAttachment(transactionId, file);
				return why ? [...failures, why] : failures;
			}),
		Promise.resolve([]),
	);
}

/** Delete one attachment. Resolves to an error message, or null on success. */
export async function deleteAttachment(id: string): Promise<string | null> {
	try {
		const res = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
		return res.ok ? null : "The file could not be removed";
	} catch {
		return "The file could not be removed";
	}
}

/** The toast after saving a new transaction whose files were uploaded behind it. */
export function uploadSummary(total: number, errors: string[]): string | null {
	if (errors.length === 0) return null;
	if (errors.length === total) return errors[0];
	return `${total - errors.length} of ${total} files attached. ${errors[0]}`;
}
