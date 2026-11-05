import FormControlLabel from "@mui/material/FormControlLabel";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createSalaryRuleFn, updateSalaryRuleFn } from "#/server/salary";
import type { Account, Goal, SalaryRule } from "#/types/api";
import FormDialog from "./FormDialog";
import { useNotify } from "./Notify";

type Mode = SalaryRule["mode"];
type Target = "account" | "goal";

/** Add what one account or goal gets when a salary is split, or change how much a rule sends (the
 * target of a rule is fixed: delete it to point somewhere else). */
export default function SalaryRuleDialog({
	rule,
	accounts,
	goals,
	rules,
	onClose,
}: {
	/** undefined = a new rule */
	rule?: SalaryRule;
	/** Accounts in use */
	accounts: Account[];
	goals: Goal[];
	/** Every rule, so a target that has one is not offered again */
	rules: SalaryRule[];
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const [target, setTarget] = useState<Target>("account");
	const [targetId, setTargetId] = useState("");
	const [mode, setMode] = useState<Mode>(rule?.mode ?? "percent");
	const [value, setValue] = useState(rule ? String(Number(rule.value)) : "");
	const [auto, setAuto] = useState(rule?.auto ?? false);

	const taken = new Set(rules.map((r) => r.account_id ?? r.goal_id));
	const choices = (target === "account" ? accounts : goals).filter((t) => !taken.has(t.id));

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const ok = await run(() =>
			rule
				? updateSalaryRuleFn({ data: { id: rule.id, mode, value, auto } })
				: createSalaryRuleFn({
						data: {
							mode,
							value,
							auto,
							...(target === "account" ? { account_id: targetId } : { goal_id: targetId }),
						},
					}),
		);
		if (ok) {
			notify(rule ? "Rule saved" : "Rule added");
			sheet.close();
		}
	}

	return (
		<FormDialog
			title={rule ? `Change the rule for ${rule.target_name}` : "Add a rule"}
			error={error}
			pending={pending}
			onSubmit={submit}
			sheet={sheet}
			maxWidth="xs"
			submitDisabled={!rule && !targetId}
		>
			<Stack spacing={2.5}>
				{!rule && (
					<>
						<ToggleButtonGroup
							exclusive
							fullWidth
							size="small"
							value={target}
							onChange={(_, next: Target | null) => {
								if (!next) return;
								setTarget(next);
								setTargetId("");
							}}
							aria-label="Account or goal"
						>
							<ToggleButton value="account">An account</ToggleButton>
							<ToggleButton value="goal">A goal</ToggleButton>
						</ToggleButtonGroup>
						<TextField
							select
							fullWidth
							required
							label={target === "account" ? "Account" : "Goal"}
							value={targetId}
							onChange={(e) => setTargetId(e.target.value)}
							disabled={choices.length === 0}
							helperText={
								choices.length === 0
									? `Every ${target} already has a rule, or you have none yet`
									: target === "account"
										? "The money is moved there from the account the salary arrives in"
										: "A goal that follows an account moves the money there; one you track by hand gets an amount set aside"
							}
						>
							{choices.map((t) => (
								<MenuItem key={t.id} value={t.id}>
									{t.name}
								</MenuItem>
							))}
						</TextField>
					</>
				)}
				<ToggleButtonGroup
					exclusive
					fullWidth
					size="small"
					value={mode}
					onChange={(_, next: Mode | null) => next && setMode(next)}
					aria-label="A share or a fixed amount"
				>
					<ToggleButton value="percent">A share of the salary</ToggleButton>
					<ToggleButton value="fixed">A fixed amount</ToggleButton>
				</ToggleButtonGroup>
				<TextField
					fullWidth
					required
					label={mode === "percent" ? "Percent of the salary" : "Amount"}
					value={value}
					onChange={(e) => setValue(e.target.value)}
					slotProps={{ htmlInput: { inputMode: "decimal" } }}
					helperText={
						mode === "percent"
							? "For example 10 for a tenth of each salary"
							: "In the currency of the salary"
					}
				/>
				<Box>
					<FormControlLabel
						control={<Switch checked={auto} onChange={(_, v) => setAuto(v)} />}
						label="Move it automatically when a salary arrives"
					/>
					<Typography variant="caption" component="p" sx={{ color: "text.secondary" }}>
						{auto
							? "Made as soon as a salary is posted, without asking."
							: "Off: it waits for your approval on the Pending screen."}
					</Typography>
				</Box>
			</Stack>
		</FormDialog>
	);
}
