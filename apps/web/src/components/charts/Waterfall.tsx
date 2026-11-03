import Box from "@mui/material/Box";
import { useState } from "react";
import { compact, niceTicks } from "#/lib/charts";
import type { Bar } from "#/lib/net-worth";
import ChartTooltip from "./ChartTooltip";

/**
 * A bridge from nothing to a total: each bar floats from where the one before it ended, so the
 * steps add up to the last bar. The zero line is where things stood at the start. Bars that added
 * are in the income colour, bars that took away in the expense colour and the total in the line
 * colour; the arrow-and-sign in each label says the direction as well, so colour is not the only
 * signal. A bar is at most 40px wide with a 4px rounded end. A bar is the hover and focus target.
 */
export default function Waterfall({
	bars,
	formatSigned,
	describe,
	colors,
	ariaLabel,
	height = 240,
}: {
	bars: Bar[];
	/** "+MVR 500.00" or "-MVR 200.00" */
	formatSigned: (value: number) => string;
	/** a sentence on what a bar is, for the readout */
	describe: (bar: Bar) => string;
	colors: { up: string; down: string; total: string };
	ariaLabel: string;
	height?: number;
}) {
	const [active, setActive] = useState<number | null>(null);
	const low = Math.min(0, ...bars.map((b) => b.low));
	const high = Math.max(0, ...bars.map((b) => b.high));
	const ticks = niceTicks(low, high, 4);
	const min = ticks[0];
	const max = ticks[ticks.length - 1];
	const pct = (v: number) => (max === min ? 0 : ((v - min) / (max - min)) * 100);
	const colorOf = (b: Bar) =>
		b.kind === "total" ? colors.total : b.value >= 0 ? colors.up : colors.down;

	return (
		<Box sx={{ position: "relative", pl: 6.5, pb: 6.5, pt: 3 }} role="group" aria-label={ariaLabel}>
			<Box sx={{ position: "relative", height }}>
				{ticks.map((t) => (
					<Box
						key={t}
						aria-hidden
						sx={{
							position: "absolute",
							left: 0,
							right: 0,
							bottom: `${pct(t)}%`,
							height: t === 0 ? "2px" : "1px",
							bgcolor:
								t === 0 ? "var(--md-sys-color-outline)" : "var(--md-sys-color-outline-variant)",
						}}
					>
						<Box
							sx={{
								position: "absolute",
								right: "100%",
								top: "50%",
								transform: "translateY(-50%)",
								pr: 1,
								fontSize: 11,
								color: "text.secondary",
								fontVariantNumeric: "tabular-nums",
							}}
						>
							{compact(t)}
						</Box>
					</Box>
				))}

				<Box sx={{ position: "absolute", inset: 0, display: "flex" }}>
					{bars.map((b, i) => (
						<Box
							key={b.key}
							tabIndex={0}
							role="img"
							aria-label={`${b.label}: ${formatSigned(b.value)}`}
							onPointerEnter={() => setActive(i)}
							onPointerLeave={() => setActive(null)}
							onFocus={() => setActive(i)}
							onBlur={() => setActive(null)}
							sx={{
								position: "relative",
								flex: 1,
								outlineOffset: -2,
								borderRadius: "var(--shape-xs)",
							}}
						>
							<Box
								sx={{
									position: "absolute",
									left: "50%",
									width: "min(40px, 70%)",
									transform: "translateX(-50%)",
									bottom: `${pct(b.low)}%`,
									height: `${pct(b.high) - pct(b.low)}%`,
									minHeight: 3,
									bgcolor: colorOf(b),
									borderRadius: b.value >= 0 ? "4px 4px 0 0" : "0 0 4px 4px",
									opacity: active !== null && active !== i ? 0.55 : 1,
									transition: "opacity var(--spring-effects-fast-dur) var(--spring-effects-fast)",
								}}
							/>
							<Box
								aria-hidden
								sx={{
									position: "absolute",
									left: 0,
									right: 0,
									bottom: `calc(${pct(b.high)}% + 4px)`,
									textAlign: "center",
									fontSize: 12,
									fontWeight: 600,
									fontVariantNumeric: "tabular-nums",
								}}
							>
								{b.value > 0 ? "▲" : b.value < 0 ? "▼" : ""} {compact(b.value)}
							</Box>
							{active === i && (
								<Box
									sx={{
										position: "absolute",
										bottom: `calc(${pct(b.high)}% + 28px)`,
										left: "50%",
										transform: `translateX(${i < 1 ? "-20%" : i > bars.length - 2 ? "-80%" : "-50%"})`,
										zIndex: 2,
									}}
								>
									<ChartTooltip
										title={describe(b)}
										rows={[{ label: b.label, value: formatSigned(b.value), color: colorOf(b) }]}
									/>
								</Box>
							)}
							<Box
								aria-hidden
								sx={{
									position: "absolute",
									top: "100%",
									left: 0,
									right: 0,
									textAlign: "center",
									pt: 0.75,
									px: 0.5,
									fontSize: 11,
									lineHeight: 1.25,
									color: "text.secondary",
								}}
							>
								{b.label}
							</Box>
						</Box>
					))}
				</Box>
			</Box>
		</Box>
	);
}
