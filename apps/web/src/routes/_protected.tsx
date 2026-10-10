import Box from "@mui/material/Box";
import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import AppShell from "#/components/AppShell";
import PageSkeleton from "#/components/PageSkeleton";
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
	// Moving to another page (not just changing filters): cover the old one with a skeleton.
	const leaving = useRouterState({
		select: (s) => s.location.pathname !== s.resolvedLocation?.pathname,
	});
	return (
		<AppShell user={user}>
			<RevalidateOnFocus />
			<Box sx={{ position: "relative" }}>
				<Outlet />
				{leaving && <PageSkeleton />}
			</Box>
		</AppShell>
	);
}
