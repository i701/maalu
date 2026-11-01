import Box from "@mui/material/Box";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import AppShell from "#/components/AppShell";
import RevalidateOnFocus from "#/components/RevalidateOnFocus";
import { getSessionFn } from "#/server/auth";
import { unreadCountFn } from "#/server/notifications";

export const Route = createFileRoute("/_protected")({
	// UX guard only: every server function re-checks the session and the API checks the token.
	beforeLoad: async ({ location }) => {
		const session = await getSessionFn();
		if (!session) throw redirect({ to: "/login", search: { redirect: location.href } });
		return { user: session.user };
	},
	// The bell's badge. Refetched with everything else after a change and when the tab regains focus.
	loader: async () => ({ unread: await unreadCountFn() }),
	component: ProtectedLayout,
});

function ProtectedLayout() {
	const { user } = Route.useRouteContext();
	const { unread } = Route.useLoaderData();
	return (
		<AppShell user={user} unread={unread}>
			<RevalidateOnFocus />
			<Box sx={{ position: "relative" }}>
				<Outlet />
			</Box>
		</AppShell>
	);
}
