import { useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";
import type { z } from "zod";

/**
 * The route's search params as soon as the URL changes. `Route.useSearch()` only updates once the
 * loader has finished, so controls bound to it (radios, chips, the search box) feel frozen for the
 * length of the request. Bind controls to this instead and keep `Route.useSearch()` for anything
 * that must match the data on screen.
 */
export function useLiveSearch<T extends z.ZodType>(schema: T): z.output<T> {
	const raw = useRouterState({ select: (s) => s.location.search });
	return useMemo(() => schema.parse(raw), [schema, raw]);
}

/** True from the moment a navigation starts until its data has loaded (not for plain refreshes). */
export function useNavigationPending(): boolean {
	return useRouterState({ select: (s) => s.location.href !== s.resolvedLocation?.href });
}
