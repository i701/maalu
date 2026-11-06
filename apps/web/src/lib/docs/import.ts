import type { Doc } from "./types";

/** Importing a bank statement (CSV). Keep this in step with the statement import paragraph in
 * CLAUDE.md. */
export const importStatement: Doc = {
	slug: "import",
	title: "Import a bank statement",
	summary:
		"Bring a month of transactions in from your bank's CSV statement instead of typing them. You review every row first, and an import can be undone.",
	symbol: "upload_file",
	accent: "orange",
	where: [
		{ to: "/import", label: "Import: upload, review and earlier imports" },
		{ to: "/accounts", label: "Accounts: set the account number the file is matched to" },
		{ to: "/vendors", label: "Vendors: the names Maalu learns to recognise" },
		{ to: "/docs/fixing-records", label: "Guide: refunds, transfers and corrections" },
	],
	blocks: [
		{
			type: "p",
			text: "Maalu reads the CSV statements that **BML** and **MIB** let you download. Nothing is saved until you have looked through the rows and pressed **Import**.",
		},

		{ type: "h2", id: "upload", text: "Upload the file" },
		{
			type: "steps",
			items: [
				"Download the statement from your bank's internet banking as a CSV file.",
				"Open [Import](/import) and choose the **Account** it belongs to. If the account has its number saved on [Accounts](/accounts), you can skip this: Maalu finds the account from the number in the file name.",
				"Press **Choose statement (CSV)** and pick the file.",
			],
		},
		{
			type: "callout",
			tone: "note",
			text: "A statement can hold up to 2,000 rows. A file Maalu doesn't recognise is refused with a plain message, and nothing changes.",
		},

		{ type: "h2", id: "review", text: "Review the rows" },
		{
			type: "p",
			text: "Every row is listed with what the statement says and what it **Will be** in Maalu. Where Maalu recognises the name on the statement, it fills in the vendor and that vendor's usual category and tags.",
		},
		{
			type: "list",
			items: [
				"Press the pencil on a row to set its **Vendor** and **Category**. The box **Also the other rows named …** (on by default) gives the same answer to every row the bank named the same way.",
				"To change many rows at once, tick them (or use **Select all** for everything that matches your search) and use the bar: **Set** a vendor and category, mark them as a transfer with **Transfer to or from my account**, or **Leave out** and **Include** them.",
				"Use **Search the statement** and the amount filters to find rows quickly.",
				"Rows without a category are imported as **Uncategorized**; you can sort them later.",
			],
		},
		{
			type: "p",
			text: "Maalu remembers your answers. The next time a statement has the same name, it already knows the vendor, or that it is a transfer to one of your accounts.",
		},

		{ type: "h2", id: "duplicates", text: "Duplicates and transfers" },
		{
			type: "p",
			text: "Importing the same statement twice, or two that overlap, is safe. Some rows come with a label:",
		},
		{
			type: "list",
			items: [
				"**Already imported**: the bank's reference was imported into this account before. These are skipped.",
				"**Already recorded as a transfer**: this is the other side of a transfer between your accounts that is already in Maalu. It is left out by default so the move isn't counted twice.",
				"**Maybe already entered**: you typed a transaction with the same day, amount and direction. It is kept, so look at it and leave it out if it is the same one.",
			],
		},
		{
			type: "callout",
			tone: "tip",
			text: "Money moving between your own accounts is not spending or income. Mark those rows with **Transfer to or from my account** so they don't inflate your totals.",
		},

		{ type: "h2", id: "check", text: "Check the balance, then import" },
		{
			type: "p",
			text: "Above the rows, Maalu compares what the account would hold after importing with the closing balance on the statement. **The balance after importing matches your statement** means nothing is missing or doubled. If they differ, some rows may be missing, left out, or entered twice.",
		},
		{
			type: "p",
			text: "Press **Import** when you are happy. A row that can't be saved never stops the others: the result lists how many were imported, skipped and failed, and **Download the report** gives a spreadsheet of every row and what happened to it.",
		},

		{ type: "h2", id: "undo", text: "Undo an import" },
		{
			type: "p",
			text: "**Earlier imports** on the [Import](/import) page lists each import. **Undo this import** moves its transactions to the [Trash](/trash), and the same statement can then be imported again.",
		},
	],
};
