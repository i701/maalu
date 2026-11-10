import Tooltip from "@mui/material/Tooltip";
import type { ReactNode } from "react";
import { formatMoney, formatMoneyCompact, formatMoneyFull } from "#/lib/format";

/** Hover on a mouse, a tap on a phone (no long-press wait): what a short figure stands for. */
export function FullAmountTip({ full, children }: { full: string; children: ReactNode }) {
	return (
		<Tooltip title={full} arrow enterTouchDelay={0} leaveTouchDelay={3000}>
			<span tabIndex={0} style={{ cursor: "help" }}>
				{children}
			</span>
		</Tooltip>
	);
}

/**
 * An amount as the person has chosen to see it, with the exact figure a hover or a tap away
 * whenever it is shown in a short form (1.2K, 513.58M): in a tight place that always shortens
 * (`compact`), or anywhere with the "short numbers" setting on. A figure shown in full is plain
 * text, with nothing around it, so this changes nothing where nothing is shortened.
 */
export default function Money({
	amount,
	currency,
	compact = false,
}: {
	amount: string;
	currency: string;
	/** A tight place: shorten from ten thousand up even with the setting off. */
	compact?: boolean;
}) {
	const full = formatMoneyFull(amount, currency);
	const text = compact ? formatMoneyCompact(amount, currency) : formatMoney(amount, currency);
	if (text === full) return <>{text}</>;
	return <FullAmountTip full={full}>{text}</FullAmountTip>;
}
