/**
 * Geometry and motion for the Material 3 Expressive loading indicator, ported from the open-source
 * Android implementation (androidx.compose.material3: MaterialShapes.kt and LoadingIndicator.kt,
 * Apache-2.0). The seven shapes are built the same way (star polygons and corner-rounded custom
 * polygons), then reduced to a radial profile, the distance from the centre at evenly spaced
 * angles, so any two shapes can be morphed by blending their profiles.
 *
 * Motion (from LoadingIndicator.kt): every 650ms the shape morphs to the next one on a spring
 * (damping ratio 0.6, stiffness 200, which overshoots a little), adding a quarter turn per morph,
 * while the whole thing also turns once every 4666ms.
 */

type Pt = { x: number; y: number };
/** A polygon vertex and the radius of the circular corner that rounds it (0 = sharp). */
type Corner = { p: Pt; r: number };

const SAMPLES = 120;

const rad = (deg: number) => (deg * Math.PI) / 180;
const norm = (v: Pt): Pt => {
	const l = Math.hypot(v.x, v.y) || 1;
	return { x: v.x / l, y: v.y / l };
};

function rotate(p: Pt, deg: number, c: Pt = { x: 0, y: 0 }): Pt {
	const a = rad(deg);
	const dx = p.x - c.x;
	const dy = p.y - c.y;
	return {
		x: c.x + dx * Math.cos(a) - dy * Math.sin(a),
		y: c.y + dx * Math.sin(a) + dy * Math.cos(a),
	};
}

/** Round every vertex with a circular arc (CornerRounding without smoothing) and return the
 * resulting closed outline as a dense polyline. Where two corners share an edge too short for both
 * cuts, both are scaled down together, as the Android implementation does. */
function roundedOutline(corners: Corner[]): Pt[] {
	const n = corners.length;
	const info = corners.map((c, i) => {
		const prev = corners[(i - 1 + n) % n].p;
		const next = corners[(i + 1) % n].p;
		const d0 = norm({ x: prev.x - c.p.x, y: prev.y - c.p.y });
		const d1 = norm({ x: next.x - c.p.x, y: next.y - c.p.y });
		const cos = Math.max(-1, Math.min(1, d0.x * d1.x + d0.y * d1.y));
		const sin = Math.sqrt(Math.max(1e-12, 1 - cos * cos));
		// distance from the vertex to where the arc touches each edge
		const cut = c.r > 0 ? (c.r * (1 + cos)) / sin : 0;
		return { d0, d1, cos, cut };
	});

	const scale = Array.from({ length: n }, () => 1);
	for (let i = 0; i < n; i++) {
		const j = (i + 1) % n;
		const edge = Math.hypot(corners[j].p.x - corners[i].p.x, corners[j].p.y - corners[i].p.y);
		const total = info[i].cut + info[j].cut;
		if (total > edge) {
			const ratio = edge / total;
			scale[i] = Math.min(scale[i], ratio);
			scale[j] = Math.min(scale[j], ratio);
		}
	}

	const out: Pt[] = [];
	corners.forEach((c, i) => {
		const { d0, d1, cos } = info[i];
		const r = c.r * scale[i];
		if (r <= 1e-6) {
			out.push(c.p);
			return;
		}
		const cut = info[i].cut * scale[i];
		const t0 = { x: c.p.x + d0.x * cut, y: c.p.y + d0.y * cut };
		const t1 = { x: c.p.x + d1.x * cut, y: c.p.y + d1.y * cut };
		const bis = norm({ x: d0.x + d1.x, y: d0.y + d1.y });
		const half = Math.acos(cos) / 2;
		const dist = r / Math.sin(half);
		const ctr = { x: c.p.x + bis.x * dist, y: c.p.y + bis.y * dist };
		const a0 = Math.atan2(t0.y - ctr.y, t0.x - ctr.x);
		const a1 = Math.atan2(t1.y - ctr.y, t1.x - ctr.x);
		let da = a1 - a0;
		while (da > Math.PI) da -= 2 * Math.PI;
		while (da < -Math.PI) da += 2 * Math.PI;
		const steps = Math.max(3, Math.ceil(Math.abs(da) / 0.15));
		for (let k = 0; k <= steps; k++) {
			const a = a0 + (da * k) / steps;
			out.push({ x: ctr.x + r * Math.cos(a), y: ctr.y + r * Math.sin(a) });
		}
	});
	return out;
}

