import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import type { ApiResult } from "#/types/api";

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
			setError(e instanceof Error ? e.message : "Something went wrong");
			return false;
		} finally {
			setPending(false);
		}
	}

	return { run, pending, error, setError };
}
