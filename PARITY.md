# Feature parity

What each platform has. **Generated from [`parity/features.json`](parity/features.json) by `just parity`: edit that file, not this one.**
`just check-parity` (and CI) fails when this file is stale, when a status has no evidence, or when a web page or API endpoint is not claimed by a feature.

Key: ✅ done · 🟡 partial · ❌ missing · ➖ n/a (deliberately not on this platform) · 🗓 planned

## At a glance

| | Web | Android | iOS |
|---|---:|---:|---:|
| ✅ done | 67 | 49 | 0 |
| 🟡 partial | 0 | 7 | 0 |
| ❌ missing | 0 | 7 | 63 |
| ➖ n/a | 1 | 5 | 5 |

## Still to build on Android (14)

- 🟡 **Archive and unarchive an account** (Accounts and cards). Archive and unarchive from an account's page; there is no list of archived accounts to restore from.
- 🟡 **Bulk actions on selected rows** (Transactions). Long press to select, then Category, Add tag and Delete (with Undo). No vendor or payment method, no removing tags, no select all matching.
- 🟡 **Refunds** (Transactions). Refund rows are tagged and shown; a refund cannot be made or linked from the app.
- 🟡 **Split a purchase into items** (Transactions). A purchase with items keeps them when its other fields are edited; the items themselves are edited on the web.
- 🟡 **Budget limits** (Budget, goals and planning). Monthly limits can be made, edited and deleted. The budget settings (period start day, warning percent) are changed on the web.
- 🟡 **Budget and goals card** (Dashboard and reports). Shows per-period limits and goals; limits for set dates are not shown.
- 🟡 **Email digest** (Notifications). The switch and the email status are in Settings; sending a test email is not.
- ❌ **Export to Excel** (Transactions).
- ❌ **Sort every category into need or want** (Categories, tags and vendors). Each category's kind can be set one by one in its form.
- ❌ **Make a subscription from a transaction** (Bills and subscriptions).
- ❌ **Limits for set dates** (Budget, goals and planning). The app's data model carries fixed limits but they are not shown or made.
- ❌ **Move money between limits** (Budget, goals and planning).
- ❌ **Push notifications** (Notifications). Needs a push channel in the API first.
- ❌ **Backup and restore** (Settings and the rest).

## Still to build on iOS (63)

- ❌ **Sign in and sign out** (Sign in and security).
- ❌ **Two-factor sign-in** (Sign in and security).
- ❌ **Set up and manage two-factor** (Sign in and security).
- ❌ **Where you are signed in** (Sign in and security).
- ❌ **Change password** (Sign in and security).
- ❌ **Sign-in alerts** (Sign in and security).
- ❌ **Accounts list** (Accounts and cards).
- ❌ **Add and edit an account** (Accounts and cards).
- ❌ **Archive and unarchive an account** (Accounts and cards).
- ❌ **Adjust balance** (Accounts and cards).
- ❌ **An account's page** (Accounts and cards).
- ❌ **Market exchange rates** (Accounts and cards).
- ❌ **Rate history** (Accounts and cards).
- ❌ **Cards** (Accounts and cards).
- ❌ **Credit card statements and due dates** (Accounts and cards).
- ❌ **Transactions list** (Transactions).
- ❌ **Filters** (Transactions).
- ❌ **Add and edit a transaction** (Transactions).
- ❌ **Save and add another, and duplicate** (Transactions).
- ❌ **Templates** (Transactions).
- ❌ **Bulk actions on selected rows** (Transactions).
- ❌ **Trash** (Transactions).
- ❌ **Planned transactions and Mark as paid** (Transactions).
- ❌ **Refunds** (Transactions).
- ❌ **Split a purchase into items** (Transactions).
- ❌ **Receipts and web links** (Transactions).
- ❌ **Mark a transaction on the map** (Transactions).
- ❌ **Merge two entries into one transfer** (Transactions).
- ❌ **Transaction groups** (Transactions).
- ❌ **Export to Excel** (Transactions).
- ❌ **Categories** (Categories, tags and vendors).
- ❌ **Sort every category into need or want** (Categories, tags and vendors).
- ❌ **Tags** (Categories, tags and vendors).
- ❌ **Vendors** (Categories, tags and vendors).
- ❌ **A vendor's usual place** (Categories, tags and vendors).
- ❌ **Subscriptions and recurring bills** (Bills and subscriptions).
- ❌ **Suggested subscriptions** (Bills and subscriptions).
- ❌ **Make a subscription from a transaction** (Bills and subscriptions).
- ❌ **Budget limits** (Budget, goals and planning).
- ❌ **Limits for set dates** (Budget, goals and planning).
- ❌ **Move money between limits** (Budget, goals and planning).
- ❌ **Savings goals** (Budget, goals and planning).
- ❌ **Month plan** (Budget, goals and planning).
- ❌ **Salary split rules** (Budget, goals and planning).
- ❌ **Split a salary and the Pending screen** (Budget, goals and planning).
- ❌ **Dashboard** (Dashboard and reports).
- ❌ **Budget and goals card** (Dashboard and reports).
- ❌ **Needs and wants, and 50/30/20** (Dashboard and reports).
- ❌ **Money flow** (Dashboard and reports).
- ❌ **Credit used** (Dashboard and reports).
- ❌ **Cash flow** (Dashboard and reports).
- ❌ **Compare** (Dashboard and reports).
- ❌ **Trends** (Dashboard and reports).
- ❌ **Net worth and what moved it** (Dashboard and reports).
- ❌ **Places map** (Dashboard and reports).
- ❌ **Notifications** (Notifications).
- ❌ **Email digest** (Notifications).
- ❌ **Push notifications** (Notifications). Needs a push channel in the API first.
- ❌ **Settings** (Settings and the rest).
- ❌ **Short numbers** (Settings and the rest).
- ❌ **Backup and restore** (Settings and the rest).
- ❌ **Guides** (Settings and the rest).
- ❌ **Health check** (Settings and the rest).

