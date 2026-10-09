import type { ApiResult } from "#/types/api";
import { useAppSession } from "#/utils/session";

const API_URL = () => process.env.API_URL ?? "http://localhost:8000";

type FastApiError = {
	detail?: string | { loc?: (string | number)[]; msg: string }[];
};

function errorMessage(body: FastApiError | null, fallback: string): string {
	const detail = body?.detail;
	if (typeof detail === "string") return detail;
	if (Array.isArray(detail) && detail.length > 0) {
		return detail
			.map((d) => {
				const field = d.loc?.filter((p) => p !== "body").join(".");
				return field ? `${field}: ${d.msg}` : d.msg;
			})
			.join("; ");
	}
	return fallback;
}

type RequestOptions = {
	method?: "GET" | "POST" | "PATCH" | "DELETE";
	body?: unknown;
	query?: Record<string, string | number | undefined>;
	/** Skip the bearer token (login/register). */
	anonymous?: boolean;
	form?: URLSearchParams;
	/** Use this token instead of the session's (needed right after login). */
	token?: string;
};

/** Call the Maalu API from a server function, attaching the session's bearer token. */
export async function apiRequest<T>(
	path: string,
	opts: RequestOptions = {},
): Promise<ApiResult<T>> {
	const headers: Record<string, string> = {};
	const session = await useAppSession();

	if (opts.token) {
		headers.Authorization = `Bearer ${opts.token}`;
	} else if (!opts.anonymous) {
		const { token, expiresAt } = session.data;
		if (!token || (expiresAt && expiresAt * 1000 <= Date.now())) {
			await session.clear();
			return { ok: false, status: 401, error: "Session expired" };
		}
		headers.Authorization = `Bearer ${token}`;
	}

	const url = new URL(`/api/v1${path}`, API_URL());
	for (const [k, v] of Object.entries(opts.query ?? {})) {
		if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
	}

	let body: BodyInit | undefined;
	if (opts.form) {
		body = opts.form;
	} else if (opts.body !== undefined) {
		headers["Content-Type"] = "application/json";
		body = JSON.stringify(opts.body);
	}

	let res: Response;
	try {
		res = await fetch(url, { method: opts.method ?? "GET", headers, body });
	} catch {
		return { ok: false, status: 503, error: "Cannot reach the Maalu API" };
	}

	if (res.status === 401 && !opts.anonymous) await session.clear();
	if (res.status === 204) return { ok: true, data: undefined as T };

	const json = await res.json().catch(() => null);
	if (!res.ok) {
		return {
			ok: false,
			status: res.status,
			error: errorMessage(json, `Request failed (${res.status})`),
		};
	}
	return { ok: true, data: json as T };
}
