import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import FitScreenIcon from "@mui/icons-material/FitScreen";
import RemoveIcon from "@mui/icons-material/Remove";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import {
	type KeyboardEvent as ReactKeyboardEvent,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { fitView, type Size, type View, zoomAt } from "#/lib/pan-zoom";
import { roomyHeight, SankeyDiagram } from "./Sankey";
import { type MoneyFlow, tallestColumn } from "#/lib/money-flow";

const CANVAS_WIDTH = 1280; // the diagram's real size, which the view then scales
const STEP = 1.25; // one tap of + or -
const PAN_STEP = 80; // px an arrow key moves

type Point = { x: number; y: number };

/** Where a pointer event is, in the canvas's own coordinates. */
function local(e: ReactPointerEvent<HTMLDivElement>): Point {
	const rect = e.currentTarget.getBoundingClientRect();
	return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

/**
 * The Sankey diagram full screen on a canvas you can drag to pan and pinch, wheel or button to
 * zoom, for a flow with too many branches to read in its card. The diagram is drawn at a roomy real
 * size and the canvas scales it, so labels stay legible and every node can still be hovered,
 * focused and read by a screen reader.
 */
export default function SankeyCanvas({
	open,
	onClose,
	title,
	subtitle,
	flow,
	formatValue,
	formatLabel,
	ariaLabel,
}: {
	open: boolean;
	onClose: () => void;
	title: string;
	subtitle?: string;
	flow: MoneyFlow;
	formatValue: (value: number) => string;
	formatLabel?: (value: number) => string;
	ariaLabel: string;
}) {
	const height = roomyHeight(tallestColumn(flow));
	const content: Size = { width: CANVAS_WIDTH, height };
	const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
	const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
	const pointers = useRef(new Map<number, Point>());
	const dragging = useRef(false);

	const fit = useCallback(() => {
		if (viewport) setView(fitView(content, viewport.getBoundingClientRect()));
		// `content` is rebuilt every render from `height`, which is what it depends on
		// oxlint-disable-next-line react-hooks/exhaustive-deps
	}, [viewport, height]);

	// Fit when the canvas opens, and again when the window changes size.
	useEffect(() => {
		if (!viewport) return undefined;
		fit();
		const observer = new ResizeObserver(fit);
		observer.observe(viewport);
		return () => observer.disconnect();
	}, [viewport, fit]);

	// The wheel zooms around the pointer. React's own onWheel is passive and cannot stop the page
	// from scrolling, so this is a plain listener.
	useEffect(() => {
		if (!viewport) return undefined;
		const onWheel = (e: WheelEvent) => {
			e.preventDefault();
			const rect = viewport.getBoundingClientRect();
			const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
			setView((v) => zoomAt(v, factor, e.clientX - rect.left, e.clientY - rect.top));
		};
		viewport.addEventListener("wheel", onWheel, { passive: false });
		return () => viewport.removeEventListener("wheel", onWheel);
	}, [viewport]);

	const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
		pointers.current.set(e.pointerId, local(e));
		dragging.current = true;
		e.currentTarget.setPointerCapture(e.pointerId);
	};
	const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
		const before = pointers.current.get(e.pointerId);
		if (!before) return;
		const after = local(e);
		const others = [...pointers.current].filter(([id]) => id !== e.pointerId);
		pointers.current.set(e.pointerId, after);
		if (others.length === 0) {
			setView((v) => ({ ...v, x: v.x + after.x - before.x, y: v.y + after.y - before.y }));
			return;
		}
		// two fingers: zoom by how far apart they went, around the point between them
		const other = others[0]?.[1];
		if (!other) return;
		const was = Math.hypot(before.x - other.x, before.y - other.y);
		const now = Math.hypot(after.x - other.x, after.y - other.y);
		if (was === 0) return;
		const mid = { x: (after.x + other.x) / 2, y: (after.y + other.y) / 2 };
		setView((v) => zoomAt(v, now / was, mid.x, mid.y));
	};
	const onPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
		pointers.current.delete(e.pointerId);
		if (pointers.current.size === 0) dragging.current = false;
	};

	const zoomBy = (factor: number) => {
		if (!viewport) return;
		const rect = viewport.getBoundingClientRect();
		setView((v) => zoomAt(v, factor, rect.width / 2, rect.height / 2));
	};
	const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
		// only when the canvas itself has focus, so a focused node label keeps its own keys
		if (e.target !== e.currentTarget) return;
		const pan: Record<string, Point> = {
			ArrowLeft: { x: PAN_STEP, y: 0 },
			ArrowRight: { x: -PAN_STEP, y: 0 },
			ArrowUp: { x: 0, y: PAN_STEP },
			ArrowDown: { x: 0, y: -PAN_STEP },
		};
		const move = pan[e.key];
		if (move) setView((v) => ({ ...v, x: v.x + move.x, y: v.y + move.y }));
		else if (e.key === "+" || e.key === "=") zoomBy(STEP);
		else if (e.key === "-") zoomBy(1 / STEP);
		else if (e.key === "0") fit();
		else return;
		e.preventDefault();
	};

	return (
		<Dialog open={open} onClose={onClose} fullScreen aria-labelledby="sankey-canvas-title">
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					gap: 1,
					px: 2,
					py: 1,
					flexShrink: 0,
				}}
			>
				<IconButton aria-label="Close" onClick={onClose} edge="start">
					<CloseIcon />
				</IconButton>
				<Box sx={{ minWidth: 0, flexGrow: 1 }}>
					<Typography id="sankey-canvas-title" variant="subtitle1" noWrap>
						{title}
					</Typography>
					{subtitle && (
						<Typography variant="caption" sx={{ color: "text.secondary" }} noWrap>
							{subtitle}
						</Typography>
					)}
				</Box>
				<IconButton aria-label="Zoom out" onClick={() => zoomBy(1 / STEP)}>
					<RemoveIcon />
				</IconButton>
				<Typography
					aria-live="polite"
					sx={{ minWidth: 44, textAlign: "center", fontVariantNumeric: "tabular-nums" }}
					variant="body2"
				>
					{Math.round(view.scale * 100)}%
				</Typography>
				<IconButton aria-label="Zoom in" onClick={() => zoomBy(STEP)}>
					<AddIcon />
				</IconButton>
				<IconButton aria-label="Fit to the screen" onClick={fit}>
					<FitScreenIcon />
				</IconButton>
			</Box>
			<Box
				ref={setViewport}
				tabIndex={0}
				role="application"
				aria-label={`${ariaLabel}. Drag to move, pinch or scroll to zoom; arrow keys move, plus and minus zoom, 0 fits.`}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerEnd}
				onPointerCancel={onPointerEnd}
				onKeyDown={onKeyDown}
				sx={{
					flexGrow: 1,
					minHeight: 0,
					overflow: "hidden",
					touchAction: "none", // the canvas takes the gestures, the page does not scroll
					cursor: "grab",
					"&:active": { cursor: "grabbing" },
					bgcolor: "var(--md-sys-color-surface-container-low)",
					outline: "none",
					"&:focus-visible": { boxShadow: "inset 0 0 0 2px var(--md-sys-color-primary)" },
				}}
			>
				<Box
					sx={{
						width: CANVAS_WIDTH,
						height,
						transformOrigin: "0 0",
						transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
					}}
				>
					<SankeyDiagram
						flow={flow}
						formatValue={formatValue}
						formatLabel={formatLabel}
						ariaLabel={ariaLabel}
						width={CANVAS_WIDTH}
						height={height}
					/>
				</Box>
			</Box>
		</Dialog>
	);
}
