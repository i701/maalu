/** Only allow same-site relative paths from `?redirect=`, to avoid open redirects. */
export function safeRedirect(target: string | undefined): string {
	return target?.startsWith("/") && !target.startsWith("//") ? target : "/dashboard";
}
