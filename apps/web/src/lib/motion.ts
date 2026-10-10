import useMediaQuery from "@mui/material/useMediaQuery";
import { useState } from "react";

/** The one easing curve for UI motion: fast start, gentle landing. Also set as the theme's
 * `easeOut`, so MUI components that use theme easing pick it up too. */
export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

/** Standard durations (ms): keep UI motion under 300. */
export const DURATION = { fade: 150, reveal: 200, rise: 300 } as const;

/** True when the user asks for less motion. We keep short fades but drop movement and size
 * changes: gentler, not zero. */
export function useReducedMotion(): boolean {
	return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/**
 * Returns `value` while it exists and the last non-empty value after it goes away, so content can
 * finish an exit animation instead of vanishing the instant its data becomes null.
 */
export function useLastDefined<T>(value: T | null | undefined): T | null | undefined {
	const [last, setLast] = useState(value);
	// React's "adjust state while rendering" pattern: no effect, no extra paint.
	if (value && value !== last) setLast(value);
	return value ?? last;
}
