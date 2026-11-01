import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Switch from "@mui/material/Switch";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { memo, useCallback } from "react";
import { z } from "zod";
import EmptyState from "#/components/EmptyState";
import MobileCard from "#/components/MobileCard";
import PageHeader from "#/components/PageHeader";
import PendingOverlay from "#/components/PendingOverlay";
import ResponsiveTable from "#/components/ResponsiveTable";
import TableCard from "#/components/TableCard";
import TablePager from "#/components/TablePager";
import TableToolbar from "#/components/TableToolbar";
import TonalChip from "#/components/TonalChip";
import { formatAgo } from "#/lib/format";
import { useLiveSearch } from "#/lib/live-search";
import { KIND_META } from "#/lib/notifications";
import { lastPageIfOutOfRange, pageSearch } from "#/lib/pagination";
import { unwrap } from "#/lib/unwrap";
import { useAction } from "#/lib/use-action";
import {
	dismissNotificationFn,
	listNotificationsPageFn,
	markAllNotificationsReadFn,
	markNotificationReadFn,
} from "#/server/notifications";
import type { AppNotification } from "#/types/api";

const searchSchema = z.object({
	...pageSearch,
	unread: z.boolean().optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/notifications")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({
		page: search.page,
		pageSize: search.pageSize,
		unread: search.unread,
	}),
	loader: async ({ deps }) => {
		const rows = unwrap(await listNotificationsPageFn({ data: deps }));
		const last = lastPageIfOutOfRange({
			page: deps.page,
			pageSize: deps.pageSize,
			total: rows.total,
			itemCount: rows.items.length,
		});
		if (last) throw redirect({ to: "/notifications", search: { ...deps, page: last } });
		return rows;
	},
	component: NotificationsPage,
});

function Actions({
	n,
	onRead,
	onDismiss,
}: {
	n: AppNotification;
	onRead: (n: AppNotification) => void;
	onDismiss: (n: AppNotification) => void;
}) {
	return (
		<>
			{!n.read_at && (
				<IconButton
					aria-label="Mark as read"
					title="Mark as read"
					size="small"
					onClick={() => onRead(n)}
				>
					<CheckIcon fontSize="small" />
				</IconButton>
			)}
			<IconButton aria-label="Dismiss" title="Dismiss" size="small" onClick={() => onDismiss(n)}>
				<CloseIcon fontSize="small" />
			</IconButton>
		</>
	);
}

function Title({ n, onOpen }: { n: AppNotification; onOpen: (n: AppNotification) => void }) {
	return (
		<>
			<Typography
				component="button"
				variant="body2"
				onClick={() => onOpen(n)}
				sx={{
					all: "unset",
					cursor: n.link ? "pointer" : "default",
					fontWeight: n.read_at ? 400 : 600,
					"&:hover": { textDecoration: n.link ? "underline" : "none" },
				}}
			>
				{n.title}
			</Typography>
			<Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
				{n.body}
			</Typography>
		</>
	);
}

const NotificationsTable = memo(function NotificationsTable({
	items,
	onOpen,
	onRead,
	onDismiss,
}: {
	items: AppNotification[];
	onOpen: (n: AppNotification) => void;
	onRead: (n: AppNotification) => void;
	onDismiss: (n: AppNotification) => void;
}) {
	return (
		<ResponsiveTable
			rows={items}
			getKey={(n) => n.id}
			minWidth={620}
			head={
				<TableRow>
					<TableCell>Notification</TableCell>
					<TableCell>Kind</TableCell>
					<TableCell>When</TableCell>
					<TableCell align="right" sx={{ width: 100 }} />
				</TableRow>
			}
			renderRow={(n) => (
				<TableRow hover>
					<TableCell>
						<Title n={n} onOpen={onOpen} />
					</TableCell>
					<TableCell>
						<TonalChip accent={KIND_META[n.kind].accent} label={KIND_META[n.kind].label} />
					</TableCell>
					<TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
						{formatAgo(n.created_at)}
					</TableCell>
					<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
						<Actions n={n} onRead={onRead} onDismiss={onDismiss} />
					</TableCell>
				</TableRow>
			)}
			renderCard={(n) => (
				<MobileCard
					primary={<Title n={n} onOpen={onOpen} />}
					meta={
						<>
							<TonalChip accent={KIND_META[n.kind].accent} label={KIND_META[n.kind].label} />
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
								{formatAgo(n.created_at)}
							</Typography>
						</>
					}
					actions={<Actions n={n} onRead={onRead} onDismiss={onDismiss} />}
				/>
			)}
		/>
	);
});

function NotificationsPage() {
	const { items, total } = Route.useLoaderData();
	const search = useLiveSearch(searchSchema);
	const navigate = Route.useNavigate();
	const router = useRouter();
	const { run, error } = useAction();

	const open = useCallback(
		async (n: AppNotification) => {
			if (!n.read_at) await run(() => markNotificationReadFn({ data: { id: n.id } }));
			if (n.link) router.history.push(n.link);
		},
		[run, router],
	);
	const read = useCallback(
		(n: AppNotification) => void run(() => markNotificationReadFn({ data: { id: n.id } })),
		[run],
	);
	const dismiss = useCallback(
		(n: AppNotification) => void run(() => dismissNotificationFn({ data: { id: n.id } })),
		[run],
	);
	const onlyUnread = Boolean(search.unread);

	return (
		<>
			<PageHeader
				title="Notifications"
				symbol="notifications"
				accent="amber"
				shape={3}
				stats={[{ symbol: "notifications", label: `${total} ${onlyUnread ? "unread" : "in all"}` }]}
				description="Payments coming due, budget limits reached and goals met. Choose which you want in Settings."
			/>

			<PendingOverlay>
				<TableCard>
					<TableToolbar
						summary={`${total} ${total === 1 ? "notification" : "notifications"}`}
						filters={
							<FormControlLabel
								control={
									<Switch
										checked={onlyUnread}
										onChange={(_, on) =>
											navigate({ search: (p) => ({ ...p, page: 1, unread: on || undefined }) })
										}
									/>
								}
								label="Unread only"
							/>
						}
						actions={
							<Button
								size="small"
								startIcon={<DoneAllIcon />}
								onClick={() => void run(() => markAllNotificationsReadFn())}
							>
								Mark all read
							</Button>
						}
					/>
					{error && (
						<Typography sx={{ px: 2, color: "error.main" }} variant="body2">
							{error}
						</Typography>
					)}
					{items.length === 0 ? (
						<EmptyState firstRun={!onlyUnread} symbol="notifications" accent="amber" shape={3}>
							{onlyUnread
								? "Nothing unread."
								: "Nothing yet. You will see payments coming due, budget limits reached and goals met here."}
						</EmptyState>
					) : (
						<NotificationsTable items={items} onOpen={open} onRead={read} onDismiss={dismiss} />
					)}
					<TablePager
						total={total}
						page={search.page}
						pageSize={search.pageSize}
						onPageChange={(page) => navigate({ search: (p) => ({ ...p, page }), replace: true })}
						onPageSizeChange={(pageSize) =>
							navigate({ search: (p) => ({ ...p, page: 1, pageSize }) })
						}
					/>
				</TableCard>
			</PendingOverlay>
		</>
	);
}
