import AddIcon from "@mui/icons-material/Add";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import BudgetLineCard from "#/components/BudgetLineCard";
import BudgetLineForm from "#/components/BudgetLineForm";
import BudgetSettingsDialog from "#/components/BudgetSettingsDialog";
import BudgetSummary from "#/components/BudgetSummary";
import ConfirmDelete from "#/components/ConfirmDelete";
import EmptyState from "#/components/EmptyState";
import PageHeader from "#/components/PageHeader";
import PendingOverlay from "#/components/PendingOverlay";
import Symbol from "#/components/Symbol";
import { addDays } from "#/lib/budget";
import { formatDate } from "#/lib/format";
import { staggerChildren } from "#/lib/motion";
import { unwrap } from "#/lib/unwrap";
import { deleteBudgetLineFn, getBudgetFn } from "#/server/budget";
import { listCategoriesFn } from "#/server/categories";
import type { BudgetLine } from "#/types/api";

const searchSchema = z.object({
	// Any day inside the period to show; leave it out for the current period.
	on: z.iso.date().optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/budget")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }) => {
		const [budget, categories] = await Promise.all([
			getBudgetFn({ data: { on: deps.on } }),
			listCategoriesFn(),
		]);
		return { budget: unwrap(budget), categories: unwrap(categories) };
	},
	component: BudgetPage,
});

function BudgetPage() {
	const { budget, categories } = Route.useLoaderData();
	const navigate = Route.useNavigate();
	const [editing, setEditing] = useState<BudgetLine | "new" | null>(null);
	const [deleting, setDeleting] = useState<BudgetLine | null>(null);
	const [settings, setSettings] = useState(false);

	const { period } = budget;
	const goTo = (on: string | undefined) => navigate({ search: { on }, replace: true });
	const periodLabel = `${formatDate(period.start)} – ${formatDate(period.end)}`;

	return (
		<>
			<PageHeader
				title="Budget"
				symbol="savings"
				accent="amber"
				shape={2}
				stats={[
					{ symbol: "calendar_month", label: periodLabel },
					...(budget.attention > 0
						? [
								{
									symbol: "warning",
									label: `${budget.attention} ${budget.attention === 1 ? "limit needs" : "limits need"} attention`,
								},
							]
						: []),
				]}
				description="Spending limits per category. You're warned before you reach them."
				action={
					<Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing("new")}>
						Add limit
					</Button>
				}
			/>

			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 1,
					mb: 2,
					flexWrap: "wrap",
				}}
			>
				<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
					<IconButton aria-label="Previous period" onClick={() => goTo(addDays(period.start, -1))}>
						<Symbol name="chevron_left" size={24} />
					</IconButton>
					<Typography
						sx={{ fontWeight: 500, minWidth: 180, textAlign: "center" }}
						aria-live="polite"
					>
						{periodLabel}
					</Typography>
					<IconButton aria-label="Next period" onClick={() => goTo(addDays(period.end, 1))}>
						<Symbol name="chevron_right" size={24} />
					</IconButton>
					{!period.is_current && (
						<Button color="inherit" onClick={() => goTo(undefined)}>
							Current period
						</Button>
					)}
				</Box>
				<IconButton
					aria-label="Budget settings"
					title="Budget settings"
					onClick={() => setSettings(true)}
				>
					<Symbol name="tune" size={24} />
				</IconButton>
			</Box>

			<PendingOverlay>
				{budget.lines.length === 0 ? (
					<EmptyState firstRun symbol="savings" accent="amber" shape={2}>
						No limits yet. Add one for a category, such as Groceries, and you'll see how much of it
						you've spent and get a warning when you're close.
					</EmptyState>
				) : (
					<>
						<BudgetSummary budget={budget} />
						<Box
							sx={{
								display: "grid",
								gap: 2,
								gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
								...staggerChildren(),
							}}
						>
							{budget.lines.map((line) => (
								<BudgetLineCard
									key={line.id}
									line={line}
									currency={budget.currency}
									onEdit={setEditing}
									onDelete={setDeleting}
								/>
							))}
						</Box>
					</>
				)}
			</PendingOverlay>

			{editing && (
				<BudgetLineForm
					line={editing === "new" ? undefined : editing}
					budget={budget}
					categories={categories}
					onClose={() => setEditing(null)}
				/>
			)}
			{settings && <BudgetSettingsDialog budget={budget} onClose={() => setSettings(false)} />}
			{deleting && (
				<ConfirmDelete
					title="Delete limit"
					message={`Delete the "${deleting.name}" limit? Your transactions aren't affected.`}
					onConfirm={() => deleteBudgetLineFn({ data: { id: deleting.id } })}
					onClose={() => setDeleting(null)}
				/>
			)}
		</>
	);
}
