import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactElement } from "react";
import { budgetDemo, planDemo, salaryRulesDemo, statementDemo } from "#/lib/docs/demo-data";
import { DEMO_IDS, type DemoId } from "#/lib/docs/demo-ids";
import { planDays } from "#/lib/plan";
import CardStatementPanel from "../account/CardStatementPanel";
import BudgetLineCard from "../BudgetLineCard";
import BudgetSummary from "../BudgetSummary";
import PlanAgenda from "../plan/PlanAgenda";
import SalaryRulesCard from "../SalaryRulesCard";

const noop = () => {};

/** The bills by day, in the card the Month plan page draws them in. */
function PlanExample() {
	return (
		<Box
			sx={{
				p: 2.5,
				borderRadius: "var(--shape-xl)",
				bgcolor: "var(--md-sys-color-surface-container-low)",
			}}
		>
			<Typography variant="h2" sx={{ fontSize: 18, fontWeight: 600, mb: 1.5 }}>
				Bills by day
			</Typography>
			<PlanAgenda
				days={planDays(planDemo)}
				today={planDemo.today}
				currency={planDemo.currency}
				onPay={noop}
			/>
		</Box>
	);
}

/** The budget's summary and its limit cards, as the Budget page draws them. */
function BudgetExample() {
	return (
		<Box sx={{ display: "grid", gap: 2 }}>
			<BudgetSummary budget={budgetDemo} />
			<Box
				sx={{
					display: "grid",
					gap: 2,
					gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
				}}
			>
				{budgetDemo.lines.map((line) => (
					<BudgetLineCard
						key={line.id}
						line={line}
						currency={budgetDemo.currency}
						onEdit={noop}
						onDelete={noop}
					/>
				))}
			</Box>
		</Box>
	);
}

/** The live examples, by id. Each is the real component of the app drawn with made-up data. A new
 * id needs an entry in `demo-ids.ts` and one here (the type makes both required). */
const DEMOS: Record<DemoId, () => ReactElement> = {
	"card-statement": () => <CardStatementPanel statement={statementDemo} onRepay={noop} />,
	"plan-agenda": () => <PlanExample />,
	"salary-rules": () => (
		<SalaryRulesCard rules={salaryRulesDemo} accounts={[]} goals={[]} currency="MVR" />
	),
	"budget-limits": () => <BudgetExample />,
};

export const isDemo = (id: string): id is DemoId => (DEMO_IDS as readonly string[]).includes(id);

export default DEMOS;
