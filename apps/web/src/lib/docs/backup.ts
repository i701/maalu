import type { Doc } from "./types";

/** Backup and restore. Keep this in step with the backup and restore paragraph in CLAUDE.md and
 * the text on `BackupCard`. */
export const backup: Doc = {
	slug: "backup",
	title: "Backups and restoring",
	summary: "Download everything you own as one file, and put it back into a new, empty account.",
	symbol: "upload_file",
	accent: "slate",
	where: [
		{ to: "/settings", label: "Settings: the Backup card" },
		{ to: "/docs/import", label: "Guide: bring in a bank statement instead" },
	],
	blocks: [
		{
			type: "p",
			text: "The **Backup** card in [Settings](/settings) gives you one file with everything you own: accounts, transactions, categories, tags, budgets, goals, templates and the rest. It is the safest way to move to a new install, or to keep a copy before a big clean-up.",
		},

		{ type: "h2", id: "download", text: "Make a backup" },
		{
			type: "steps",
			items: [
				"Open [Settings](/settings) and find **Backup**.",
				"Press **Download backup**. Your browser saves a file such as `maalu-backup.json`.",
				"Keep it somewhere safe.",
			],
		},
		{
			type: "callout",
			tone: "warning",
			title: "It is your data in plain text",
			text: "The file holds no password, session or two-factor secret, but it is your whole financial history, readable by anyone who has it. Store it like you would a bank statement.",
		},

		{ type: "h2", id: "restore", text: "Restore a backup" },
		{
			type: "steps",
			items: [
				"Sign in to a **new, empty** account.",
				"Open [Settings](/settings), press **Restore from a file** and choose the backup.",
				"Wait for the message saying what was restored.",
			],
		},
		{
			type: "list",
			items: [
				"**Only an empty account can be restored into.** If the account already has data, nothing is changed and Maalu tells you.",
				"**It is all or nothing.** A damaged file, one from another program or one with a bad checksum is refused and nothing is restored.",
				"Everything gets new ids inside, so the same file can go into two accounts, or back into the install it came from, without clashing.",
				"Your base currency, default account and settings come from the file.",
				"Balance history is rebuilt the first time you open the charts, so give them a moment.",
			],
		},

		{ type: "h2", id: "not-included", text: "What is not in it" },
		{
			type: "list",
			items: [
				"**Attached files** (receipts) are not in the backup. They stay in your storage, so back up that storage with its own tools. The web links you attached to transactions are included.",
				"**Notifications**, sign-in sessions and exchange-rate history are not included: they are worked out again.",
				"A backup is one account's data. It does not include other people's accounts on the same install.",
			],
		},

		{
			type: "faq",
			items: [
				{
					q: "How big can a backup be?",
					a: "A restore accepts a file of up to 200 MB, far more than a few years of personal finance needs.",
				},
				{
					q: "Can I restore into the account I took it from?",
					a: "Only if that account is empty. Clear it first, or restore into a new account.",
				},
				{
					q: "I only want to bring in my bank's transactions",
					a: "Use [Import a bank statement](/docs/import) instead. A backup is for the whole account.",
				},
			],
		},
	],
};
