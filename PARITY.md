# Feature parity

What each platform has. **Generated from [`parity/features.json`](parity/features.json) by `just parity`: edit that file, not this one.**
`just check-parity` (and CI) fails when this file is stale, when a status has no evidence, or when a web page or API endpoint is not claimed by a feature.

Key: ✅ done · 🟡 partial · ❌ missing · ➖ n/a (deliberately not on this platform) · 🗓 planned

## At a glance

| | Web | Android | iOS |
|---|---:|---:|---:|
| ✅ done | 70 | 59 | 61 |
| 🟡 partial | 0 | 1 | 0 |
| ❌ missing | 1 | 7 | 5 |
| ➖ n/a | 1 | 5 | 6 |

## Still to build on Web (1)

- ❌ **Hide dashboard cards** (Dashboard and reports).

## Still to build on Android (8)

- 🟡 **Email digest** (Notifications). The switch and the email status are in Settings; sending a test email is not.
- ❌ **Quiet list and detail sheet** (Transactions).
- ❌ **Export to Excel** (Transactions).
- ❌ **Arrange the dashboard** (Dashboard and reports).
- ❌ **Hide dashboard cards** (Dashboard and reports).
- ❌ **Money flow by group** (Dashboard and reports).
- ❌ **Push notifications** (Notifications). Needs a push channel in the API first.
- ❌ **Backup and restore** (Settings and the rest).

## Still to build on iOS (5)

- ❌ **Export to Excel** (Transactions).
- ❌ **Notifications** (Notifications).
- ❌ **Email digest** (Notifications).
- ❌ **Push notifications** (Notifications). Needs a push channel in the API first.
- ❌ **Backup and restore** (Settings and the rest).

## Sign in and security

| Feature | Web | Android | iOS |
|---|:---:|:---:|:---:|
| **Sign in and sign out**<br>Email and password sign-in, signing out, the first-run server screen on the app. | ✅ done | ✅ done | ✅ done |
| **Create the first account**<br>Sign-up on a new install (open only while no account exists, unless REGISTRATION=open). | ✅ done | ➖ n/a | ➖ n/a |
| **Two-factor sign-in**<br>The second step at sign-in: an authenticator code or a recovery code. | ✅ done | ✅ done | ✅ done |
| **Set up and manage two-factor**<br>Turn it on with a QR code, new recovery codes, turn it off. | ✅ done | ✅ done | ✅ done |
| **Where you are signed in**<br>List of devices, sign one out, sign out all the others. | ✅ done | ✅ done | ✅ done |
| **Change password**<br>Current password, a new one twice, and a code when two-factor is on. | ✅ done | ✅ done | ✅ done |
| **Sign-in alerts**<br>The switch for the email sent at every sign-in. | ✅ done | ✅ done | ✅ done |
| **API keys**<br>Keys for bots, scripts and agents with chosen permissions, an end date and rotation. | ✅ done | ➖ n/a | ➖ n/a |

- **Create the first account** (Android): The app has no Create account: an account is made on the web or with just seed.
- **Create the first account** (iOS): Same as Android: the app has no Create account.
- **API keys** (Android): Web only, by choice: API keys are managed on the web.
- **API keys** (iOS): Web only, by choice: API keys are managed on the web.

## Accounts and cards

| Feature | Web | Android | iOS |
|---|:---:|:---:|:---:|
| **Accounts list**<br>Accounts by group with balances, credit use, small balance lines, the net worth summary, a bank filter and grouping by bank. | ✅ done | ✅ done | ✅ done |
| **Add and edit an account**<br>Group, bank and number, currency and rate, credit limit, statement days, spendable switch, exclude from stats. | ✅ done | ✅ done | ✅ done |
| **Archive and unarchive an account**<br>Hide an account without losing its history. | ✅ done | ✅ done | ✅ done |
| **Adjust balance**<br>Set the balance to what the bank shows, or add or take away, as a transaction that reports ignore. | ✅ done | ✅ done | ✅ done |
| **An account's page**<br>Balance, this month, its own transactions, balance over time and the balance after each row. | ✅ done | ✅ done | ✅ done |
| **Market exchange rates**<br>A suggested rate for a foreign amount on a date, and the currency list. | ✅ done | ✅ done | ✅ done |
| **Rate history**<br>How the market rate of a foreign account's currency moved, 30 days to a year. | ✅ done | ✅ done | ✅ done |
| **Cards**<br>Debit cards on a bank account and credit cards with a repayment account; a Card field on a purchase and a card filter. | ✅ done | ✅ done | ✅ done |
| **Credit card statements and due dates**<br>The statement balance, what is left, the due date and a Repay button, worked out each time. | ✅ done | ✅ done | ✅ done |

