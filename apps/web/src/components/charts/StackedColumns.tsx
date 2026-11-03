import Box from "@mui/material/Box";
import { useState } from "react";
import { compact, niceTicks } from "#/lib/charts";
import ChartTooltip from "./ChartTooltip";

export type StackColumnSeries = { name: string; color: string; values: number[] };

/**
 * One column per group (a month), each split into the series' segments, the first series at the
 * bottom. A column is at most 28px wide with a 4px rounded top and a square base on one baseline;
 * segments are kept apart by a 2px gap in the card's colour, over hairline grid lines. A column is
 * the hover and focus target, and its readout lists every segment with the column's total, so the
 * chart never depends on telling two colours apart.
 */
export default function StackedColumns({
	labels,
	titles,
	series,
	formatValue,
	ariaLabel,
	height = 240,
}: {
	labels: string[];
	titles: string[];
	series: StackColumnSeries[];
	formatValue: (value: number) => string;
	ariaLabel: string;
	height?: number;
}) {
	const [active, setActive] = useState<number | null>(null);
	const totals = labels.map((_, i) => series.reduce((sum, s) => sum + s.values[i], 0));
	const ticks = niceTicks(0, Math.max(...totals, 1), 4);
	const top = ticks[ticks.length - 1];
	const pct = (v: number) => (top === 0 ? 0 : (v / top) * 100);
	const n = labels.length;
	// every other label when the columns are narrow, so the months stay readable
	const every = n > 14 ? 2 : 1;

	return (
		<Box sx={{ position: "relative", pl: 5.5, pb: 3 }} role="group" aria-label={ariaLabel}>
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
							height: "1px",
							bgcolor: "var(--md-sys-color-outline-variant)",
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
					{labels.map((label, i) => (
						<Box
							key={titles[i]}
							tabIndex={0}
							role="img"
							aria-label={`${titles[i]}: ${formatValue(totals[i])} in all. ${series
								.filter((s) => s.values[i] > 0)
								.map((s) => `${s.name} ${formatValue(s.values[i])}`)
								.join(", ")}`}
							onPointerEnter={() => setActive(i)}
							onPointerLeave={() => setActive(null)}
							onFocus={() => setActive(i)}
							onBlur={() => setActive(null)}
							sx={{
								position: "relative",
								flex: 1,
								display: "flex",
								alignItems: "flex-end",
								justifyContent: "center",
								outlineOffset: -2,
								borderRadius: "var(--shape-xs)",
							}}
						>
							<Box
								sx={{
									width: "min(28px, 70%)",
									height: `${pct(totals[i])}%`,
									display: "flex",
									flexDirection: "column-reverse",
									opacity: active !== null && active !== i ? 0.55 : 1,
									transition: "opacity var(--spring-effects-fast-dur) var(--spring-effects-fast)",
								}}
							>
								{series.map((s, k) => {
									const share = totals[i] === 0 ? 0 : (s.values[i] / totals[i]) * 100;
									const isTop = series.slice(k + 1).every((later) => later.values[i] === 0);
									return share > 0 ? (
										<Box
											key={s.name}
											sx={{
												height: `${share}%`,
												minHeight: 3,
												bgcolor: s.color,
												// the gap between segments, in the card's own colour
												borderTop: "2px solid var(--md-sys-color-surface-container-low)",
												boxSizing: "border-box",
												borderRadius: isTop ? "4px 4px 0 0" : 0,
											}}
										/>
									) : null;
								})}
							</Box>
							{active === i && totals[i] > 0 && (
								<Box
									sx={{
										position: "absolute",
										bottom: `calc(${pct(totals[i])}% + 8px)`,
										left: "50%",
										transform: `translateX(${i < 2 ? "-20%" : i > n - 3 ? "-80%" : "-50%"})`,
										zIndex: 2,
									}}
								>
									<ChartTooltip
										title={`${titles[i]} · ${formatValue(totals[i])}`}
										rows={series
											.map((s) => ({ label: s.name, value: s.values[i], color: s.color }))
											.filter((r) => r.value > 0)
											.toReversed() // top of the column first, as it reads
											.map((r) => ({ ...r, value: formatValue(r.value) }))}
									/>
								</Box>
							)}
							{i % every === 0 && (
								<Box
									aria-hidden
									sx={{
										position: "absolute",
										top: "100%",
										left: 0,
										right: 0,
										textAlign: "center",
										pt: 0.75,
										fontSize: 11,
										color: "text.secondary",
										whiteSpace: "nowrap",
									}}
								>
									{label}
								</Box>
							)}
						</Box>
					))}
				</Box>
			</Box>
		</Box>
	);
}