/** Distance from `c` to the outline at SAMPLES evenly spaced angles (the shape is star-shaped). */
function radialProfile(outline: Pt[], c: Pt): number[] {
	const out: number[] = [];
	for (let k = 0; k < SAMPLES; k++) {
		const a = (2 * Math.PI * k) / SAMPLES;
		const d = { x: Math.cos(a), y: Math.sin(a) };
		let best = 0;
		for (let i = 0; i < outline.length; i++) {
			const p = outline[i];
			const q = outline[(i + 1) % outline.length];
			const ax = p.x - c.x;
			const ay = p.y - c.y;
			const ex = q.x - p.x;
			const ey = q.y - p.y;
			const denom = d.x * ey - d.y * ex;
			if (Math.abs(denom) < 1e-12) continue;
			const t = (ax * ey - ay * ex) / denom;
			const u = (ax * d.y - ay * d.x) / denom;
			if (t > 0 && u >= -1e-9 && u <= 1 + 1e-9 && t > best) best = t;
		}
		out.push(best);
	}
	return out;
}

/** RoundedPolygon.star: alternating outer (radius 1) and inner vertices, all with one rounding. */
function star(count: number, inner: number, rounding: number): Corner[] {
	const out: Corner[] = [];
	for (let i = 0; i < count; i++) {
		const a = (Math.PI / count) * 2 * i;
		out.push({ p: { x: Math.cos(a), y: Math.sin(a) }, r: rounding });
		const b = (Math.PI / count) * (2 * i + 1);
		out.push({ p: { x: inner * Math.cos(b), y: inner * Math.sin(b) }, r: rounding });
	}
	return out;
}

/** MaterialShapes.doRepeat + customPolygon: repeat (and optionally mirror) points around a centre. */
function custom(
	points: Corner[],
	reps: number,
	mirroring: boolean,
	center: Pt = { x: 0.5, y: 0.5 },
) {
	const out: Corner[] = [];
	if (mirroring) {
		const angles = points.map(
			(c) => (Math.atan2(c.p.y - center.y, c.p.x - center.x) * 180) / Math.PI,
		);
		const dists = points.map((c) => Math.hypot(c.p.x - center.x, c.p.y - center.y));
		const actualReps = reps * 2;
		const section = 360 / actualReps;
		for (let it = 0; it < actualReps; it++) {
			for (let index = 0; index < points.length; index++) {
				const i = it % 2 === 0 ? index : points.length - 1 - index;
				if (i > 0 || it % 2 === 0) {
					const a = rad(
						section * it + (it % 2 === 0 ? angles[i] : section - angles[i] + 2 * angles[0]),
					);
					out.push({
						p: { x: Math.cos(a) * dists[i] + center.x, y: Math.sin(a) * dists[i] + center.y },
						r: points[i].r,
					});
				}
			}
		}
	} else {
		for (let it = 0; it < points.length * reps; it++) {
			const c = points[it % points.length];
			out.push({ p: rotate(c.p, (Math.floor(it / points.length) * 360) / reps, center), r: c.r });
		}
	}
	return out;
}

const pt = (x: number, y: number, r = 0): Corner => ({ p: { x, y }, r });

