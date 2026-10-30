import type { ApiResult } from "#/types/api";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { getAppSession, renewSession } from "#/utils/session";

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
	/** An array repeats the key (`tag_id=a&tag_id=b`). */
	query?: Record<string, string | number | string[] | undefined>;
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
	// The browser never reaches the API, so the API only sees this server. Pass on the visitor's
	// address, so the sign-in limits count per person and not for everyone at once.
	const visitor = getRequestIP({ xForwardedFor: true });
	if (visitor) headers["X-Forwarded-For"] = visitor;
	// And their browser, so the list of sign-ins can say "Firefox on Linux".
	const browser = getRequestHeader("user-agent");
	if (browser) headers["User-Agent"] = browser;
	const session = await getAppSession();

	if (opts.token) {
		headers.Authorization = `Bearer ${opts.token}`;
	} else if (!opts.anonymous) {
		const { token } = session.data;
		if (!token) {
			await session.clear();
			return { ok: false, status: 401, error: "Session expired" };
		}
		headers.Authorization = `Bearer ${token}`;
	}

	const url = new URL(`/api/v1${path}`, API_URL());
	for (const [k, v] of Object.entries(opts.query ?? {})) {
		if (Array.isArray(v)) for (const item of v) url.searchParams.append(k, item);
		else if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
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
	if (res.ok && !opts.anonymous && !opts.token) await renewSession(session);
	if (res.status === 204) return { ok: true, data: undefined as T };

	const json = await res.json().catch(() => null);
	if (!res.ok) {
		return {
			ok: false,
			status: res.status,
			error: errorMessage(json, `Request failed (${res.status})`),
		};
	}
	const total = Number(res.headers.get("x-total-count"));
	return {
		ok: true,
		data: json as T,
		...(res.headers.has("x-total-count") && Number.isFinite(total) ? { total } : {}),
	};
}
