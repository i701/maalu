import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import FormHelperText from "@mui/material/FormHelperText";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Typography from "@mui/material/Typography";
import { type KeyboardEvent, type Ref, useEffect, useLayoutEffect, useRef, useState } from "react";
import { type Control, Controller, useFormState, useWatch } from "react-hook-form";
import { formatMoney } from "#/lib/format";
import { SPRING } from "#/lib/motion";
import { slabPath } from "#/lib/slab-shape";
import type { TransferSide } from "#/lib/transfer";
import type { AccountChoice } from "./AccountPicker";
import type { TxValues } from "./schema";

const SLAB = 124;
const GAP = 3;
const BLOCK = SLAB * 2 + GAP;
/** The swap arrow's circle, the round bite each slab has taken out of its edge around it (a little
 * larger, so a gap shows), and the radius of the rounded lip the edge eases in by (`lib/slab-shape`). */
const ARROW = 40;
const BITE = 26;
const FILLET = 14;
/** The slabs' corner radius in px (`--shape-lg`), which the slab's outline and its clipping share. */
const CORNER = 16;
const SIDES: readonly TransferSide[] = ["from", "to"];
const ROLE: Record<TransferSide, string> = { from: "From", to: "To" };

/** "7730000486374 · MVR 10,120.12": the number and the balance, what tells two accounts of one bank apart. */
const numberAndBalance = (a: AccountChoice) =>
	[a.account_number, a.balance !== undefined ? formatMoney(a.balance, a.currency) : null]
		.filter(Boolean)
		.join(" · ");

/**
 * The transfer's two slabs, one over the other: the account the money leaves with the amount, and
 * the account it goes to with what arrives, and an arrow on the seam that swaps them. Pressing a
 * slab's account pill grows that slab over the whole block into the list of accounts; picking one
 * shrinks it back (the account already on the other side swaps places with it instead of being
 * used twice). After iOS's transfer form, which was made after Bencho's Asset swap block (MIT).
 */
export default function TransferSlabs({
	control,
	accounts,
	crossCurrency,
	onPick,
	onSwap,
}: {
	control: Control<TxValues>;
	accounts: AccountChoice[];
	crossCurrency: boolean;
	onPick: (side: TransferSide, id: string) => void;
	onSwap: () => void;
}) {
	const [fromId, toId] = useWatch({ control, name: ["account_id", "to_account_id"] });
	const { errors } = useFormState({
		control,
		name: ["account_id", "to_account_id", "amount", "to_amount"],
	});
	const [picking, setPicking] = useState<TransferSide | null>(null);
	const [turns, setTurns] = useState(0);
	// the slab's outline is drawn in px, so it needs the block's width (and follows it)
	const block = useRef<HTMLDivElement | null>(null);
	const [width, setWidth] = useState(0);
	useLayoutEffect(() => {
		const el = block.current;
		if (!el) return undefined;
		setWidth(el.getBoundingClientRect().width);
		const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
		observer.observe(el);
		return () => observer.disconnect();
	}, []);
	const chips = useRef<Record<TransferSide, HTMLButtonElement | null>>({ from: null, to: null });
	const chosen = {
		from: accounts.find((a) => a.id === fromId),
		to: accounts.find((a) => a.id === toId),
	};
	const problems = [errors.account_id, errors.to_account_id, errors.amount, errors.to_amount]
		.map((e) => e?.message)
		.filter(Boolean);

	function close() {
		const side = picking;
		setPicking(null);
		// the pill the list grew from gets the keyboard back
		if (side) requestAnimationFrame(() => chips.current[side]?.focus());
	}

	return (
		<>
			<Box ref={block} sx={{ position: "relative", height: BLOCK }}>
				{SIDES.map((side, index) => {
					const open = picking === side;
					const squeezed = picking !== null && !open;
					const account = chosen[side];
					return (
						<Box
							key={side}
							role="group"
							aria-label={ROLE[side]}
							sx={{
								position: "absolute",
								left: 0,
								right: 0,
								// shut: its place in the block; open: the whole block
								top: open ? 0 : index * (SLAB + GAP),
								height: open ? BLOCK : SLAB,
								zIndex: open ? 3 : 1,
								overflow: "hidden",
								borderRadius: `${CORNER}px`,
								// shut, the slab is its outline (below); open, it is a plain rounded block
								bgcolor: open ? "var(--md-sys-color-surface-container-low)" : "transparent",
								boxShadow: open ? "inset 0 0 0 1px var(--md-sys-color-outline-variant)" : "none",
								opacity: squeezed ? 0 : 1,
								pointerEvents: squeezed ? "none" : "auto",
								transition: `top ${SPRING.spatialFast}, height ${SPRING.spatialFast}, opacity ${SPRING.effectsFast}`,
								"@media (prefers-reduced-motion: reduce)": { transition: "opacity 100ms linear" },
							}}
						>
							{!open && width > 0 && (
								// the slab's edge by the arrow eases round it, the border following
								<svg
									aria-hidden
									width={width}
									height={SLAB}
									style={{
										position: "absolute",
										left: 0,
										top: 0,
										pointerEvents: "none",
										fill: "var(--md-sys-color-surface-container-low)",
										stroke: "var(--md-sys-color-outline-variant)",
										strokeWidth: 1,
									}}
								>
									<path
										d={slabPath({
											width,
											height: SLAB,
											radius: CORNER,
											bite: BITE,
											fillet: FILLET,
											seam: GAP / 2,
										})}
										transform={side === "to" ? `translate(0 ${SLAB}) scale(1 -1)` : undefined}
									/>
								</svg>
							)}
							<SlabFace
								side={side}
								open={open}
								account={account}
								control={control}
								crossCurrency={crossCurrency}
								chipRef={(el) => {
									chips.current[side] = el;
								}}
								onChoose={() => setPicking(side)}
							/>
							{open && (
								<AccountList
									side={side}
									accounts={accounts}
									selected={side === "from" ? fromId : toId}
									onPick={(id) => {
										onPick(side, id);
										close();
									}}
									onClose={close}
								/>
							)}
						</Box>
					);
				})}
				<IconButton
					aria-label="Swap the accounts"
					title="Swap the accounts"
					disabled={!fromId && !toId}
					onClick={() => {
						onSwap();
						setTurns((t) => t + 1);
					}}
					sx={{
						position: "absolute",
						left: "50%",
						top: SLAB + GAP / 2 - ARROW / 2,
						width: ARROW,
						height: ARROW,
						ml: `-${ARROW / 2}px`,
						// a circle in a round pocket: not the theme's corner morph
						"&, &:hover, &:focus-visible": { borderRadius: "50%" },
						zIndex: 2,
						bgcolor: "var(--md-sys-color-surface-container-highest)",
						// MUI makes a disabled icon button see-through, which lets the seam run across
						// it. The fill stays solid; only the arrow dims (not `opacity`, which fades the fill too).
						"&.Mui-disabled": {
							bgcolor: "var(--md-sys-color-surface-container-highest)",
							color: "color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent)",
						},
						// goes while a list is open
						opacity: picking ? 0 : 1,
						transform: picking ? "scale(.5)" : "none",
						pointerEvents: picking ? "none" : "auto",
						transition: `opacity ${SPRING.effectsFast}, transform ${SPRING.spatialFast}`,
						"& svg": {
							transform: `rotate(${turns * 360}deg)`,
							transition: "transform var(--spring-spatial-bouncy-dur) var(--spring-spatial-bouncy)",
						},
						"@media (prefers-reduced-motion: reduce)": { "& svg": { transition: "none" } },
					}}
				>
					<ArrowDownwardIcon />
				</IconButton>
			</Box>
			{(problems.length > 0 || crossCurrency) && (
				<Box sx={{ mt: 0.75, px: 0.5 }}>
					{problems.map((message) => (
						<FormHelperText key={message} error>
							{message}
						</FormHelperText>
					))}
					{crossCurrency && problems.length === 0 && (
						<FormHelperText>Different currencies: type what arrived in the To slab.</FormHelperText>
					)}
				</Box>
			)}
		</>
	);
}

