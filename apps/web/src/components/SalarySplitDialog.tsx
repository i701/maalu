import Alert from "@mui/material/Alert";
import Money from "#/components/Money";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
	madeTotal,
	splitLines,
	splitRequest,
	splitTotals,
	type SplitLine,
	type SplitTotals,
} from "#/lib/salary";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { applySalarySplitFn, getSalarySplitFn, undoSalarySplitFn } from "#/server/salary";
import type { SalarySplitPlan } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";

/** The plan for a salary, fetched when the dialog opens, and the lines being edited. */
function useSalaryPlan(transactionId: string) {
	const [plan, setPlan] = useState<SalarySplitPlan | null>(null);
	const [lines, setLines] = useState<SplitLine[]>([]);
	const [failed, setFailed] = useState<string | null>(null);

	useEffect(() => {
		let current = true;
		void getSalarySplitFn({ data: { id: transactionId } }).then((res) => {
			if (!current) return;
			if (!res.ok) return setFailed(res.error);
			setPlan(res.data);
			setLines(splitLines(res.data));
		});
		return () => {
			current = false;
		};
	}, [transactionId]);

	const edit = (key: string, change: Partial<SplitLine>) =>
		setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...change } : l)));
	return { plan, lines, failed, edit };
}

function MadeList({ plan }: { plan: SalarySplitPlan }) {
	return (
		<Box component="ul" sx={{ m: 0, pl: 2.5 }}>
			{(plan.made ?? []).map((m) => (
				<li key={m.id}>
					<Typography variant="body2">
						{m.target_name}: <Money amount={m.amount} currency={plan.currency} />{" "}
						{m.kind === "transfer" ? "moved" : "set aside"}
					</Typography>
				</li>
			))}
		</Box>
	);
}

function LineRow({
	line,
	onChange,
}: {
	line: SplitLine;
	onChange: (c: Partial<SplitLine>) => void;
}) {
	return (
		<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
			<FormControlLabel
				sx={{ minWidth: 0, flex: 1, m: 0 }}
				control={
					<Checkbox
						checked={line.on}
						disabled={line.reason !== null}
						onChange={(_, on) => onChange({ on })}
					/>
				}
				label={
					<Box sx={{ minWidth: 0 }}>
						<Typography noWrap sx={{ fontSize: 14, fontWeight: 500 }}>
							{line.name}
						</Typography>
						<Typography
							variant="caption"
							sx={{ color: line.reason && !line.done ? "error.main" : "text.secondary" }}
						>
							{line.reason ?? line.rule}
							{line.auto && !line.done && " · moves automatically"}
						</Typography>
					</Box>
				}
			/>
			<TextField
				size="small"
				label="Amount"
				value={line.amount}
				disabled={!line.on}
				onChange={(e) => onChange({ amount: e.target.value })}
				slotProps={{
					htmlInput: { inputMode: "decimal", "aria-label": `Amount for ${line.name}` },
				}}
				sx={{ width: 140 }}
			/>
		</Box>
	);
}

function ProposedLines({
	plan,
	lines,
	totals,
	edit,
}: {
	plan: SalarySplitPlan;
	lines: SplitLine[];
	totals: SplitTotals;
	edit: (key: string, change: Partial<SplitLine>) => void;
}) {
	if (lines.length === 0)
		return (
			<Typography variant="body2">
				You haven't set up any rules yet.{" "}
				<Link to="/settings">Choose how your salary is split</Link>
			</Typography>
		);
	return (
		<>
			{lines.map((line) => (
				<LineRow key={line.key} line={line} onChange={(c) => edit(line.key, c)} />
			))}
			{!totals.over && (
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					Moving <Money amount={totals.total} currency={plan.currency} />.{" "}
					<Money amount={totals.left} currency={plan.currency} /> stays in {plan.account_name}.
				</Typography>
			)}
			{totals.over && <Alert severity="error">These add up to more than the salary.</Alert>}
		</>
	);
}

/** The dialog's title: where this salary's split stands. */
const titleFor = (complete: boolean, someMade: boolean) =>
	complete
		? "This salary was split"
		: someMade
			? "Finish splitting this salary"
			: "Split this salary";

/** What is inside the dialog once the plan has loaded: what was made, what is left to approve. */
function SplitBody({
	plan,
	lines,
	totals,
	edit,
	onUndo,
}: {
	plan: SalarySplitPlan;
	lines: SplitLine[];
	totals: SplitTotals;
	edit: (key: string, change: Partial<SplitLine>) => void;
	onUndo: () => void;
}) {
	const complete = Boolean(plan.complete);
	const someMade = Boolean(plan.applied);
	return (
		<Box sx={{ display: "grid", gap: 1.5 }}>
			<Typography variant="body2" sx={{ color: "text.secondary" }}>
				<Money amount={plan.amount} currency={plan.currency} /> arrived in {plan.account_name}.
			</Typography>
			{someMade && (
				<>
					{!complete && (
						<Typography sx={{ fontWeight: 600, fontSize: 14 }}>Already made</Typography>
					)}
					<MadeList plan={plan} />
				</>
			)}
			{!complete && <ProposedLines plan={plan} lines={lines} totals={totals} edit={edit} />}
			{someMade && !complete && (
				<Button color="inherit" size="small" onClick={onUndo} sx={{ justifySelf: "start" }}>
					Undo what was made
				</Button>
			)}
		</Box>
	);
}

/**
 * Splits a salary between accounts and goals, using the rules in Settings. It opens with the
 * proposal: every line pre-filled and editable, nothing made until you confirm. Lines an automatic
 * rule already made are shown as made, and only the rest is left to approve. Once a salary has been
 * split it shows what was made and offers to undo it (the transfers go to the trash and the
 * set-asides are removed).
 */
export default function SalarySplitDialog({
	transactionId,
	onClose,
}: {
	transactionId: string;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const { plan, lines, failed, edit } = useSalaryPlan(transactionId);
	const totals = useMemo(
		() => (plan ? splitTotals(lines, plan.amount, madeTotal(plan)) : null),
		[plan, lines],
	);
	const complete = Boolean(plan?.complete);

	async function undo() {
		if (await run(() => undoSalarySplitFn({ data: { id: transactionId } }))) {
			notify("The split was undone");
			sheet.close();
		}
	}

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!plan) return;
		if (complete) return undo();
		const ok = await run(() =>
			applySalarySplitFn({ data: { id: transactionId, items: splitRequest(lines) } }),
		);
		if (ok) {
			notify("Salary split");
			sheet.close();
		}
	}

	const canSubmit = Boolean(
		plan && (complete || (totals && !totals.over && !totals.invalid && totals.count > 0)),
	);
	return (
		<FormDialog
			title={titleFor(complete, Boolean(plan?.applied))}
			error={failed ?? error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
			submitLabel={complete ? "Undo the split" : "Make the split"}
			submitDisabled={!canSubmit}
		>
			{plan && totals ? (
				<SplitBody plan={plan} lines={lines} totals={totals} edit={edit} onUndo={undo} />
			) : (
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					{failed ? "" : "Working out the split…"}
				</Typography>
			)}
		</FormDialog>
	);
}
