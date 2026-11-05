import Box from "@mui/material/Box";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import EmptyState from "#/components/EmptyState";
import PageHeader from "#/components/PageHeader";
import PendingOverlay from "#/components/PendingOverlay";
import PendingSplitCard from "#/components/pending/PendingSplitCard";
import { RouterLink } from "#/components/RouterLinks";
import SalarySplitHost from "#/components/SalarySplitHost";
import { useNotify } from "#/components/Notify";
import { splitLines, splitRequest } from "#/lib/salary";
import { unwrap } from "#/lib/unwrap";
import { useAction } from "#/lib/use-action";
import {
	applySalarySplitFn,
	dismissSalarySplitTaskFn,
	listSalarySplitTasksFn,
} from "#/server/salary";
import type { SalarySplitTask } from "#/types/api";

export const Route = createFileRoute("/_protected/pending")({
	loader: async () => ({ tasks: unwrap(await listSalarySplitTasksFn()) }),
	component: PendingPage,
});

function PendingPage() {
	const { tasks } = Route.useLoaderData();
	const { run, pending, error } = useAction();
	const notify = useNotify();
	const [reviewing, setReviewing] = useState<string | null>(null);

	/** Make the split as proposed: every line that can be made and has not been. */
	async function approve(task: SalarySplitTask) {
		const lines = splitLines(task.plan).filter((l) => !l.done);
		const items = splitRequest(lines);
		if (items.length === 0) return;
		if (await run(() => applySalarySplitFn({ data: { id: task.plan.salary_id, items } })))
			notify(`${task.plan.title} split`);
	}

	async function dismiss(task: SalarySplitTask) {
		if (await run(() => dismissSalarySplitTaskFn({ data: { id: task.id } })))
			notify("Dismissed. You can still split it from the Transactions page");
	}

	return (
		<>
			<PageHeader
				title="Pending"
				symbol="task_alt"
				accent="orange"
				shape={4}
				stats={
					tasks.length > 0 ? [{ symbol: "task_alt", label: `${tasks.length} waiting` }] : undefined
				}
				description="Salary splits waiting for you to approve. Nothing moves until you say so, unless a rule is set to move automatically."
			/>
			<PendingOverlay>
				{tasks.length === 0 ? (
					<EmptyState firstRun symbol="task_alt" accent="orange" shape={4}>
						Nothing is waiting. When a salary arrives and you have rules, its split shows up here
						for you to approve. <RouterLink to="/settings">Set up your rules</RouterLink> or read{" "}
						<RouterLink to="/docs/$slug" params={{ slug: "salary-split" }}>
							how it works
						</RouterLink>
						.
					</EmptyState>
				) : (
					<Box
						component="ul"
						sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 2, maxWidth: 720 }}
					>
						{tasks.map((task) => (
							<PendingSplitCard
								key={task.id}
								task={task}
								busy={pending}
								onApprove={approve}
								onReview={(t) => setReviewing(t.plan.salary_id)}
								onDismiss={dismiss}
							/>
						))}
					</Box>
				)}
				{error && (
					<Box role="alert" sx={{ color: "error.main", mt: 2 }}>
						{error}
					</Box>
				)}
			</PendingOverlay>
			<SalarySplitHost id={reviewing} onClose={() => setReviewing(null)} />
		</>
	);
}
