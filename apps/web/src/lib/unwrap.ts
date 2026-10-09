import { redirect } from "@tanstack/react-router";
import type { ApiResult } from "#/types/api";

/** For route loaders: unwrap an ApiResult, sending expired sessions to /login. */
export function unwrap<T>(res: ApiResult<T>): T {
	if (res.ok) return res.data;
	if (res.status === 401) throw redirect({ to: "/login" });
	throw new Error(res.error);
}
