import { ACCENT } from "#/lib/m3";
import type { PaymentMethod, SubscriptionStatus } from "#/types/api";

/** A colour per payment method, so a column of them reads at a glance. */
export const PAYMENT_ACCENT: Record<PaymentMethod, string> = {
	cash: ACCENT.green,
	bank_transfer: ACCENT.blue,
	debit_card: ACCENT.violet,
	credit_card: ACCENT.orange,
	other: ACCENT.slate,
};

export const STATUS_ACCENT: Record<SubscriptionStatus, string> = {
	active: ACCENT.green,
	paused: ACCENT.amber,
	cancelled: ACCENT.slate,
};

export const LOCALITY_ACCENT = { local: ACCENT.green, foreign: ACCENT.orange } as const;
export const TRANSFER_ACCENT = ACCENT.blue;