## Transactions

| Feature | Web | Android | iOS |
|---|:---:|:---:|:---:|
| **Quiet list and detail sheet**<br>Rows show only the title, category and method and the amount, grouped by day; everything else and the actions are in a detail sheet. | ✅ done | ❌ missing | ✅ done |
| **Transactions list**<br>The list by day with search, the type chips, paging and the totals line. | ✅ done | ✅ done | ✅ done |
| **Filters**<br>Dates, account, card, category, tags with any or all, payment method, need or want and an amount range. | ✅ done | ✅ done | ✅ done |
| **Add and edit a transaction**<br>Expense, income or transfer with account, rate, category, vendor, date and time, way of paying, tags, note and planned. | ✅ done | ✅ done | ✅ done |
| **Save and add another, and duplicate**<br>Keep the form open for the next entry, or copy a transaction. | ✅ done | ✅ done | ✅ done |
| **Templates**<br>Start from a saved template and save a form as one; the Templates page to rename and delete them. | ✅ done | ✅ done | ✅ done |
| **Bulk actions on selected rows**<br>Select rows, then change category, tags, vendor or payment method, or delete them; select all that match. | ✅ done | ✅ done | ✅ done |
| **Trash**<br>Deleted transactions wait to be restored or deleted for good, singly or in bulk. | ✅ done | ✅ done | ✅ done |
| **Planned transactions and Mark as paid**<br>Something coming up that counts toward nothing until it is paid with the real day and amount. | ✅ done | ✅ done | ✅ done |
| **Refunds**<br>Give money back for a purchase (whole or by item), or link existing income to a purchase. | ✅ done | ✅ done | ✅ done |
| **Split a purchase into items**<br>Items with quantity, category and tax (GST included or excluded) that add up to the amount. | ✅ done | ✅ done | ✅ done |
| **Receipts and web links**<br>Photos and PDFs and web links on a transaction. | ✅ done | ✅ done | ✅ done |
| **Mark a transaction on the map**<br>A pin and an optional place name, with place search by name. | ✅ done | ✅ done | ✅ done |
| **Merge two entries into one transfer**<br>A suggestion card for pairs entered twice, and a manual merge when an entry has an exact match. | ✅ done | ✅ done | ✅ done |
| **Transaction groups**<br>Bundle related transactions under a name and see what they add up to. | ✅ done | ✅ done | ✅ done |
| **Export to Excel**<br>Download what the filters show as a workbook with a summary and a sheet by category. | ✅ done | ❌ missing | ❌ missing |
| **Import a bank statement**<br>Read a bank's CSV, review the rows, assign vendors and categories, import as one undoable batch. | ✅ done | ➖ n/a | ➖ n/a |

- **Trash** (iOS): Restore and delete for good one by one; bulk actions wait for tx-bulk.
- **Import a bank statement** (Android): Web only, by choice: importing a statement is done on the web, where the rows are easier to review.
- **Import a bank statement** (iOS): Web only, by choice: importing a statement is done on the web, where the rows are easier to review.

## Categories, tags and vendors

| Feature | Web | Android | iOS |
|---|:---:|:---:|:---:|
| **Categories**<br>Colours, one level of sub-categories, need or want, merge, and the default Salary category. | ✅ done | ✅ done | ✅ done |
| **Sort every category into need or want**<br>One dialog to sort all categories (or only the unsorted ones) at once. | ✅ done | ✅ done | ✅ done |
| **Tags**<br>Coloured labels that cut across categories, with merge. | ✅ done | ✅ done | ✅ done |
| **Vendors**<br>Address, contact, local or foreign, currency, usual category and tags, merge. | ✅ done | ✅ done | ✅ done |
| **A vendor's usual place**<br>A usual pin that a new transaction picks up. | ✅ done | ✅ done | ✅ done |

## Bills and subscriptions

| Feature | Web | Android | iOS |
|---|:---:|:---:|:---:|
| **Subscriptions and recurring bills**<br>Plans with a next payment, pay-from account, installments, reminders and varying amounts. | ✅ done | ✅ done | ✅ done |
| **Suggested subscriptions**<br>Recurring spending found in your transactions, accepted into a subscription in one tap. | ✅ done | ✅ done | ✅ done |
| **Make a subscription from a transaction**<br>Turn a payment you already made into a recurring plan. | ✅ done | ✅ done | ✅ done |

