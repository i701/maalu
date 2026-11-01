export const MAX_LINKS = 10;

export type ParsedUrl = { url: string } | { error: string };

/** What the API will accept, checked here first so a typo is caught before the round trip: http or
 * https only, `https://` added when no scheme is typed, a host, no spaces, no password in it. The
 * API checks again. */
export function parseUrl(input: string): ParsedUrl {
	const typed = input.trim();
	if (!typed) return { error: "Type a web address" };
	if (/\s/.test(typed)) return { error: "A web address cannot contain spaces" };
	const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(typed);
	// "javascript:alert(1)" and "mailto:a@b.c" have a scheme but no "//"; "localhost:8000" is a host
	if (!hasScheme && /^[a-z][a-z0-9+.-]*:/i.test(typed) && !/^[^/]*:\d+(\/|$)/.test(typed))
		return { error: "Only http and https links can be added" };
	const url = hasScheme ? typed : `https://${typed}`;
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return { error: "That is not a valid web address" };
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
		return { error: "Only http and https links can be added" };
	if (!parsed.hostname.includes(".") && parsed.hostname !== "localhost")
		return { error: "That is not a valid web address" };
	if (parsed.username || parsed.password)
		return { error: "Leave the user name and password out of the address" };
	if (url.length > 2000) return { error: "The address is too long" };
	return { url };
}

/** The site's name without `www.`, for showing under a link. */
export function hostOf(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
}

/** What to call a link: the title it was given, else its site. */
export const linkLabel = (link: { url: string; title: string | null }) =>
	link.title || hostOf(link.url);
