import { keyframes } from "@emotion/react";
import CheckIcon from "@mui/icons-material/Check";
import Box from "@mui/material/Box";
import { useCallback, useEffect, useId, useRef, useState } from "react";

/* The design is Bencho's One-time code block (MIT, bencho.dev/licence), as the iOS app draws it
   (`Features/Login/Otp`): six cells and a caret, digits that rise into them, a right code that fuses
   the cells into one "Verified" capsule, a wrong one that shivers the row and drains the digits.

   ── SIX CELLS, ONE FIELD ────────────────────────────────
   Six real inputs break paste, autofill from the message, backspace and screen readers. So there is
   one invisible input over the row and the cells are drawn underneath it.

   ── THE MERGE IS THE GOO'S ──────────────────────────────
   The cells sit under a blur-and-threshold filter, far enough apart that it never bridges them.
   Verifying slides them to the middle while a capsule grows out of the same point: as they close, the
   filter joins them. Nobody draws the in-between; the filter decides when two things are close
   enough to be one. The filter multiplies alpha so anything under 0.5 lands on zero: it must never
   touch text, whose antialiasing lives entirely below that. The digits are drawn above it. */

const LENGTH = 6;
/* a cell, and the air between two */
const W = 40;
const H = 50;
const G = 8;
/* the capsule a right code becomes */
const CAP = 144;
const ROW_W = LENGTH * W + (LENGTH - 1) * G;
/* how long a cell takes to swell when a digit lands, and how long the shiver lasts */
const POP_MS = 260;
const SHAKE_MS = 620;
/* the shiver, then the digits falling out, then an empty row again (iOS: 780ms) */
const CLEAR_MS = 780;

/* The merge is a spring a little under critical, per frame at 60Hz: the capsule runs past its size
   and comes back, long and thin on the way out and round when it settles, which reads as liquid. */
const MERGE_K = 0.075;
const MERGE_D = 1 - 2 * 0.42 * Math.sqrt(MERGE_K);

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, v: number) => {
	const u = clamp((v - a) / (b - a), 0, 1);
	return u * u * (3 - 2 * u);
};

export type OtpState = "typing" | "checking" | "verified";

/** What the loop publishes each frame; the render reads only this, never the loop's own state. */
type Frame = {
	merge: number;
	caretX: number;
	caretV: number;
	now: number;
	shakeAt: number;
	popAt: readonly number[];
	still: boolean;
};

const START: Frame = {
	merge: 0,
	caretX: W / 2,
	caretV: 0,
	now: 0,
	shakeAt: -Infinity,
	popAt: [],
	still: false,
};

const rise = keyframes`
	from { transform: translateY(45%) scale(0.86); opacity: 0; filter: blur(3px); }
	to { transform: none; opacity: 1; filter: none; }
`;
const breathe = keyframes`from { opacity: 1; } to { opacity: 0.25; }`;

/** Six cells for a one-time code. A full row calls `onComplete`; `state` says how the check went
 * (the cells breathe while checking, fuse into a capsule once verified), and each rise of
 * `failures` shivers the row and clears it through `onChange("")`. */