/** The seven shapes the indeterminate indicator cycles through, in order. */
const SHAPES: { outline: Pt[]; center: Pt }[] = [
	// SoftBurst
	{
		outline: roundedOutline(custom([pt(0.193, 0.277, 0.053), pt(0.176, 0.055, 0.053)], 10, false)),
		center: { x: 0.5, y: 0.5 },
	},
	// Cookie9Sided: a 9-pointed star, inner radius 0.8, rounding 0.5, turned -90 degrees
	{
		outline: roundedOutline(star(9, 0.8, 0.5).map((c) => ({ ...c, p: rotate(c.p, -90) }))),
		center: { x: 0, y: 0 },
	},
	// Pentagon
	{
		outline: roundedOutline(
			custom([pt(0.5, -0.009, 0.172), pt(1.03, 0.365, 0.164), pt(0.828, 0.97, 0.169)], 1, true),
		),
		center: { x: 0.5, y: 0.5 },
	},
	// Pill
	{
		outline: roundedOutline(
			custom([pt(0.961, 0.039, 0.426), pt(1.001, 0.428), pt(1.0, 0.609, 1.0)], 2, true),
		),
		center: { x: 0.5, y: 0.5 },
	},
	// Sunny: an 8-pointed star, inner radius 0.8, rounding 0.15
	{ outline: roundedOutline(star(8, 0.8, 0.15)), center: { x: 0, y: 0 } },
	// Cookie4Sided
	{
		outline: roundedOutline(custom([pt(1.237, 1.236, 0.258), pt(0.5, 0.918, 0.233)], 4, false)),
		center: { x: 0.5, y: 0.5 },
	},
	// Oval: a circle squashed to 64% height and turned -45 degrees
	{
		outline: Array.from({ length: 96 }, (_, i) => {
			const a = (2 * Math.PI * i) / 96;
			return rotate({ x: Math.cos(a), y: 0.64 * Math.sin(a) }, -45);
		}),
		center: { x: 0, y: 0 },
	},
];

/** Each shape's radial profile, scaled so every shape fits a unit box (RoundedPolygon.normalized)
 * and then so the largest reach of any shape is half the box, as LoadingIndicator's
 * calculateScaleFactor does, so nothing clips while turning. */
const PROFILES: number[][] = (() => {
	const raw = SHAPES.map(({ outline, center }) => {
		const xs = outline.map((p) => p.x);
		const ys = outline.map((p) => p.y);
		const side = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
		return radialProfile(outline, center).map((r) => r / side);
	});
	const reach = Math.max(...raw.flat());
	return raw.map((p) => p.map((r) => r / (2 * reach)));
})();

export const SHAPE_COUNT = PROFILES.length;

/** The container is 48dp and the indicator shape 38dp (the spec's ActiveSize). */
const ACTIVE_SCALE = 38 / 48;

/**
 * SVG path (in a 0..1 box) of the shape morphing from `from` toward `to` by `progress`. Progress
 * may go past 1 (the spring overshoots), which pushes the shape a little beyond the target.
 */
export function morphPath(from: number, to: number, progress: number): string {
	const a = PROFILES[from % SHAPE_COUNT];
	const b = PROFILES[to % SHAPE_COUNT];
	let d = "";
	for (let k = 0; k < SAMPLES; k++) {
		const angle = (2 * Math.PI * k) / SAMPLES;
		const r = (a[k] + (b[k] - a[k]) * progress) * ACTIVE_SCALE;
		d += `${k === 0 ? "M" : "L"}${(0.5 + r * Math.cos(angle)).toFixed(4)} ${(0.5 + r * Math.sin(angle)).toFixed(4)}`;
	}
	return `${d}Z`;
}

const MORPH_MS = 650;
const ROTATION_MS = 4666;

/** Spring (damping ratio 0.6, stiffness 200, mass 1) from 0 toward 1 after `ms`; overshoots ~9%. */
function spring(ms: number): number {
	const t = ms / 1000;
	const w0 = Math.sqrt(200);
	const z = 0.6;
	const wd = w0 * Math.sqrt(1 - z * z);
	return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
}

/** Where the animation is `now` ms after the page loaded: which morph, how far, how turned. Driven
 * by absolute time, so every indicator on screen stays in step. */
export function frameAt(now: number) {
	const step = Math.floor(now / MORPH_MS);
	const progress = spring(now - step * MORPH_MS);
	const from = step % SHAPE_COUNT;
	return {
		from,
		to: (from + 1) % SHAPE_COUNT,
		progress,
		// a quarter turn per morph (eased with the morph), plus the slow continuous turn
		rotation: progress * 90 + 90 * (step + 1) + 360 * ((now % ROTATION_MS) / ROTATION_MS),
	};
}
