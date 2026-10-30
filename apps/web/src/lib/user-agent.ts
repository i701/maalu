/** A readable name for a device from its browser's User-Agent text, like "Firefox on Linux". It is
 * only for telling your sign-ins apart in a list, so it is a few patterns, not a full parser. */
export function describeDevice(userAgent: string | null): string {
	if (!userAgent) return "Unknown device";
	const browser = browserOf(userAgent);
	const system = systemOf(userAgent);
	if (browser && system) return `${browser} on ${system}`;
	return browser ?? system ?? "Unknown device";
}

// Order matters: Edge, Opera and Chrome all say "Chrome", and most browsers say "Safari".
function browserOf(ua: string): string | null {
	if (/\bEdg(e|A|iOS)?\//.test(ua)) return "Edge";
	if (/\b(OPR|Opera)\//.test(ua)) return "Opera";
	if (/\b(Firefox|FxiOS)\//.test(ua)) return "Firefox";
	if (/\b(Chrome|CriOS)\//.test(ua)) return "Chrome";
	if (/\bSafari\//.test(ua) && /\bVersion\//.test(ua)) return "Safari";
	if (/^curl\//i.test(ua)) return "curl";
	return null;
}

// Android also says "Linux", and iPhones say "like Mac OS X", so those come first.
function systemOf(ua: string): string | null {
	if (/Android/.test(ua)) return "Android";
	if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
	if (/Windows/.test(ua)) return "Windows";
	if (/Mac OS X|Macintosh/.test(ua)) return "macOS";
	if (/CrOS/.test(ua)) return "ChromeOS";
	if (/Linux|X11/.test(ua)) return "Linux";
	return null;
}