## Sign in and security

| Feature | Web | Android | iOS |
|---|:---:|:---:|:---:|
| **Sign in and sign out**<br>Email and password sign-in, signing out, the first-run server screen on the app. | ✅ done | ✅ done | ❌ missing |
| **Create the first account**<br>Sign-up on a new install (open only while no account exists, unless REGISTRATION=open). | ✅ done | ➖ n/a | ➖ n/a |
| **Two-factor sign-in**<br>The second step at sign-in: an authenticator code or a recovery code. | ✅ done | ✅ done | ❌ missing |
| **Set up and manage two-factor**<br>Turn it on with a QR code, new recovery codes, turn it off. | ✅ done | ✅ done | ❌ missing |
| **Where you are signed in**<br>List of devices, sign one out, sign out all the others. | ✅ done | ✅ done | ❌ missing |
| **Change password**<br>Current password, a new one twice, and a code when two-factor is on. | ✅ done | ✅ done | ❌ missing |
| **Sign-in alerts**<br>The switch for the email sent at every sign-in. | ✅ done | ✅ done | ❌ missing |
| **API keys**<br>Keys for bots, scripts and agents with chosen permissions, an end date and rotation. | ✅ done | ➖ n/a | ➖ n/a |

- **Create the first account** (Android): The app has no Create account: an account is made on the web or with just seed.
- **Create the first account** (iOS): Same as Android: the app has no Create account.
- **API keys** (Android): Web only, by choice: API keys are managed on the web.
- **API keys** (iOS): Web only, by choice: API keys are managed on the web.

## Accounts and cards

| Feature | Web | Android | iOS |
|---|:---:|:---:|:---:|
| **Accounts list**<br>Accounts by group with balances, credit use, small balance lines and the net worth summary. | ✅ done | ✅ done | ❌ missing |
| **Add and edit an account**<br>Group, bank and number, currency and rate, credit limit, statement days, spendable switch, exclude from stats. | ✅ done | ✅ done | ❌ missing |
| **Archive and unarchive an account**<br>Hide an account without losing its history. | ✅ done | 🟡 partial | ❌ missing |
| **Adjust balance**<br>Set the balance to what the bank shows, or add or take away, as a transaction that reports ignore. | ✅ done | ✅ done | ❌ missing |
| **An account's page**<br>Balance, this month, its own transactions, balance over time and the balance after each row. | ✅ done | ✅ done | ❌ missing |
| **Market exchange rates**<br>A suggested rate for a foreign amount on a date, and the currency list. | ✅ done | ✅ done | ❌ missing |
| **Rate history**<br>How the market rate of a foreign account's currency moved, 30 days to a year. | ✅ done | ✅ done | ❌ missing |
| **Cards**<br>Debit cards on a bank account and credit cards with a repayment account; a Card field on a purchase and a card filter. | ✅ done | ✅ done | ❌ missing |
| **Credit card statements and due dates**<br>The statement balance, what is left, the due date and a Repay button, worked out each time. | ✅ done | ✅ done | ❌ missing |

- **Archive and unarchive an account** (Android): Archive and unarchive from an account's page; there is no list of archived accounts to restore from.

## Transactions

