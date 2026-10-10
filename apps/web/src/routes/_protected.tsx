import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import AppShell from "#/components/AppShell";
import RevalidateOnFocus from "#/components/RevalidateOnFocus";
import { getSessionFn } from "#/server/auth";

export const Route = createFileRoute("/_protected")({
	// UX guard only: every server function re-checks the session and the API checks the token.
	beforeLoad: async ({ location }) => {
		const session = await getSessionFn();
		if (!session) throw redirect({ to: "/login", search: { redirect: location.href } });
		return { user: session.user };
	},
	component: ProtectedLayout,
});

function ProtectedLayout() {
	const { user } = Route.useRouteContext();
	return (
		<AppShell user={user}>
			<RevalidateOnFocus />
			<Outlet />
		</AppShell>
	);
}
