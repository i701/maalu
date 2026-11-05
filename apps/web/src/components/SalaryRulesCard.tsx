import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { ruleText, rulesSummary } from "#/lib/salary";
import type { Account, Goal, SalaryRule } from "#/types/api";
import { ACCENT } from "#/lib/m3";
import ConfirmDelete from "./ConfirmDelete";
import SalaryRuleDialog from "./SalaryRuleDialog";
import TonalChip from "./TonalChip";
import { deleteSalaryRuleFn } from "#/server/salary";

/** Settings: what each account or goal gets when a salary is split. Nothing happens by itself: when
 * a salary is added, Maalu proposes the split and you confirm it. */
export default function SalaryRulesCard({
	rules,
	accounts,
	goals,
	currency,
}: {
	rules: SalaryRule[];
	accounts: Account[];
	goals: Goal[];
	/** The base currency, which fixed amounts are shown in */
	currency: string;
}) {
	const [editing, setEditing] = useState<SalaryRule | "new" | null>(null);
	const [deleting, setDeleting] = useState<SalaryRule | null>(null);
	const summary = rulesSummary(rules, currency);

	return (
		<Card sx={{ maxWidth: 640 }}>
			<CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
				<Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
					<Box>
						<Typography variant="h2" sx={{ fontSize: 18, fontWeight: 600 }}>
							When my salary arrives
						</Typography>
						<Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
							Choose how much of each salary goes to which account or goal. When a salary arrives,
							its split waits on the Pending screen for you to approve, unless you switch a rule to
							move automatically.
						</Typography>
					</Box>
					<Button startIcon={<AddIcon />} variant="outlined" onClick={() => setEditing("new")}>
						Add rule
					</Button>
				</Box>

				{rules.length === 0 ? (
					<Typography variant="body2" sx={{ color: "text.secondary", mt: 2 }}>
						No rules yet.
					</Typography>
				) : (
					<Box
						component="ul"
						sx={{ listStyle: "none", m: 0, mt: 2, p: 0, display: "grid", gap: 1 }}
					>
						{rules.map((r) => (
							<Box
								component="li"
								key={r.id}
								sx={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									gap: 1,
								}}
							>
								<Box sx={{ minWidth: 0 }}>
									<Typography noWrap sx={{ fontWeight: 500, fontSize: 14 }}>
										{r.target_name}
										<Typography
											component="span"
											sx={{ ml: 1, fontSize: 12, color: "text.secondary" }}
										>
											{r.target_type === "goal" ? "goal" : "account"}
										</Typography>
									</Typography>
									<Typography variant="body2" sx={{ color: "text.secondary" }}>
										{ruleText(r, currency)}
										{r.auto && (
											<TonalChip
												accent={ACCENT.orange}
												label="Moves automatically"
												sx={{ ml: 1 }}
											/>
										)}
									</Typography>
								</Box>
								<Box sx={{ whiteSpace: "nowrap" }}>
									<IconButton
										aria-label={`Change the rule for ${r.target_name}`}
										title="Change"
										size="small"
										onClick={() => setEditing(r)}
									>
										<EditOutlinedIcon fontSize="small" />
									</IconButton>
									<IconButton
										aria-label={`Delete the rule for ${r.target_name}`}
										title="Delete"
										size="small"
										onClick={() => setDeleting(r)}
									>
										<DeleteOutlineIcon fontSize="small" />
									</IconButton>
								</Box>
							</Box>
						))}
					</Box>
				)}
				{summary && (
					<Typography variant="caption" component="p" sx={{ color: "text.secondary", mt: 2 }}>
						Together: {summary}. The rest stays where the salary arrives.
					</Typography>
				)}
			</CardContent>

			{editing && (
				<SalaryRuleDialog
					rule={editing === "new" ? undefined : editing}
					accounts={accounts}
					goals={goals}
					rules={rules}
					onClose={() => setEditing(null)}
				/>
			)}
			{deleting && (
				<ConfirmDelete
					title="Delete rule"
					message={`Stop sending part of each salary to ${deleting.target_name}? Splits you already made are not changed.`}
					onConfirm={() => deleteSalaryRuleFn({ data: { id: deleting.id } })}
					onClose={() => setDeleting(null)}
				/>
			)}
		</Card>
	);
}