| Feature | Web | Android | iOS |
|---|:---:|:---:|:---:|
| **Transactions list**<br>The list by day with search, the type chips, paging and the totals line. | ✅ done | ✅ done | ❌ missing |
| **Filters**<br>Dates, account, card, category, tags with any or all, payment method, need or want and an amount range. | ✅ done | ✅ done | ❌ missing |
| **Add and edit a transaction**<br>Expense, income or transfer with account, rate, category, vendor, date and time, way of paying, tags, note and planned. | ✅ done | ✅ done | ❌ missing |
| **Save and add another, and duplicate**<br>Keep the form open for the next entry, or copy a transaction. | ✅ done | ✅ done | ❌ missing |
| **Templates**<br>Start from a saved template and save a form as one; the Templates page to rename and delete them. | ✅ done | ✅ done | ❌ missing |
| **Bulk actions on selected rows**<br>Select rows, then change category, tags, vendor or payment method, or delete them; select all that match. | ✅ done | 🟡 partial | ❌ missing |
| **Trash**<br>Deleted transactions wait to be restored or deleted for good, singly or in bulk. | ✅ done | ✅ done | ❌ missing |
| **Planned transactions and Mark as paid**<br>Something coming up that counts toward nothing until it is paid with the real day and amount. | ✅ done | ✅ done | ❌ missing |
| **Refunds**<br>Give money back for a purchase (whole or by item), or link existing income to a purchase. | ✅ done | 🟡 partial | ❌ missing |
| **Split a purchase into items**<br>Items with quantity, category and tax that add up to the amount. | ✅ done | 🟡 partial | ❌ missing |
| **Receipts and web links**<br>Photos and PDFs and web links on a transaction. | ✅ done | ✅ done | ❌ missing |
| **Mark a transaction on the map**<br>A pin and an optional place name, with place search by name. | ✅ done | ✅ done | ❌ missing |
| **Merge two entries into one transfer**<br>A suggestion card for pairs entered twice, and a manual merge when an entry has an exact match. | ✅ done | ✅ done | ❌ missing |
| **Transaction groups**<br>Bundle related transactions under a name and see what they add up to. | ✅ done | ✅ done | ❌ missing |
| **Export to Excel**<br>Download what the filters show as a workbook with a summary and a sheet by category. | ✅ done | ❌ missing | ❌ missing |
| **Import a bank statement**<br>Read a bank's CSV, review the rows, assign vendors and categories, import as one undoable batch. | ✅ done | ➖ n/a | ➖ n/a |

- **Bulk actions on selected rows** (Android): Long press to select, then Category, Add tag and Delete (with Undo). No vendor or payment method, no removing tags, no select all matching.
- **Refunds** (Android): Refund rows are tagged and shown; a refund cannot be made or linked from the app.
- **Split a purchase into items** (Android): A purchase with items keeps them when its other fields are edited; the items themselves are edited on the web.
- **Import a bank statement** (Android): Web only, by choice: importing a statement is done on the web, where the rows are easier to review.
- **Import a bank statement** (iOS): Web only, by choice: importing a statement is done on the web, where the rows are easier to review.

## Categories, tags and vendors

| Feature | Web | Android | iOS |
|---|:---:|:---:|:---:|
| **Categories**<br>Colours, one level of sub-categories, need or want, merge, and the default Salary category. | ✅ done | ✅ done | ❌ missing |
| **Sort every category into need or want**<br>One dialog to sort all categories (or only the unsorted ones) at once. | ✅ done | ❌ missing | ❌ missing |
| **Tags**<br>Coloured labels that cut across categories, with merge. | ✅ done | ✅ done | ❌ missing |
| **Vendors**<br>Address, contact, local or foreign, currency, usual category and tags, merge. | ✅ done | ✅ done | ❌ missing |
| **A vendor's usual place**<br>A usual pin that a new transaction picks up. | ✅ done | ✅ done | ❌ missing |

## Bills and subscriptions

| Feature | Web | Android | iOS |
|---|:---:|:---:|:---:|
| **Subscriptions and recurring bills**<br>Plans with a next payment, pay-from account, installments, reminders and varying amounts. | ✅ done | ✅ done | ❌ missing |
| **Suggested subscriptions**<br>Recurring spending found in your transactions, accepted into a subscription in one tap. | ✅ done | ✅ done | ❌ missing |
| **Make a subscription from a transaction**<br>Turn a payment you already made into a recurring plan. | ✅ done | ❌ missing | ❌ missing |

## Budget, goals and planning

