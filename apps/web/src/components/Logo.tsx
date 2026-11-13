import Box from "@mui/material/Box";
import { useId } from "react";

// The mark from maalu.svg: four rounded bars that read as an "m". Two shapes, each drawn plain and
// mirrored, placed as in the original artwork (its outer transform folded into each bar's).
const TALL =
	"M530.238,269.762C511.591,288.409 500,324.101 500,362.874L500,721.654C500,738.044 504.745,753.217 512.481,761.567C520.217,769.917 529.796,770.204 537.679,762.321C545.944,754.056 554.688,745.312 562.929,737.071C585.79,714.21 600,670.452 600,622.917C600,537.649 600,399.775 600,304.757C600,282.842 593.656,262.553 583.312,251.389C572.968,240.224 560.159,239.841 549.62,250.38C542.995,257.005 536.379,263.621 530.238,269.762Z";
const SHORT =
	"M539.722,335.658C531.182,327.992 521.077,328.905 512.995,338.074C504.913,347.242 500,363.366 500,380.719C500,449.463 500,550.413 500,636.031C500,670.333 509.93,702.089 526.121,719.565C542.312,737.04 562.36,737.64 578.857,721.143C581.736,718.264 584.421,715.579 586.846,713.154C594.958,705.042 600,689.515 600,672.648C600,627.892 600,537.329 600,470.679C600,421.143 584.561,375.911 560.185,354.028C553.449,347.981 546.455,341.703 539.722,335.658Z";

/** Left to right: the shape and where it sits. */
const BARS = [
	{ d: TALL, transform: "matrix(0.911539,0,0,0.5,346.73077,749.75429)" },
	{ d: SHORT, transform: "matrix(0.911539,0,0,0.5,448.01282,704.75429)" },
	{ d: SHORT, transform: "matrix(-0.911539,0,0,0.5,1551.988,705.22894)" },
	{ d: TALL, transform: "matrix(-0.911539,0,0,0.5,1653.2701,750.22894)" },
] as const;

const SPRING = "var(--spring-spatial-default-dur) var(--spring-spatial-default)";

/**
 * The Maalu mark. In navy with a soft fall to slate (pale blue in dark mode), like the app icon.
 * With `animate`, the bars rise one after another when it appears and ripple once under the
 * pointer; it stays still for people who ask for less motion.
 */
export default function Logo({
	size = 120,
	animate = false,
	title = "Maalu",
}: {
	/** Width in pixels; the height follows. */
	size?: number;
	animate?: boolean;
	title?: string;
}) {
	const fill = useId();
	return (
		<Box
			component="svg"
			viewBox="795 860 410 285"
			role="img"
			aria-label={title}
			sx={{
				display: "block",
				width: size,
				height: "auto",
				overflow: "visible",
				"--logo-top": "#081d48",
				"--logo-bottom": "#233c62",
				"[data-dark] &": { "--logo-top": "#dff3fb", "--logo-bottom": "#a6dff5" },
				"@media (prefers-color-scheme: dark)": {
					":root:not([data-light]):not([data-dark]) &": {
						"--logo-top": "#dff3fb",
						"--logo-bottom": "#a6dff5",
					},
				},
				...(animate && {
					"& .bar": {
						transformBox: "fill-box",
						transformOrigin: "50% 100%",
						animation: `logo-rise ${SPRING} both`,
						transition: `transform ${SPRING}`,
					},
					"& .bar:nth-of-type(2)": { animationDelay: "90ms", transitionDelay: "40ms" },
					"& .bar:nth-of-type(3)": { animationDelay: "180ms", transitionDelay: "80ms" },
					"& .bar:nth-of-type(4)": { animationDelay: "270ms", transitionDelay: "120ms" },
					"@media (hover: hover) and (pointer: fine)": {
						"&:hover .bar": { transform: "translateY(-8%)" },
					},
					"@keyframes logo-rise": {
						from: { opacity: 0, transform: "translateY(40%) scaleY(0.4)" },
						to: { opacity: 1, transform: "none" },
					},
					"@media (prefers-reduced-motion: reduce)": {
						"& .bar": { animation: "none", transition: "none" },
						"&:hover .bar": { transform: "none" },
					},
				}),
			}}
		>
			<defs>
				<linearGradient id={fill} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" style={{ stopColor: "var(--logo-top)" }} />
					<stop offset="1" style={{ stopColor: "var(--logo-bottom)" }} />
				</linearGradient>
			</defs>
			{BARS.map((bar) => (
				<g key={bar.transform} className="bar">
					<path d={bar.d} transform={bar.transform} fill={`url(#${fill})`} />
				</g>
			))}
		</Box>
	);
}
