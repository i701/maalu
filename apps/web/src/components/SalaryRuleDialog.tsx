import { zodResolver } from "@hookform/resolvers/zod";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { createSalaryRuleFn, ruleValue, updateSalaryRuleFn } from "#/server/salary";
import type { Account, Goal, SalaryRule } from "#/types/api";
import FormDialog from "./FormDialog";
import FormTextField from "./FormTextField";
import { useNotify } from "./Notify";

/** A new rule needs its account or goal; a percent is at most the whole salary. */
const ruleSchema = (isNew: boolean) =>
	z
		.object({
			target: z.enum(["account", "goal"]),
			target_id: z.string(),
			mode: z.enum(["percent", "fixed"]),
			value: ruleValue,
			auto: z.boolean(),
		})
		.superRefine((v, ctx) => {
			if (isNew && !v.target_id)
				ctx.addIssue({ code: "custom", path: ["target_id"], message: `Choose the ${v.target}` });
			if (v.mode === "percent" && Number(v.value) > 100)
				ctx.addIssue({ code: "custom", path: ["value"], message: "At most 100 percent" });
		});
type Values = z.input<ReturnType<typeof ruleSchema>>;

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
	const { control, handleSubmit, setValue } = useForm<Values>({
		resolver: zodResolver(ruleSchema(!rule)),
		defaultValues: {
			target: "account",
			target_id: "",
			mode: rule?.mode ?? "percent",
			value: rule ? String(Number(rule.value)) : "",
			auto: rule?.auto ?? false,
		},
	});
	const [target, mode, auto] = useWatch({ control, name: ["target", "mode", "auto"] });

	const taken = new Set(rules.map((r) => r.account_id ?? r.goal_id));
	const choices = (target === "account" ? accounts : goals).filter((t) => !taken.has(t.id));

	async function submit({ target_id: targetId, value }: Values) {
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
			onSubmit={handleSubmit(submit)}
			sheet={sheet}
			maxWidth="xs"
		>
			<Stack spacing={2.5}>
				{!rule && (
					<>
						<ToggleButtonGroup
							exclusive
							fullWidth
							size="small"
							value={target}
							onChange={(_, next: Values["target"] | null) => {
								if (!next) return;
								setValue("target", next);
								setValue("target_id", "");
							}}
							aria-label="Account or goal"
						>
							<ToggleButton value="account">An account</ToggleButton>
							<ToggleButton value="goal">A goal</ToggleButton>
						</ToggleButtonGroup>
						<FormTextField
							control={control}
							name="target_id"
							select
							fullWidth
							required
							label={target === "account" ? "Account" : "Goal"}
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
						</FormTextField>
					</>
				)}
				<ToggleButtonGroup
					exclusive
					fullWidth
					size="small"
					value={mode}
					onChange={(_, next: Values["mode"] | null) => next && setValue("mode", next)}
					aria-label="A share or a fixed amount"
				>
					<ToggleButton value="percent">A share of the salary</ToggleButton>
					<ToggleButton value="fixed">A fixed amount</ToggleButton>
				</ToggleButtonGroup>
				<FormTextField
					control={control}
					name="value"
					fullWidth
					required
					label={mode === "percent" ? "Percent of the salary" : "Amount"}
					slotProps={{ htmlInput: { inputMode: "decimal" } }}
					helperText={
						mode === "percent"
							? "For example 10 for a tenth of each salary"
							: "In the currency of the salary"
					}
				/>
				<Box>
					<FormControlLabel
						control={
							<Controller
								name="auto"
								control={control}
								render={({ field }) => (
									<Switch checked={field.value} onChange={(_, on) => field.onChange(on)} />
								)}
							/>
						}
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