/** What a slab shows when it is shut: its role and the account's number and balance, the amount,
 * and the pill in the corner that opens the list. */
function SlabFace({
	side,
	open,
	account,
	control,
	crossCurrency,
	chipRef,
	onChoose,
}: {
	side: TransferSide;
	open: boolean;
	account: AccountChoice | undefined;
	control: Control<TxValues>;
	crossCurrency: boolean;
	chipRef: Ref<HTMLButtonElement>;
	onChoose: () => void;
}) {
	// the paying slab holds the amount typed; the receiving one shows the same amount, or, between
	// two currencies, takes what arrived
	const amount = useWatch({ control, name: "amount" });
	const typed = side === "from" || crossCurrency;
	return (
		<Box
			aria-hidden={open}
			sx={{
				position: "absolute",
				inset: 0,
				p: 2,
				display: "flex",
				flexDirection: "column",
				// gone before the list appears, back after it has gone, so the two never show at once
				opacity: open ? 0 : 1,
				pointerEvents: open ? "none" : "auto",
				transition: open ? "opacity 100ms ease-out" : `opacity ${SPRING.effectsFast} 140ms`,
			}}
		>
			<Box
				sx={{ display: "flex", justifyContent: "space-between", gap: 2, color: "text.secondary" }}
			>
				<Typography variant="body2">{ROLE[side]}</Typography>
				{account && (
					<Typography
						variant="caption"
						noWrap
						sx={{ fontVariantNumeric: "tabular-nums", pt: 0.25 }}
					>
						{numberAndBalance(account)}
					</Typography>
				)}
			</Box>
			<Box sx={{ flex: 1 }} />
			<Box sx={{ display: "flex", alignItems: "flex-end", gap: 1.5 }}>
				<Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 1 }}>
					{/* the currency first, small, as amounts read elsewhere in the app */}
					{account && (
						<Typography sx={{ color: "text.secondary", fontSize: 16, flexShrink: 0 }}>
							{account.currency}
						</Typography>
					)}
					{typed ? (
						<Controller
							name={side === "from" ? "amount" : "to_amount"}
							control={control}
							render={({ field: { ref, ...field } }) => (
								<InputBase
									{...field}
									inputRef={ref}
									value={field.value ?? ""}
									placeholder="0"
									autoFocus={side === "from"}
									inputProps={{
										inputMode: "decimal",
										"aria-label": side === "from" ? "Amount" : "What arrived",
									}}
									sx={{ flex: 1, minWidth: 0, fontSize: 30, fontWeight: 500, lineHeight: 1.2 }}
								/>
							)}
						/>
					) : (
						<Typography
							sx={{
								fontSize: 30,
								fontWeight: 500,
								lineHeight: 1.2,
								color: amount ? "text.primary" : "text.disabled",
								fontVariantNumeric: "tabular-nums",
							}}
						>
							{amount || "0"}
						</Typography>
					)}
				</Box>
				<ButtonBase
					ref={chipRef}
					onClick={onChoose}
					aria-haspopup="listbox"
					aria-expanded={open}
					aria-label={`${ROLE[side]}: ${account?.name ?? "no account"}. Choose another account`}
					focusRipple
					sx={{
						flexShrink: 0,
						maxWidth: "50%",
						display: "inline-flex",
						alignItems: "center",
						gap: 0.75,
						height: 32,
						px: 1.5,
						fontSize: 13,
						fontWeight: 500,
						borderRadius: "16px",
						bgcolor: "color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent)",
					}}
				>
					<Box
						component="span"
						sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
					>
						{account?.name ?? "Choose"}
					</Box>
					<ExpandMoreIcon sx={{ fontSize: 18, color: "text.secondary" }} />
				</ButtonBase>
			</Box>
		</Box>
	);
}