export default function OtpField({
	code,
	onChange,
	state,
	failures,
	onComplete,
}: {
	code: string;
	onChange: (code: string) => void;
	state: OtpState;
	failures: number;
	onComplete: () => void;
}) {
	const [frame, setFrame] = useState<Frame>(START);
	const [focused, setFocused] = useState(false);
	const input = useRef<HTMLInputElement | null>(null);
	const gooId = `goo-${useId().replace(/:/g, "")}`;

	// the loop's own moving parts and the latest props it reads; touched only in effects and frames
	const sim = useRef({
		merge: 0,
		mergeV: 0,
		mergeTo: 0,
		caretX: W / 2,
		caretV: 0,
		shakeAt: -Infinity,
		popAt: [] as number[],
		prevLength: 0,
		raf: 0,
		still: false,
		length: 0,
	});

	const wake = useCallback(() => {
		const s = sim.current;
		if (s.raf) return;
		let prev = 0;
		const tick = (t: number) => {
			const dt = prev ? clamp((t - prev) / 16.67, 0, 2.5) : 1;
			prev = t;
			let busy = false;

			// the caret, on a spring with a little give
			const target = Math.min(s.length, LENGTH - 1) * (W + G) + W / 2;
			if (s.still) {
				s.caretX = target;
				s.caretV = 0;
			} else {
				s.caretV += (target - s.caretX) * 0.2 * dt;
				s.caretV *= Math.pow(0.62, dt);
				s.caretX += s.caretV * dt;
				if (Math.abs(target - s.caretX) < 0.05 && Math.abs(s.caretV) < 0.05) {
					s.caretX = target;
					s.caretV = 0;
				} else busy = true;
			}

			// the merge, sprung
			if (s.merge !== s.mergeTo || s.mergeV !== 0) {
				if (s.still) {
					s.merge = s.mergeTo;
					s.mergeV = 0;
				} else {
					s.mergeV += (s.mergeTo - s.merge) * MERGE_K * dt;
					s.mergeV *= Math.pow(MERGE_D, dt);
					s.merge += s.mergeV * dt;
					if (Math.abs(s.mergeTo - s.merge) < 0.0008 && Math.abs(s.mergeV) < 0.0008) {
						s.merge = s.mergeTo;
						s.mergeV = 0;
					} else busy = true;
				}
			}

			if (t - s.shakeAt < SHAKE_MS + 200) busy = true;
			if (s.popAt.some((at) => t - at < POP_MS)) busy = true;

			setFrame({
				merge: s.merge,
				caretX: s.caretX,
				caretV: s.caretV,
				now: t,
				shakeAt: s.shakeAt,
				popAt: [...s.popAt],
				still: s.still,
			});
			s.raf = busy ? requestAnimationFrame(tick) : 0;
		};
		s.raf = requestAnimationFrame(tick);
	}, []);

	useEffect(() => {
		const s = sim.current;
		s.still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		wake();
		return () => {
			cancelAnimationFrame(s.raf);
			s.raf = 0;
		};
	}, [wake]);

	// each new digit swells its cell; a paste runs along the row
	useEffect(() => {
		const s = sim.current;
		s.length = code.length;
		if (!s.still && code.length > s.prevLength) {
			const t0 = performance.now();
			for (let i = s.prevLength; i < code.length; i++) s.popAt[i] = t0 + (i - s.prevLength) * 45;
		}
		s.prevLength = code.length;
		wake();
	}, [code, wake]);

	// a right code fuses the cells; going back to typing splits them
	useEffect(() => {
		sim.current.mergeTo = state === "verified" ? 1 : 0;
		wake();
		if (state === "verified") input.current?.blur();
		if (state === "typing") input.current?.focus();
	}, [state, wake]);

	// a wrong code shivers the row, then lets the digits fall out and starts over
	const seenFailures = useRef(failures);
	useEffect(() => {
		if (failures === seenFailures.current) return undefined;
		seenFailures.current = failures;
		sim.current.shakeAt = performance.now();
		wake();
		const timer = window.setTimeout(() => {
			onChange("");
			input.current?.focus();
		}, CLEAR_MS);
		return () => window.clearTimeout(timer);
	}, [failures, onChange, wake]);

	function handleChange(raw: string) {
		if (state !== "typing") return;
		const next = raw.replace(/\D/g, "").slice(0, LENGTH);
		onChange(next);
		if (next.length === LENGTH) onComplete();
	}

	// ── where everything is this frame ─────────────────────────
	const { still, now } = frame;
	// the raw spring runs past 0 and 1; the cells' travel is clamped, only the capsule takes the overshoot
	const m = clamp(frame.merge, 0, 1);
	const over = frame.merge - 1;
	const home = (i: number) => i * (W + G);
	const mid = (ROW_W - W) / 2;
	const since = now - frame.shakeAt;
	const shaking = since >= 0 && since < SHAKE_MS && !still;
	const wobble = (i: number) =>
		shaking
			? 5 * Math.exp(-since / 190) * Math.sin((since / 1000) * Math.PI * 2 * 10 + i * 0.55)
			: 0;
	const cellX = (i: number) => mix(home(i), mid, m) + wobble(i);
	// a digit arriving: the cell swells four per cent on one half-sine and settles
	const pop = (i: number) => {
		const at = frame.popAt[i];
		if (at === undefined) return 1;
		const u = (now - at) / POP_MS;
		return u > 0 && u < 1 ? 1 + 0.04 * Math.sin(Math.PI * u) : 1;
	};
	// checking: a soft wave of breath through the cells
	const scaleOf = (i: number) => {
		if (state !== "checking" || still) return pop(i);
		const u = ((now % 900) / 900) * (LENGTH + 2) - i;
		return 1 - 0.07 * (u > 0 && u < 2 ? Math.sin((u / 2) * Math.PI) : 0);
	};
	// long and thin past its size, round again as it settles
	const capW = CAP * smooth(0.3, 1, m) * (1 + Math.max(-0.12, over) * 0.9);
	const capScaleY = 1 - Math.max(-0.12, over) * 0.55;
	// cells round off into the capsule's pill as they close in, so the shapes agree when the goo joins them
	const cellRadius = mix(12, H / 2, smooth(0.15, 0.7, m));
	// white cells with a hint of green as they fuse (one colour under the filter, or the threshold smears two)
	const fill = `color-mix(in oklab, var(--md-sys-color-surface-container-low), var(--md-sys-color-success, #16694a) ${(22 * m).toFixed(1)}%)`;
	const typing = state === "typing" && focused;

	return (
		<Box
			sx={{ position: "relative", display: "grid", placeItems: "center", py: 1 }}
			data-state={state}
		>
			<Box sx={{ position: "relative", width: ROW_W, height: H }}>
				{/* the cells and the capsule: one colour, under the filter. A white cell needs a lift
				    off the page; the shadow follows the fused shape. */}
				<Box
					aria-hidden
					sx={{
						position: "absolute",
						inset: 0,
						filter: `${still ? "" : `url(#${gooId}) `}drop-shadow(0 1px 1.5px rgb(0 0 0 / 0.06)) drop-shadow(0 4px 8px rgb(0 0 0 / 0.08))`,
						"& > span": {
							position: "absolute",
							left: 0,
							top: 0,
							height: "100%",
							bgcolor: fill,
						},
					}}
				>
					{Array.from({ length: LENGTH }, (_, i) => (
						<span
							key={i}
							style={{
								width: W,
								borderRadius: cellRadius,
								transform: `translateX(${cellX(i).toFixed(2)}px) scale(${scaleOf(i).toFixed(3)})`,
							}}
						/>
					))}
					{capW > 0.5 && (
						<span
							style={{
								width: capW,
								// always a full pill: the capsule is a result, not a cell
								borderRadius: H / 2,
								transform: `translateX(${((ROW_W - capW) / 2).toFixed(2)}px) scaleY(${capScaleY.toFixed(3)})`,
							}}
						/>
					)}
				</Box>
				<svg
					aria-hidden
					focusable="false"
					style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
				>
					<defs>
						<filter
							id={gooId}
							x="-50%"
							y="-50%"
							width="200%"
							height="200%"
							colorInterpolationFilters="sRGB"
						>
							<feGaussianBlur in="SourceGraphic" stdDeviation={3} result="smear" />
							<feColorMatrix
								in="smear"
								type="matrix"
								values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -12"
							/>
						</filter>
					</defs>
				</svg>

				{/* the digits: an empty cell is just the cell */}
				{Array.from({ length: LENGTH }, (_, i) => {
					const digit = code[i];
					// a wrong code drains right to left
					const out =
						since >= 0 && since < SHAKE_MS + 200
							? smooth(0, 1, (since - 300 - (LENGTH - 1 - i) * 45) / 220)
							: 0;
					return (
						<Box
							key={i}
							aria-hidden
							sx={{
								position: "absolute",
								left: 0,
								top: 0,
								height: "100%",
								display: "grid",
								placeItems: "center",
								pointerEvents: "none",
							}}
							style={{
								width: W,
								transform: `translateX(${cellX(i).toFixed(2)}px)`,
								opacity: 1 - smooth(0, 0.45, m),
							}}
						>
							{digit && (
								<Box
									component="span"
									key={`${i}-${digit}`}
									sx={{
										fontSize: 24,
										fontWeight: 600,
										lineHeight: 1,
										fontVariantNumeric: "tabular-nums",
										color: out > 0 ? "var(--md-sys-color-error)" : "var(--md-sys-color-on-surface)",
										animation: `${rise} 300ms cubic-bezier(0.22, 1, 0.36, 1) both`,
										"@media (prefers-reduced-motion: reduce)": { animation: "none" },
									}}
									style={{ translate: `0 ${(out * 8).toFixed(2)}px`, opacity: 1 - out }}
								>
									{digit}
								</Box>
							)}
						</Box>
					);
				})}

				{/* the caret, stretched by its own speed; not until the cells have come apart again */}
				<Box
					component="i"
					aria-hidden
					sx={{
						position: "absolute",
						left: 0,
						top: "50%",
						width: 2,
						height: 24,
						mt: "-12px",
						borderRadius: "2px",
						bgcolor: "primary.main",
						opacity: 0,
						pointerEvents: "none",
						transition: "opacity 160ms ease",
						"&[data-on='true']": {
							opacity: 1,
							animation: `${breathe} 1.1s ease-in-out infinite alternate`,
						},
						"@media (prefers-reduced-motion: reduce)": {
							"&[data-on='true']": { animation: "none" },
						},
					}}
					data-on={typing && code.length < LENGTH && m < 0.08}
					style={{
						transform: `translateX(${(frame.caretX - 1).toFixed(2)}px) scaleX(${(1 + Math.min(5, Math.abs(frame.caretV) * 0.9)).toFixed(3)})`,
					}}
				/>

				{/* what the capsule says */}
				<Box
					aria-hidden
					sx={{
						position: "absolute",
						inset: 0,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: 1,
						fontSize: 15,
						fontWeight: 600,
						color: "var(--md-sys-color-on-surface)",
						pointerEvents: "none",
					}}
					style={{ opacity: smooth(0.72, 1, m), scale: String(mix(0.92, 1, smooth(0.72, 1, m))) }}
				>
					<CheckIcon sx={{ fontSize: 18 }} />
					Verified
				</Box>

				{/* the field: over the whole row, there and invisible; 16px so iOS does not zoom */}
				<Box
					component="input"
					ref={input}
					value={code}
					onChange={(e) => handleChange(e.target.value)}
					onFocus={() => setFocused(true)}
					onBlur={() => setFocused(false)}
					inputMode="numeric"
					autoComplete="one-time-code"
					autoFocus
					maxLength={LENGTH}
					disabled={state !== "typing"}
					aria-label={state === "verified" ? "Verified" : `${LENGTH}-digit code`}
					spellCheck={false}
					sx={{
						position: "absolute",
						inset: 0,
						width: "100%",
						height: "100%",
						opacity: 0,
						border: 0,
						p: 0,
						fontSize: 16,
						caretColor: "transparent",
						cursor: "text",
					}}
				/>
			</Box>
		</Box>
	);
}
