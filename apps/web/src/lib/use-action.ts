import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import type { ApiResult } from "#/types/api";

type ZodIssueLike = {
	path?: (string | number)[];
	message?: string;
};

function isZodIssueLike(value: Record<string, unknown>): value is ZodIssueLike {
	if (typeof value !== "object" || value === null) return false;
	const { path, message } = value;

	const hasValidMessage = message === undefined || typeof message === "string";
	const hasValidPath =
		path === undefined ||
		(Array.isArray(path) &&
			path.every((item) => typeof item === "string" || typeof item === "number"));

	return hasValidMessage && hasValidPath;
}

/** Server functions reject bad input with a ZodError whose message is a JSON list of issues.
 * Turn that into "amount: Amount must be greater than 0" instead of showing raw JSON. */
export function friendlyError(error: unknown): string {
	if (!(error instanceof Error)) return "Something went wrong";
	if (error.message.trimStart().startsWith("[")) {
		try {
			const parsed: unknown = JSON.parse(error.message);
			if (Array.isArray(parsed)) {
				const lines = parsed
					.filter(isZodIssueLike)
					.filter((i): i is ZodIssueLike & { message: string } => typeof i.message === "string")
					.map((i) => (i.path?.length ? `${i.path.join(".")}: ${i.message}` : i.message));
				if (lines.length) return lines.join("; ");
			}
		} catch {
			// not JSON after all: fall through to the plain message
		}
	}
	return error.message;
}

/**
 * Runs a server-function mutation with pending/error state. On success it invalidates all route
 * data and waits for the current page to refresh; on 401 it clears caches and goes to /login.
 */
export function useAction() {
	const router = useRouter();
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function run<T>(call: () => Promise<ApiResult<T>>): Promise<boolean> {
		setPending(true);
		setError(null);
		try {
			const res = await call();
			if (!res.ok) {
				if (res.status === 401) {
					router.clearCache(); // session is gone: drop any cached page data
					await router.navigate({ to: "/login" });
				} else setError(res.error);
				return false;
			}
			// Mark every cached route stale (e.g. a renamed vendor also changes the Transactions
			// page) and wait until the current page has its fresh data.
			await router.invalidate({ sync: true });
			return true;
		} catch (e) {
			// Server-function input validation failures arrive as thrown errors.
			setError(friendlyError(e));
			return false;
		} finally {
			setPending(false);
		}
	}

	return { run, pending, error, setError };
}
