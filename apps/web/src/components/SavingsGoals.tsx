import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { staggerChildren } from "#/lib/motion";
import { deleteGoalFn } from "#/server/goals";
import type { Account, Goal } from "#/types/api";
import ConfirmDelete from "./ConfirmDelete";
import GoalCard from "./GoalCard";
import GoalEntryDialog from "./GoalEntryDialog";
import GoalForm from "./GoalForm";

/** The budget page's savings section: a card per goal, and the dialogs to add, edit, set money
 * aside for or delete one. Owns its own dialog state so the page above doesn't re-render. */
export default function SavingsGoals({
	goals,
	accounts,
	currency,
}: {
	goals: Goal[];
	accounts: Account[];
	currency: string;
}) {
	const [editing, setEditing] = useState<Goal | "new" | null>(null);
	const [adding, setAdding] = useState<Goal | null>(null);
	const [deleting, setDeleting] = useState<Goal | null>(null);

	return (
		<Box sx={{ mt: 4 }}>
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
				<Box>
					<Typography variant="h2" sx={{ fontSize: 20 }}>
						Savings goals
					</Typography>
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						Save toward something, like a trip, and see what each month needs.
					</Typography>
				</Box>
				<Button startIcon={<AddIcon />} onClick={() => setEditing("new")}>
					Add goal
				</Button>
			</Box>

			{goals.length > 0 && (
				<Box
					sx={{
						display: "grid",
						gap: 2,
						gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
						...staggerChildren(),
					}}
				>
					{goals.map((goal) => (
						<GoalCard
							key={goal.id}
							goal={goal}
							onAddMoney={setAdding}
							onEdit={setEditing}
							onDelete={setDeleting}
						/>
					))}
				</Box>
			)}

			{editing && (
				<GoalForm
					goal={editing === "new" ? undefined : editing}
					goals={goals}
					accounts={accounts}
					currency={currency}
					onClose={() => setEditing(null)}
				/>
			)}
			{adding && <GoalEntryDialog goal={adding} onClose={() => setAdding(null)} />}
			{deleting && (
				<ConfirmDelete
					title="Delete goal"
					message={`Delete the "${deleting.name}" goal? Your accounts and transactions aren't affected.`}
					onConfirm={() => deleteGoalFn({ data: { id: deleting.id } })}
					onClose={() => setDeleting(null)}
				/>
			)}
		</Box>
	);
}
