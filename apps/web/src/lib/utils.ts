export function exhaustiveAssertion(
	_value: never,
	message = "Reached unexpected case in exhaustive switch",
): never {
	throw new Error(message);
}

type WebManifest = {
	id: string;
	name: string;
	start_url: string;
	scope: string;
	display: string;
	icons: {
		src: string;
		sizes: string;
		purpose?: string;
	}[];
	shortcuts: {
		name: string;
		url: string;
	}[];
};

export function withDefaults<T extends object>(defaults: T, overrides: Partial<T>): T {
	const result = { ...defaults };

	for (const [key, value] of Object.entries(overrides)) {
		if (value !== undefined) {
			Object.assign(result, { [key]: value });
		}
	}

	return result;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isWebManifest(value: unknown): value is WebManifest {
	if (!isRecord(value)) return false;

	return (
		typeof value.id === "string" &&
		typeof value.name === "string" &&
		typeof value.start_url === "string" &&
		typeof value.scope === "string" &&
		typeof value.display === "string" &&
		Array.isArray(value.icons) &&
		value.icons.every(
			(icon: unknown) =>
				isRecord(icon) &&
				typeof icon.src === "string" &&
				typeof icon.sizes === "string" &&
				(icon.purpose === undefined || typeof icon.purpose === "string"),
		) &&
		Array.isArray(value.shortcuts) &&
		value.shortcuts.every(
			(shortcut: unknown) =>
				isRecord(shortcut) && typeof shortcut.name === "string" && typeof shortcut.url === "string",
		)
	);
}

export function isOneOf<T extends string>(value: string, allowed: readonly T[]): value is T {
	return (allowed as readonly string[]).includes(value);
}