/** The accounts to choose from, drawn inside a slab that has grown to cover the block. Arrow keys
 * move between them, Enter picks, Escape closes it (and only it: the dialog stays). */
function AccountList({
	side,
	accounts,
	selected,
	onPick,
	onClose,
}: {
	side: TransferSide;
	accounts: AccountChoice[];
	selected: string;
	onPick: (id: string) => void;
	onClose: () => void;
}) {
	const list = useRef<HTMLDivElement | null>(null);
	const options = () => [...(list.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];

	// the account already picked (else the first) takes the keyboard when the list opens
	useEffect(() => {
		const frame = requestAnimationFrame(() => {
			const all = [...(list.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
			(all.find((o) => o.getAttribute("aria-selected") === "true") ?? all[0])?.focus();
		});
		return () => cancelAnimationFrame(frame);
	}, []);

	function onKeyDown(e: KeyboardEvent<HTMLElement>) {
		if (e.key === "Escape") {
			e.stopPropagation();
			onClose();
			return;
		}
		if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
		e.preventDefault();
		const all = options();
		const at = all.findIndex((o) => o === document.activeElement);
		const next = e.key === "ArrowDown" ? Math.min(at + 1, all.length - 1) : Math.max(at - 1, 0);
		all[next]?.focus();
	}

	return (
		<Box
			onKeyDown={onKeyDown}
			sx={{
				position: "absolute",
				inset: 0,
				display: "flex",
				flexDirection: "column",
				p: 1,
				// fades in as the slab finishes growing
				animation: `listIn ${SPRING.effects} 140ms both`,
				"@keyframes listIn": { from: { opacity: 0 }, to: { opacity: 1 } },
				"@media (prefers-reduced-motion: reduce)": { animation: "none" },
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pl: 1.5 }}>
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					{ROLE[side]}
				</Typography>
				<IconButton size="small" aria-label="Close the list" onClick={onClose}>
					<CloseIcon fontSize="small" />
				</IconButton>
			</Box>
			<Box
				ref={list}
				role="listbox"
				aria-label={`${ROLE[side]} account`}
				sx={{
					flex: 1,
					minHeight: 0,
					overflowY: "auto",
					display: "grid",
					alignContent: "start",
					gap: 0.25,
				}}
			>
				{accounts.map((a) => (
					<ButtonBase
						key={a.id}
						role="option"
						aria-selected={a.id === selected}
						onClick={() => onPick(a.id)}
						sx={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							gap: 1.5,
							textAlign: "left",
							minHeight: 52,
							px: 1.5,
							borderRadius: "var(--shape-md)",
							"&:hover, &:focus-visible": {
								bgcolor: "color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent)",
							},
						}}
					>
						<Box sx={{ minWidth: 0 }}>
							<Typography noWrap sx={{ fontWeight: 500 }}>
								{a.name}{" "}
								<Typography component="span" variant="caption" color="text.secondary">
									{a.currency}
								</Typography>
							</Typography>
							<Typography variant="caption" color="text.secondary" noWrap component="div">
								{numberAndBalance(a)}
							</Typography>
						</Box>
						{a.id === selected && <CheckIcon fontSize="small" />}
					</ButtonBase>
				))}
				{accounts.length === 0 && (
					<Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
						No accounts to choose from.
					</Typography>
				)}
			</Box>
		</Box>
	);
}
