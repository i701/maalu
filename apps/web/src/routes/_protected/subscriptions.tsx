import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import ConfirmDelete from "#/components/ConfirmDelete";
import PageHeader from "#/components/PageHeader";
import TableCard from "#/components/TableCard";
import RefreshButton from "#/components/RefreshButton";
import SubscriptionForm from "#/components/SubscriptionForm";
import { daysUntil, formatDate, formatInterval, formatMoney } from "#/lib/format";
import { unwrap } from "#/lib/unwrap";
import { listCurrenciesFn } from "#/server/currencies";
import {
	deleteSubscriptionFn,
	getSubscriptionSummaryFn,
	listSubscriptionsFn,
} from "#/server/subscriptions";
import { listVendorsFn } from "#/server/vendors";
import { SUBSCRIPTION_STATUS_LABELS, type Subscription } from "#/types/api";

export const Route = createFileRoute("/_protected/subscriptions")({
	loader: async () => {
		const [subscriptions, summary, vendors, currencies] = await Promise.all([
			listSubscriptionsFn(),
			getSubscriptionSummaryFn(),
			listVendorsFn(),
			listCurrenciesFn(),
		]);
		return {
			subscriptions: unwrap(subscriptions),
			summary: unwrap(summary),
			vendors: unwrap(vendors),
			currencies,
		};
	},
	component: SubscriptionsPage,
});

const dash = (
	<Typography component="span" sx={{ color: "text.disabled" }}>
		—
	</Typography>
);

function DueChip({ sub }: { sub: Subscription }) {
	if (!sub.next_due_date) return dash;
	const days = daysUntil(sub.next_due_date);
	if (sub.is_overdue) {
		return <Chip size="small" color="error" label={`Overdue by ${Math.abs(days)}d`} />;
	}
	if (days === 0) return <Chip size="small" color="warning" label="Due today" />;
	if (days <= 7) return <Chip size="small" color="warning" label={`Due in ${days}d`} />;
	return <Chip size="small" variant="outlined" label={`In ${days}d`} />;
}

const statusColor = { active: "success", paused: "warning", cancelled: "default" } as const;

function SubscriptionsPage() {
	const { subscriptions, summary, vendors, currencies } = Route.useLoaderData();
	const { user } = Route.useRouteContext();
	const [editing, setEditing] = useState<Subscription | "new" | null>(null);
	const [deleting, setDeleting] = useState<Subscription | null>(null);

	return (
		<>
			<PageHeader
				title="Subscriptions"
				description="Recurring charges. Link a transaction to a subscription to mark it paid."
				action={
					<Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing("new")}>
						Add subscription
					</Button>
				}
			/>

			<Grid container spacing={2} sx={{ mb: 3 }}>
				<Grid size={{ xs: 12, sm: 6, md: 4 }}>
					<Card>
						<CardContent>
							<Typography variant="body2" sx={{ color: "text.secondary" }}>
								Monthly total
							</Typography>
							<Typography variant="h2" component="p" sx={{ mt: 0.5 }}>
								{formatMoney(summary.monthly_base_total, summary.currency)}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid size={{ xs: 12, sm: 6, md: 4 }}>
					<Card>
						<CardContent>
							<Typography variant="body2" sx={{ color: "text.secondary" }}>
								Active subscriptions
							</Typography>
							<Typography variant="h2" component="p" sx={{ mt: 0.5 }}>
								{summary.active_count}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			<TableCard>
				<Stack
					direction="row"
					sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1 }}
				>
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						{subscriptions.length} {subscriptions.length === 1 ? "subscription" : "subscriptions"}
					</Typography>
					<RefreshButton />
				</Stack>

				{subscriptions.length === 0 ? (
					<Typography sx={{ textAlign: "center", py: 8, px: 2, color: "text.secondary" }}>
						No subscriptions yet. Add one, or use "Make subscription" on a transaction.
					</Typography>
				) : (
					<TableContainer>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>Name</TableCell>
									<TableCell>Cost</TableCell>
									<TableCell>Next due</TableCell>
									<TableCell>Status</TableCell>
									<TableCell align="right">Per month</TableCell>
									<TableCell align="right" sx={{ width: 100 }} />
								</TableRow>
							</TableHead>
							<TableBody>
								{subscriptions.map((s) => (
									<TableRow key={s.id} hover>
										<TableCell>
											<Typography variant="body2" sx={{ fontWeight: 500 }}>
												{s.name}
											</Typography>
											<Typography variant="caption" sx={{ color: "text.secondary" }}>
												{[s.vendor?.name, s.category].filter(Boolean).join(" · ")}
											</Typography>
										</TableCell>
										<TableCell sx={{ whiteSpace: "nowrap" }}>
											<Typography variant="body2">
												{formatMoney(s.amount, s.currency)}{" "}
												<Typography
													component="span"
													variant="caption"
													sx={{ color: "text.secondary" }}
												>
													{formatInterval(s.interval_unit, s.interval_count)}
												</Typography>
											</Typography>
											{s.currency !== user.base_currency && (
												<Typography variant="caption" sx={{ color: "text.secondary" }}>
													≈ {formatMoney(s.base_amount, user.base_currency)} @{" "}
													{Number(s.exchange_rate)}
												</Typography>
											)}
										</TableCell>
										<TableCell sx={{ whiteSpace: "nowrap" }}>
											{s.next_due_date ? (
												<Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
													<Typography variant="body2">{formatDate(s.next_due_date)}</Typography>
													<DueChip sub={s} />
												</Stack>
											) : (
												dash
											)}
										</TableCell>
										<TableCell>
											<Chip
												size="small"
												color={statusColor[s.status]}
												label={SUBSCRIPTION_STATUS_LABELS[s.status]}
											/>
										</TableCell>
										<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
											{formatMoney(s.monthly_base_cost, user.base_currency)}
										</TableCell>
										<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
											<Tooltip title="Edit">
												<IconButton aria-label="Edit" size="small" onClick={() => setEditing(s)}>
													<EditOutlinedIcon fontSize="small" />
												</IconButton>
											</Tooltip>
											<Tooltip title="Delete">
												<IconButton aria-label="Delete" size="small" onClick={() => setDeleting(s)}>
													<DeleteOutlineIcon fontSize="small" />
												</IconButton>
											</Tooltip>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				)}
			</TableCard>

			{editing && (
				<SubscriptionForm
					subscription={editing === "new" ? undefined : editing}
					vendors={vendors}
					currencies={currencies}
					baseCurrency={user.base_currency}
					onClose={() => setEditing(null)}
				/>
			)}
			{deleting && (
				<ConfirmDelete
					title="Delete subscription"
					message={`Delete "${deleting.name}"? Its transactions are kept and just lose the subscription link.`}
					onConfirm={() => deleteSubscriptionFn({ data: { id: deleting.id } })}
					onClose={() => setDeleting(null)}
				/>
			)}
		</>
	);
}
