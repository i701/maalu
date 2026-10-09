import AddIcon from "@mui/icons-material/Add";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import ConfirmDelete from "#/components/ConfirmDelete";
import MakeSubscriptionDialog from "#/components/MakeSubscriptionDialog";
import PageHeader from "#/components/PageHeader";
import TableCard from "#/components/TableCard";
import RefreshButton from "#/components/RefreshButton";
import TransactionForm from "#/components/TransactionForm";
import { formatDate, formatMoney } from "#/lib/format";
import { unwrap } from "#/lib/unwrap";
import { deleteTransactionFn, listTransactionsFn, PAGE_SIZE } from "#/server/transactions";
import { listCurrenciesFn } from "#/server/currencies";
import { listSubscriptionsFn } from "#/server/subscriptions";
import { listVendorsFn } from "#/server/vendors";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type Transaction } from "#/types/api";

const searchSchema = z.object({
	page: z.number().int().min(1).default(1).catch(1),
	payment_method: z.enum(PAYMENT_METHODS).optional().catch(undefined),
	vendor_id: z.uuid().optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/transactions")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }) => {
		const [transactions, vendors, subscriptions, currencies] = await Promise.all([
			listTransactionsFn({ data: deps }),
			listVendorsFn(),
			listSubscriptionsFn(),
			listCurrenciesFn(),
		]);
		return {
			...unwrap(transactions),
			vendors: unwrap(vendors),
			subscriptions: unwrap(subscriptions),
			currencies,
		};
	},
	component: TransactionsPage,
});

function TransactionsPage() {
	const { items, hasMore, vendors, subscriptions, currencies } = Route.useLoaderData();
	const { user } = Route.useRouteContext();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const [editing, setEditing] = useState<Transaction | "new" | null>(null);
	const [deleting, setDeleting] = useState<Transaction | null>(null);
	const [converting, setConverting] = useState<Transaction | null>(null);

	const filtered = Boolean(search.payment_method || search.vendor_id);

	return (
		<>
			<PageHeader
				title="Transactions"
				description={`Amounts are totalled in ${user.base_currency}.`}
				action={
					<Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing("new")}>
						Add transaction
					</Button>
				}
			/>

			<TableCard>
				<Stack
					direction={{ xs: "column", sm: "row" }}
					spacing={2}
					sx={{ p: 2, alignItems: "center" }}
				>
					<TextField
						select
						size="small"
						label="Payment method"
						value={search.payment_method ?? ""}
						onChange={(e) =>
							navigate({
								search: (p) => ({
									...p,
									page: 1,
									payment_method: (e.target.value || undefined) as typeof p.payment_method,
								}),
							})
						}
						sx={{ maxWidth: { sm: 220 } }}
					>
						<MenuItem value="">All</MenuItem>
						{PAYMENT_METHODS.map((m) => (
							<MenuItem key={m} value={m}>
								{PAYMENT_METHOD_LABELS[m]}
							</MenuItem>
						))}
					</TextField>
					<TextField
						select
						size="small"
						label="Vendor"
						value={search.vendor_id ?? ""}
						onChange={(e) =>
							navigate({
								search: (p) => ({ ...p, page: 1, vendor_id: e.target.value || undefined }),
							})
						}
						sx={{ maxWidth: { sm: 220 } }}
					>
						<MenuItem value="">All</MenuItem>
						{vendors.map((v) => (
							<MenuItem key={v.id} value={v.id}>
								{v.name}
							</MenuItem>
						))}
					</TextField>
					{filtered && (
						<Button color="inherit" onClick={() => navigate({ search: { page: 1 } })}>
							Clear filters
						</Button>
					)}
					<Box sx={{ flexGrow: 1 }} />
					<RefreshButton />
				</Stack>

				{items.length === 0 ? (
					<Typography sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
						{filtered
							? "No transactions match these filters."
							: "No transactions yet. Add your first one."}
					</Typography>
				) : (
					<TableContainer>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>Date</TableCell>
									<TableCell>Details</TableCell>
									<TableCell>Method</TableCell>
									<TableCell align="right">Amount</TableCell>
									<TableCell align="right" sx={{ width: 100 }} />
								</TableRow>
							</TableHead>
							<TableBody>
								{items.map((t) => (
									<TableRow key={t.id} hover>
										<TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary" }}>
											{formatDate(t.transaction_date)}
										</TableCell>
										<TableCell>
											<Typography variant="body2" sx={{ fontWeight: 500 }}>
												{t.vendor?.name ?? t.category}
											</Typography>
											<Typography variant="caption" sx={{ color: "text.secondary" }}>
												{[t.vendor ? t.category : null, t.description].filter(Boolean).join(" · ")}
											</Typography>
											{t.subscription && (
												<Chip
													icon={<AutorenewIcon />}
													label={t.subscription.name}
													size="small"
													variant="outlined"
													sx={{ mt: 0.5, display: "flex", width: "fit-content" }}
												/>
											)}
										</TableCell>
										<TableCell>
											<Chip size="small" label={PAYMENT_METHOD_LABELS[t.payment_method]} />
										</TableCell>
										<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
											<Typography
												variant="body2"
												sx={{
													fontWeight: 600,
													color: t.amount.startsWith("-") ? "error.main" : "success.main",
												}}
											>
												{formatMoney(t.amount, t.currency)}
											</Typography>
											{t.currency !== user.base_currency && (
												<Typography variant="caption" sx={{ color: "text.secondary" }}>
													≈ {formatMoney(t.base_amount, user.base_currency)} @{" "}
													{Number(t.exchange_rate)}
												</Typography>
											)}
										</TableCell>
										<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
											{!t.subscription && (
												<Tooltip title="Make subscription">
													<IconButton
														aria-label="Make subscription"
														size="small"
														onClick={() => setConverting(t)}
													>
														<AutorenewIcon fontSize="small" />
													</IconButton>
												</Tooltip>
											)}
											<Tooltip title="Edit">
												<IconButton aria-label="Edit" size="small" onClick={() => setEditing(t)}>
													<EditOutlinedIcon fontSize="small" />
												</IconButton>
											</Tooltip>
											<Tooltip title="Delete">
												<IconButton aria-label="Delete" size="small" onClick={() => setDeleting(t)}>
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

				{(search.page > 1 || hasMore) && (
					<Box
						sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2 }}
					>
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							Page {search.page} · {PAGE_SIZE} per page
						</Typography>
						<Stack direction="row" spacing={1}>
							<Button
								size="small"
								disabled={search.page <= 1}
								onClick={() => navigate({ search: (p) => ({ ...p, page: p.page - 1 }) })}
							>
								Previous
							</Button>
							<Button
								size="small"
								disabled={!hasMore}
								onClick={() => navigate({ search: (p) => ({ ...p, page: p.page + 1 }) })}
							>
								Next
							</Button>
						</Stack>
					</Box>
				)}
			</TableCard>

			{editing && (
				<TransactionForm
					transaction={editing === "new" ? undefined : editing}
					vendors={vendors}
					subscriptions={subscriptions}
					currencies={currencies}
					baseCurrency={user.base_currency}
					onClose={() => setEditing(null)}
				/>
			)}
			{converting && (
				<MakeSubscriptionDialog transaction={converting} onClose={() => setConverting(null)} />
			)}
			{deleting && (
				<ConfirmDelete
					title="Delete transaction"
					message={`Delete this ${formatMoney(deleting.amount, deleting.currency)} transaction? This can't be undone.`}
					onConfirm={() => deleteTransactionFn({ data: { id: deleting.id } })}
					onClose={() => setDeleting(null)}
				/>
			)}
		</>
	);
}
