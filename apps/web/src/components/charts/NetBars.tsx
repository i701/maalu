import Box from "@mui/material/Box";
import { useState } from "react";
import { compact, niceTicks } from "#/lib/charts";
import ChartTooltip from "./ChartTooltip";

export type NetGroup = {
	label: string;
	title: string;
	/** What was kept: positive above the zero line, negative below it */
	value: number;
	income: number;
	expense: number;
};

/**
 * One bar per month from a zero line: up for money kept, down for money overspent, on the same
 * scale. Bars are at most 24px wide with a 4px rounded end away from the zero line, over hairline
 * grid lines. A month is the hover and focus target; its readout also gives what came in and went
 * out.
 */
export default function NetBars({
	groups,
	formatValue,
	keptColor,
	overColor,
	ariaLabel,
	height = 150,
}: {
	groups: NetGroup[];
	formatValue: (value: number) => string;
	keptColor: string;
	overColor: string;
	ariaLabel: string;
	height?: number;
}) {
	const [active, setActive] = useState<number | null>(null);
	const values = groups.map((g) => g.value);
	const ticks = niceTicks(Math.min(0, ...values), Math.max(0, ...values), 2);
	const bottom = ticks[0];
	const top = ticks[ticks.length - 1];
	const span = top - bottom || 1;
	const fromTop = (v: number) => ((top - v) / span) * 100; // % from the top of the plot
	const n = groups.length;

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
							top: `${fromTop(t)}%`,
							height: "1px",
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
					{groups.map((g, i) => {
						const up = g.value >= 0;
						const dim = active !== null && active !== i;
						return (
							<Box
								key={g.title}
								tabIndex={0}
								role="img"
								aria-label={`${g.title}: ${up ? "kept" : "overspent"} ${formatValue(Math.abs(g.value))}`}
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
										width: "min(24px, 60%)",
										transform: "translateX(-50%)",
										top: `${up ? fromTop(g.value) : fromTop(0)}%`,
										height: `${(Math.abs(g.value) / span) * 100}%`,
										minHeight: g.value === 0 ? 0 : 2,
										bgcolor: up ? keptColor : overColor,
										opacity: dim ? 0.55 : 1,
										borderRadius: up ? "4px 4px 0 0" : "0 0 4px 4px",
										transition: "opacity var(--spring-effects-fast-dur) var(--spring-effects-fast)",
									}}
								/>
								{active === i && (
									<Box
										sx={{
											position: "absolute",
											top: `calc(${fromTop(Math.max(g.value, 0))}% - 8px)`,
											left: "50%",
											transform: `translate(${i < 1 ? "-20%" : i > n - 2 ? "-80%" : "-50%"}, -100%)`,
											zIndex: 1,
										}}
									>
										<ChartTooltip
											title={g.title}
											rows={[
												{
													label: up ? "kept" : "overspent",
													value: formatValue(Math.abs(g.value)),
													color: up ? keptColor : overColor,
												},
												{ label: "in", value: formatValue(g.income), color: "var(--chart-income)" },
												{
													label: "out",
													value: formatValue(g.expense),
													color: "var(--chart-expense)",
												},
											]}
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
										fontSize: 11,
										color: "text.secondary",
									}}
								>
									{g.label}
								</Box>
							</Box>
						);
					})}
				</Box>
			</Box>
		</Box>
	);
}
