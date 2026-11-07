import type { Doc } from "./types";

/** Locations on transactions and the Places map. Keep this in step with the locations paragraph in
 * CLAUDE.md. */
export const places: Doc = {
	slug: "places",
	title: "Places and the map",
	summary:
		"Mark where you spent on a map, give a shop a usual place, and see where your spending went.",
	symbol: "location_on",
	accent: "pink",
	where: [
		{ to: "/places", label: "Places: where your spending went, on a map" },
		{ to: "/transactions", label: "Transactions: mark a location on one" },
		{ to: "/vendors", label: "Vendors: give a shop a usual place" },
	],
	blocks: [
		{
			type: "p",
			text: "A transaction can be **marked on a map**, and the [Places](/places) page then shows where your spending went: a circle for each spot, bigger where you spent more. Marking is always your own choice, so nothing is looked up or tracked unless you ask.",
		},

		{ type: "h2", id: "mark", text: "Mark a location" },
		{
			type: "steps",
			items: [
				"In the transaction form press **Add location**.",
				"Click the map to drop the pin, or drag it. You can also type or paste coordinates into **Coordinates**, or press **Where I am** to use your device's position (your browser asks first).",
				"Give the spot a **Name (optional)**, such as Fish market, and save. Saving with no pin removes the location.",
			],
		},
		{
			type: "p",
			text: "To find a place by name, type in **Search for a place** and press **Search**. The pin then moves there and the spot takes the name unless you already typed one.",
		},
		{
			type: "callout",
			tone: "note",
			title: "What is sent out",
			text: "Searching is the one thing that sends text to another service: only the words you typed and roughly where the map is, and only when you press Search, never as you type. Whoever runs your Maalu can switch it off, and then the picker says so. Marking a spot yourself sends nothing.",
		},

		{ type: "h2", id: "vendor", text: "A shop's usual place" },
		{
			type: "p",
			text: "A [vendor](/vendors) can have a usual place. When you pick that vendor on a new transaction that has no location yet, the form fills it in for you. You can change or remove it, and Maalu never applies it on its own.",
		},

		{ type: "h2", id: "page", text: "The Places page" },
		{
			type: "list",
			items: [
				"Choose a period: **This month**, **3 months** (the default), **This year** or **All time**.",
				"Spots about 100 metres apart are one spot, named after the name most of their transactions gave. The biggest spend comes first.",
				"Press a spot in the list to find it on the map.",
				"It counts spending only, in your base currency, with refunds taken off. Transfers, planned and trashed transactions, and accounts left out of your totals are not counted.",
			],
		},

		{
			type: "callout",
			tone: "tip",
			text: "Map pictures come from a map server chosen by whoever runs your Maalu, and your browser fetches them, so that server learns which area you look at. The default is OpenStreetMap's public server, which asks for light personal use.",
		},

		{
			type: "faq",
			items: [
				{
					q: "Are locations in my export or templates?",
					a: "No. A duplicate of a transaction and **Add another** keep the location, but templates, imports and the export do not carry it. A backup does (see [Backups](/docs/backup)).",
				},
				{
					q: "Why is a spot missing?",
					a: "Only expenses with a location, inside the period you chose, count. Check that the transaction has a pin and is not planned.",
				},
			],
		},
	],
};
