import Box from "@mui/material/Box";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import AppShell from "#/components/AppShell";
import RevalidateOnFocus from "#/components/RevalidateOnFocus";
import { getSessionFn } from "#/server/auth";
import { MapConfigProvider } from "#/lib/map-config";
import { getMapConfigFn } from "#/server/map";
import { unreadCountFn } from "#/server/notifications";
import { pendingSplitCountFn } from "#/server/salary";

export const Route = createFileRoute("/_protected")({
	// UX guard only: every server function re-checks the session and the API checks the token.
	beforeLoad: async ({ location }) => {
		const session = await getSessionFn();
		if (!session) throw redirect({ to: "/login", search: { redirect: location.href } });
		return { user: session.user };
	},
	// The bell's badge. Refetched with everything else after a change and when the tab regains focus.
	loader: async () => ({
		unread: await unreadCountFn(),
		pending: await pendingSplitCountFn(),
		map: await getMapConfigFn(),
	}),
	component: ProtectedLayout,
});

function ProtectedLayout() {
	const { user } = Route.useRouteContext();
	const { unread, pending, map } = Route.useLoaderData();
	return (
		<AppShell user={user} unread={unread} pending={pending}>
			<RevalidateOnFocus />
			<MapConfigProvider value={map}>
				<Box sx={{ position: "relative" }}>
					<Outlet />
				</Box>
			</MapConfigProvider>
		</AppShell>
	);
}