## Budget, goals and planning

| Feature | Web | Android | iOS |
|---|:---:|:---:|:---:|
| **Budget limits**<br>Per-period limits for categories with a warning percent, rollover and the summary by kind. | ✅ done | ✅ done | ✅ done |
| **Limits for set dates**<br>One total for a stretch of dates, a monthly limit that runs between two dates, and repeating a finished one. | ✅ done | ✅ done | ✅ done |
| **Move money between limits**<br>Move what is left in one limit to another for one period, undo it, and see the history. | ✅ done | ✅ done | ✅ done |
| **Savings goals**<br>A target that follows a savings account or a log of amounts set aside by hand. | ✅ done | ✅ done | ✅ done |
| **Month plan**<br>What you have, the bills still to pay by day and where the money runs out. | ✅ done | ✅ done | ✅ done |
| **Salary split rules**<br>Rules that divide a salary between accounts and goals, each one manual or automatic. | ✅ done | ✅ done | ✅ done |
| **Split a salary and the Pending screen**<br>Review, edit, approve or dismiss waiting salary splits; undo one. | ✅ done | ✅ done | ✅ done |

## Dashboard and reports

| Feature | Web | Android | iOS |
|---|:---:|:---:|:---:|
| **Dashboard**<br>Available to spend, the month strip, spending by category, net worth, cash flow, budget and goals, coming up and latest. | ✅ done | ✅ done | ✅ done |
| **Arrange the dashboard**<br>Drag the dashboard's cards, or move them with arrows, into your own order; kept on the server. | ✅ done | ❌ missing | ✅ done |
| **Hide dashboard cards**<br>Switch off the dashboard cards you do not want, from the arrange sheet. Kept on the device for now, not on the server, so no API change. | ❌ missing | ❌ missing | ✅ done |
| **Budget and goals card**<br>Per-period limits and goals with a meter, and the running limits for set dates. | ✅ done | ✅ done | ✅ done |
| **Needs and wants, and 50/30/20**<br>Spending split by kind, and the shares of income against the 50/30/20 rule. | ✅ done | ✅ done | ✅ done |
| **Money flow**<br>A Sankey of income into one total and out to spending and what was saved. | ✅ done | ✅ done | ✅ done |
| **Money flow by group**<br>The money flow splits each spending group into its sub-categories as a fourth column, like a tree. | ✅ done | ❌ missing | ✅ done |
| **Credit used**<br>What is owed against each credit limit. | ✅ done | ✅ done | ✅ done |
| **Cash flow**<br>Income and expenses per month, what was kept each month and kept in total, over 6 or 12 months. | ✅ done | ✅ done | ✅ done |
| **Compare**<br>One period against another: income, spending, what was kept and every category. | ✅ done | ✅ done | ✅ done |
| **Trends**<br>Category by month, spending or income over 6, 12 or 24 months, as a table or stacked columns. | ✅ done | ✅ done | ✅ done |
| **Net worth and what moved it**<br>How net worth changed over a period and the drivers that explain it. | ✅ done | ✅ done | ✅ done |
| **Places map**<br>Where spending went, as circles on a map sized by spend. | ✅ done | ✅ done | ✅ done |

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
| **Settings**<br>Account details, numbers display, templates switch, default account and the notification and security cards. | ✅ done | ✅ done | ✅ done |
| **Short numbers**<br>Show large amounts as 1.23K with the exact amount a tap away. | ✅ done | ✅ done | ✅ done |
| **Backup and restore**<br>Download everything you own as one file and restore it into an empty account. | ✅ done | ❌ missing | ❌ missing |
| **Guides**<br>The in-app guides with search; on the app they are generated from the web's. | ✅ done | ✅ done | ✅ done |
| **Install the app**<br>Add to home screen (web), or the app itself. | ✅ done | ➖ n/a | ➖ n/a |
| **Offline page and cached app files**<br>A service worker keeps only static files; data is never cached. | ✅ done | ➖ n/a | ➖ n/a |
| **Health check**<br>An unauthenticated endpoint for monitoring. | ✅ done | ✅ done | ➖ n/a |

- **Install the app** (Android): This is the app.
- **Install the app** (iOS): This is the app.
- **Offline page and cached app files** (Android): Native app.
- **Offline page and cached app files** (iOS): Native app.
- **Health check** (iOS): The app does not probe /health: it checks a server address with GET /api/v1/server (ServerAddress.check), which says it is Maalu, and which also answers behind the web address.

