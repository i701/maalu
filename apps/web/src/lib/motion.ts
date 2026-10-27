import useMediaQuery from "@mui/material/useMediaQuery";
import { useState } from "react";

/** The one easing curve for UI motion: fast start, gentle landing. Also set as the theme's
 * `easeOut`, so MUI components that use theme easing pick it up too. */
export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

/**
 * Material 3 Expressive springs as `<duration> <easing>` shorthand, from the tokens in
 * styles/m3.css (Compose: ExpressiveMotionTokens). Spatial springs move things (position, size,
 * corners) and overshoot a little; effects springs fade and recolour and never overshoot. Use
 * `fast` for small components, the default for partial-screen changes, `slow` for full-screen ones.
 */
export const SPRING = {
	spatial: "var(--spring-spatial-default-dur) var(--spring-spatial-default)",
	spatialFast: "var(--spring-spatial-fast-dur) var(--spring-spatial-fast)",
	spatialSlow: "var(--spring-spatial-slow-dur) var(--spring-spatial-slow)",
	effects: "var(--spring-effects-default-dur) var(--spring-effects-default)",
	effectsFast: "var(--spring-effects-fast-dur) var(--spring-effects-fast)",
} as const;

/** The default effects spring's length in ms, for delaying `visibility` until a fade has finished. */
export const EFFECTS_MS = 280;

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

/**
 * `sx` that makes the direct children of a list rise in one after another (the `rise-in`
 * keyframes in styles/m3.css). The delays are generated as nth-child rules, so it is pure CSS with
 * no per-item props, and later items past `max` share the last delay so a long page never waits.
 * Plays when children mount; reduced motion gets a plain short fade.
 */
export function staggerChildren(max = 10, step = 35) {
	const rules: Record<string, object> = {};
	for (let i = 1; i <= max; i++) {
		rules[`& > *:nth-child(${i})`] = { animationDelay: `${(i - 1) * step}ms` };
	}
	rules[`& > *:nth-child(n + ${max + 1})`] = { animationDelay: `${(max - 1) * step}ms` };
	return {
		"& > *": {
			animation: `rise-in ${SPRING.spatial} both, rise-in-fade ${SPRING.effects} both`,
		},
		...rules,
		"@media (prefers-reduced-motion: reduce)": {
			"& > *": { animation: "rise-in-fade 150ms linear both" },
			"& > *:nth-child(n)": { animationDelay: "0ms" },
		},
	} as const;
}
