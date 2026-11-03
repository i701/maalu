import { ACCENT } from "#/lib/m3";
import type { NotificationKind } from "#/types/api";

const ERROR = "var(--md-sys-color-error)";

/** How each kind is labelled and tinted. */
export const KIND_META: Record<NotificationKind, { label: string; accent: string }> = {
	payment_due: { label: "Payment due", accent: ACCENT.blue },
	payment_overdue: { label: "Overdue", accent: ERROR },
	installments_done: { label: "Plan finished", accent: ACCENT.green },
	budget_warning: { label: "Budget", accent: ACCENT.amber },
	budget_over: { label: "Over budget", accent: ERROR },
	goal_reached: { label: "Goal", accent: ACCENT.green },
};

/** "9+" past nine, so the badge stays small. */
export const badgeText = (count: number) => (count > 9 ? "9+" : String(count));