| Feature | Web | Android | iOS |
|---|:---:|:---:|:---:|
| **Budget limits**<br>Per-period limits for categories with a warning percent, rollover and the summary by kind. | ✅ done | 🟡 partial | ❌ missing |
| **Limits for set dates**<br>One total for a stretch of dates, a monthly limit that runs between two dates, and repeating a finished one. | ✅ done | ❌ missing | ❌ missing |
| **Move money between limits**<br>Move what is left in one limit to another for one period, undo it, and see the history. | ✅ done | ❌ missing | ❌ missing |
| **Savings goals**<br>A target that follows a savings account or a log of amounts set aside by hand. | ✅ done | ✅ done | ❌ missing |
| **Month plan**<br>What you have, the bills still to pay by day and where the money runs out. | ✅ done | ✅ done | ❌ missing |
| **Salary split rules**<br>Rules that divide a salary between accounts and goals, each one manual or automatic. | ✅ done | ✅ done | ❌ missing |
| **Split a salary and the Pending screen**<br>Review, edit, approve or dismiss waiting salary splits; undo one. | ✅ done | ✅ done | ❌ missing |

- **Budget limits** (Android): Monthly limits can be made, edited and deleted. The budget settings (period start day, warning percent) are changed on the web.

## Dashboard and reports

| Feature | Web | Android | iOS |
|---|:---:|:---:|:---:|
| **Dashboard**<br>Available to spend, the month strip, spending by category, net worth, cash flow, budget and goals, coming up and latest. | ✅ done | ✅ done | ❌ missing |
| **Budget and goals card**<br>Per-period limits and goals with a meter, and the running limits for set dates. | ✅ done | 🟡 partial | ❌ missing |
| **Needs and wants, and 50/30/20**<br>Spending split by kind, and the shares of income against the 50/30/20 rule. | ✅ done | ✅ done | ❌ missing |
| **Money flow**<br>A Sankey of income into one total and out to spending and what was saved. | ✅ done | ✅ done | ❌ missing |
| **Credit used**<br>What is owed against each credit limit. | ✅ done | ✅ done | ❌ missing |
| **Cash flow**<br>Income and expenses per month, what was kept each month and kept in total, over 6 or 12 months. | ✅ done | ✅ done | ❌ missing |
| **Compare**<br>One period against another: income, spending, what was kept and every category. | ✅ done | ✅ done | ❌ missing |
| **Trends**<br>Category by month, spending or income over 6, 12 or 24 months, as a table or stacked columns. | ✅ done | ✅ done | ❌ missing |
| **Net worth and what moved it**<br>How net worth changed over a period and the drivers that explain it. | ✅ done | ✅ done | ❌ missing |
| **Places map**<br>Where spending went, as circles on a map sized by spend. | ✅ done | ✅ done | ❌ missing |

- **Budget and goals card** (Android): Shows per-period limits and goals; limits for set dates are not shown.

## Notifications

| Feature | Web | Android | iOS |
|---|:---:|:---:|:---:|
| **Notifications**<br>The bell, the list, read and dismiss, and the switches for payments, budget and goals. | ✅ done | ✅ done | ❌ missing |
| **Email digest**<br>The switch to be emailed a digest of notifications, and a test email. | ✅ done | 🟡 partial | ❌ missing |
| **Push notifications**<br>Notifications delivered to the phone when something needs a look. | ➖ n/a | ❌ missing | ❌ missing |

- **Email digest** (Android): The switch and the email status are in Settings; sending a test email is not.
- **Push notifications** (Web): Web has none; the API has no push channel yet.

## Settings and the rest

| Feature | Web | Android | iOS |
|---|:---:|:---:|:---:|
| **Settings**<br>Account details, numbers display, templates switch, default account and the notification and security cards. | ✅ done | ✅ done | ❌ missing |
| **Short numbers**<br>Show large amounts as 1.23K with the exact amount a tap away. | ✅ done | ✅ done | ❌ missing |
| **Backup and restore**<br>Download everything you own as one file and restore it into an empty account. | ✅ done | ❌ missing | ❌ missing |
| **Guides**<br>The in-app guides with search; on the app they are generated from the web's. | ✅ done | ✅ done | ❌ missing |
| **Install the app**<br>Add to home screen (web), or the app itself. | ✅ done | ➖ n/a | ➖ n/a |
| **Offline page and cached app files**<br>A service worker keeps only static files; data is never cached. | ✅ done | ➖ n/a | ➖ n/a |
| **Health check**<br>An unauthenticated endpoint for monitoring. | ✅ done | ✅ done | ❌ missing |

- **Install the app** (Android): This is the app.
- **Install the app** (iOS): This is the app.
- **Offline page and cached app files** (Android): Native app.
- **Offline page and cached app files** (iOS): Native app.

