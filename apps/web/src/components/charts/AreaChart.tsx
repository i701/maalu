import Box from "@mui/material/Box";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { compact, niceTicks } from "#/lib/charts";
import ChartTooltip from "./ChartTooltip";

export type AreaPoint = { label: string; value: number };

/**
 * One series over time: a 2px line over a 10% wash, hairline grid, round y ticks and a dot with a
 * surface ring at the latest point. The marks are an SVG stretched to the box with non-scaling
 * strokes; text and dots are HTML on top, so nothing distorts at any width. Hover (or the arrow
 * keys) snaps a crosshair and readout to the nearest day.
 */
export default function AreaChart({
	points,
	formatValue,
	name,
	ariaLabel,
	color = "var(--chart-line)",
	height = 200,
}: {
	points: AreaPoint[];
	formatValue: (value: number) => string;
	/** The series name, shown in the readout */
	name: string;
	ariaLabel: string;
	color?: string;
	height?: number;
}) {
	const plot = useRef<HTMLDivElement>(null);
	const [active, setActive] = useState<number | null>(null);
	const n = points.length;
	if (n === 0) return null;

	const values = points.map((p) => p.value);
	const ticks = niceTicks(Math.min(...values), Math.max(...values), 3);
	const lo = ticks[0];
	const hi = ticks[ticks.length - 1];
	const x = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
	const y = (v: number) => (hi === lo ? 50 : 100 - ((v - lo) / (hi - lo)) * 100);
	const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(p.value)}`).join(" ");
	const area = `${line} L${x(n - 1)} 100 L${x(0)} 100 Z`;

	const pick = (e: PointerEvent) => {
		const box = plot.current?.getBoundingClientRect();
		if (!box || box.width === 0) return;
		const ratio = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
		setActive(Math.round(ratio * (n - 1)));
	};
	const onKey = (e: KeyboardEvent) => {
		if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? n) - 1));
		else if (e.key === "ArrowRight") setActive((a) => Math.min(n - 1, (a ?? -1) + 1));
		else if (e.key === "Escape") setActive(null);
		else return;
		e.preventDefault();
	};

	const shown = active ?? n - 1;
	const anchor = x(shown);
	const labelAt = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, all) => all.indexOf(v) === i);

	return (
		<Box sx={{ position: "relative", pl: 5.5, pb: 3 }}>
			<Box
				ref={plot}
				tabIndex={0}
				role="img"
				aria-label={ariaLabel}
				onPointerMove={pick}
				onPointerLeave={() => setActive(null)}
				onKeyDown={onKey}
				onBlur={() => setActive(null)}
				sx={{ position: "relative", height, touchAction: "pan-y", outlineOffset: 4 }}
			>
				<svg
					viewBox="0 0 100 100"
					preserveAspectRatio="none"
					style={{
						position: "absolute",
						inset: 0,
						width: "100%",
						height: "100%",
						overflow: "visible",
					}}
					aria-hidden
				>
					{ticks.map((t) => (
						<line
							key={t}
							x1={0}
							x2={100}
							y1={y(t)}
							y2={y(t)}
							stroke="var(--md-sys-color-outline-variant)"
							strokeWidth={1}
							vectorEffect="non-scaling-stroke"
						/>
					))}
					<path d={area} fill={color} fillOpacity={0.1} />
					<path
						d={line}
						fill="none"
						stroke={color}
						strokeWidth={2}
						strokeLinejoin="round"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
				</svg>

				{ticks.map((t) => (
					<Box
						key={t}
						sx={{
							position: "absolute",
							right: "100%",
							top: `${y(t)}%`,
							transform: "translateY(-50%)",
							pr: 1,
							fontSize: 11,
							color: "text.secondary",
							fontVariantNumeric: "tabular-nums",
							whiteSpace: "nowrap",
						}}
					>
						{compact(t)}
					</Box>
				))}

				{active !== null && (
					<Box
						aria-hidden
						sx={{
							position: "absolute",
							left: `${anchor}%`,
							top: 0,
							bottom: 0,
							width: "1px",
							bgcolor: "var(--md-sys-color-outline)",
						}}
					/>
				)}
				<Box
					aria-hidden
					sx={{
						position: "absolute",
						left: `${anchor}%`,
						top: `${y(points[shown].value)}%`,
						width: 10,
						height: 10,
						borderRadius: "50%",
						transform: "translate(-50%, -50%)",
						bgcolor: color,
						boxShadow: "0 0 0 2px var(--md-sys-color-surface)",
					}}
				/>
				{active !== null && (
					<Box
						sx={{
							position: "absolute",
							top: 0,
							left: `${anchor}%`,
							transform: `translateX(${anchor < 18 ? "0" : anchor > 82 ? "-100%" : "-50%"})`,
							zIndex: 1,
						}}
					>
						<ChartTooltip
							title={points[active].label}
							rows={[{ label: name, value: formatValue(points[active].value), color }]}
						/>
					</Box>
				)}

				{labelAt.map((i, k) => (
					<Box
						key={i}
						sx={{
							position: "absolute",
							top: "100%",
							left: `${x(i)}%`,
							transform: `translateX(${k === 0 ? "0" : k === labelAt.length - 1 ? "-100%" : "-50%"})`,
							pt: 0.75,
							fontSize: 11,
							color: "text.secondary",
							whiteSpace: "nowrap",
						}}
					>
						{points[i].label}
					</Box>
				))}
			</Box>
		</Box>
	);
}
