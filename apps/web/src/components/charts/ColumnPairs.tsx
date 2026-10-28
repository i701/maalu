import Box from "@mui/material/Box";
import { useState } from "react";
import { compact, niceTicks } from "#/lib/charts";
import ChartTooltip from "./ChartTooltip";

export type ColumnGroup = { label: string; title: string; a: number; b: number };
export type ColumnSeries = { name: string; color: string };

/**
 * Two series side by side per group (income and expense per month). Bars are at most 24px wide
 * with a 4px rounded top and a square base on one baseline, 2px apart, over hairline grid lines.
 * A group is the hover and focus target, so the readout always shows both series together.
 */
export default function ColumnPairs({
	groups,
	series,
	formatValue,
	ariaLabel,
	height = 200,
}: {
	groups: ColumnGroup[];
	series: [ColumnSeries, ColumnSeries];
	formatValue: (value: number) => string;
	ariaLabel: string;
	height?: number;
}) {
	const [active, setActive] = useState<number | null>(null);
	const ticks = niceTicks(0, Math.max(...groups.flatMap((g) => [g.a, g.b]), 1), 3);
	const top = ticks[ticks.length - 1];
	const pct = (v: number) => (top === 0 ? 0 : (v / top) * 100);
	const n = groups.length;
	const bar = (value: number, color: string, dim: boolean) => (
		<Box
			sx={{
				width: "min(24px, 42%)",
				height: `${pct(value)}%`,
				minHeight: value > 0 ? 2 : 0,
				bgcolor: color,
				opacity: dim ? 0.55 : 1,
				borderRadius: "4px 4px 0 0",
				transition: "opacity var(--spring-effects-fast-dur) var(--spring-effects-fast)",
			}}
		/>
	);

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
					{groups.map((g, i) => (
						<Box
							key={g.title}
							tabIndex={0}
							role="img"
							aria-label={`${g.title}: ${series[0].name} ${formatValue(g.a)}, ${series[1].name} ${formatValue(g.b)}`}
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
								gap: "2px",
								outlineOffset: -2,
								borderRadius: "var(--shape-xs)",
							}}
						>
							{bar(g.a, series[0].color, active !== null && active !== i)}
							{bar(g.b, series[1].color, active !== null && active !== i)}
							{active === i && (
								<Box
									sx={{
										position: "absolute",
										bottom: `calc(${Math.max(pct(g.a), pct(g.b))}% + 8px)`,
										left: "50%",
										transform: `translateX(${i < 1 ? "-20%" : i > n - 2 ? "-80%" : "-50%"})`,
										zIndex: 1,
									}}
								>
									<ChartTooltip
										title={g.title}
										rows={[
											{ label: series[0].name, value: formatValue(g.a), color: series[0].color },
											{ label: series[1].name, value: formatValue(g.b), color: series[1].color },
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
					))}
				</Box>
			</Box>
		</Box>
	);
}
