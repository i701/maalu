export type SlabShape = {
	/** The slab's size in px. */
	width: number;
	height: number;
	/** The slab's own corner radius. */
	radius: number;
	/** The radius of the round bite taken out of the slab's bottom edge, centred on the seam. */
	bite: number;
	/** How far the edge eases round into the bite: the radius of the rounded lip between them. */
	fillet: number;
	/** The bite's centre below the slab's bottom edge (half the gap between two slabs). */
	seam: number;
};

const px = (n: number) => Number(n.toFixed(2));

/**
 * The outline of a slab whose bottom edge has a round bite in the middle, for the swap arrow to sit
 * in: the straight edge eases into the bite along a rounded lip (a circle tangent to the edge and
 * to the bite), follows the bite round, and eases back out. Drawn clockwise from the top left,
 * inset by half a pixel so a 1px stroke along it lies inside `width` by `height`. The slab
 * below it is this shape flipped upside down.
 */
export function slabPath({ width, height, radius, bite, fillet, seam }: SlabShape): string {
	const x0 = 0.5;
	const y0 = 0.5;
	const x1 = width - 0.5;
	const y1 = height - 0.5; // the bottom edge, where the stroke runs
	const cx = width / 2;
	const cy = height + seam; // the bite's centre
	const g = cy - y1; // how far below the edge the centre is
	// the lip's circle sits inside the slab, tangent to the edge and (from outside) to the bite
	const dx = Math.sqrt((bite + fillet) ** 2 - (fillet + g) ** 2);
	// where the lip meets the bite: on the line between the two centres, `bite` out from the bite's
	const tx = (bite * dx) / (bite + fillet);
	const ty = (bite * (fillet + g)) / (bite + fillet);
	const r = radius;
	return [
		`M${px(x0 + r)} ${px(y0)}`,
		`H${px(x1 - r)}`,
		`A${r} ${r} 0 0 1 ${px(x1)} ${px(y0 + r)}`,
		`V${px(y1 - r)}`,
		`A${r} ${r} 0 0 1 ${px(x1 - r)} ${px(y1)}`,
		`H${px(cx + dx)}`,
		`A${fillet} ${fillet} 0 0 1 ${px(cx + tx)} ${px(cy - ty)}`,
		`A${bite} ${bite} 0 0 0 ${px(cx - tx)} ${px(cy - ty)}`,
		`A${fillet} ${fillet} 0 0 1 ${px(cx - dx)} ${px(y1)}`,
		`H${px(x0 + r)}`,
		`A${r} ${r} 0 0 1 ${px(x0)} ${px(y1 - r)}`,
		`V${px(y0 + r)}`,
		`A${r} ${r} 0 0 1 ${px(x0 + r)} ${px(y0)}`,
		"Z",
	].join(" ");
}
