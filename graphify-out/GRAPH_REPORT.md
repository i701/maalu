# Graph Report - maalu  (2026-11-17)

## Corpus Check
- Large corpus: 804 files · ~392,770 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 7235 nodes · 23615 edges · 235 communities (198 shown, 37 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 597 edges (avg confidence: 0.89)
- Token cost: 568,713 input · 0 output

## Community Hubs (Navigation)
- Alembic Migrations
- Web Charts & Account Summary
- Protected Pages & Filters
- Transaction Form Fields
- Web Server Functions & Dialogs
- API Enums & Models
- Web Dialogs (Accept, Adjust, Archive)
- Account Page Transactions
- API Schemas (Cards, Kinds)
- Admin CLI Commands
- Subscriptions API
- Transaction Splits & Rules
- API App & Health Tests
- Accounts Router
- Dashboard Category Cards
- In-app Docs Renderer
- Salary Split API
- Dependency Injection & DB Session
- Goals API
- Notifications Service
- Salary Split Web
- Budget Cards & Alerts
- API Key Scopes
- Transactions Router & Bulk
- Refund Linking Tests
- Attachments & Storage Cleanup
- Spending & Budget Rules
- App Shell & Auth Layout
- Chart Primitives
- Import Review UI
- Platform Docs (Jobs, Backup, Email)
- Accounts & Cards Docs
- Balance Chart & Range Fields
- Sparklines & Card Statements
- Snapshots & Net Worth Tests
- Settings Cards (Backup, Password)
- Bulk Edit Dialog
- Legends, Swatches & Kind Tables
- Budget Router
- Attachments Field & Links
- Filter Tests
- File Storage & MIME Detection
- Available to Spend Card
- Background Job Tests
- Subscription Form Schema
- API Keys Router
- Budget Date Tests
- Account Form Sections
- Tags Service
- Transfer Link Tests
- Categories Service
- Currency Pickers & Select All
- Service Model Imports
- API Keys Settings UI
- Auth Router & Sessions
- Link Refund Dialog
- Rate Limiting
- Statement Import Service
- Account Polish Tests
- Category Tree Tests
- Location Tests
- Accounts Service
- Two-Factor Secrets
- Session Tests
- Two-Factor Tests
- Passwords & Admin 2FA
- Budget Periods
- Rate Refresh
- Mailer
- Groups Service
- API Keys Service
- Installment Tests
- Places Router
- Salary Category Tests
- Web Package Dependencies
- Salary Rule Schemas
- Attachments Router
- Tags Router
- Salary Task Tests
- Group Dialog
- services: Filter for vendors by whether they are
- tests: test_card_statement.py
- tests: test_groups.py
- tests: test_place_search.py
- tests: test_tags.py
- tests: test_available_to_spend.py
- routers: routers/group.py
- tests: test_salary_split.py
- e2e: api-keys.spec.ts
- e2e: backup.spec.ts
- schemas: auth.py
- schemas: BulkResult
- misc: create_category()
- tests: test_planned.py
- budget-line-form: CategoriesPicker.tsx
- misc: routers/transfer_link.py
- services: cache_latest()
- tests: test_password.py
- tests: test_rate_limit.py
- misc: docker-compose.yml
- misc: create_vendor()
- tests: test_budget.py
- services: What counts toward money: not in the t
- services: BalancePoint
- tests: test_statements.py
- tests: test_bulk.py
- tests: test_transfers.py
- misc: environment
- app: export.py
- services: In the default Salary category: pay, w
- routers: add_entry()
- misc: import_report()
- app: schedule.py
- tests: security.py
- tests: test_accounts.py
- tests: test_seed.py
- app: statements.py
- tests: test_category_months.py
- tests: test_goals.py
- tests: test_templates.py
- web: dependencies
- lib: lib/places.ts
- services: What counts as income and spending in 
- misc: CurrencyList
- misc: delete_notification()
- tests: test_login_alert.py
- web: tsconfig.json
- claude: AccountPicker autocomplete with balances
- routers: routers/card.py
- misc: available_to_spend()
- misc: create_template()
- services: CardNotFoundError
- tests: test_subscription_detect.py
- tests: test_currencies.py
- tests: test_splits.py
- claude: docker-compose.prod.yml
- tests: test_cards.py
- tests: test_export.py
- tests: test_subscription_candidates.py
- e2e: auth.spec.ts
- lib: SessionsCard.tsx
- tests: test_account_numbers.py
- tests: test_categories.py
- tests: test_picker_filters.py
- tests: test_varying_bills.py
- tests: test_vendor_defaults.py
- web: scripts
- lib: loading-shapes.ts
- api: Operator recovery commands (reset-password,
- app: card_cycle.py
- tests: test_market_rate.py
- tests: test_transaction_search.py
- utils: api.v1.$.ts
- misc: Git rule: stage the work, never commit
- tests: test_category_kind.py
- tests: test_default_account.py
- tests: test_trash.py
- tests: test_vendors.py
- lib: docs-shots.spec.ts
- components: Providers.tsx
- lib: InstallCard.tsx
- misc: API keys Settings card (Change, Rotate, De
- misc: subscription_detect.py
- tests: conftest.py
- tests: test_account_archive.py
- tests: test_plan_transfers.py
- tests: test_transaction_time.py
- misc: environment (2)
- claude: Android DocsLogic.kt / DocsScreen.kt
- schemas: routers/stats.py
- tests: test_account_history.py
- tests: test_date_filter.py
- tests: test_links.py
- tests: test_select_all.py
- services: _mark()
- tests: test_pagination.py
- tests: test_registration.py
- tests: test_transactions.py
- lib: SubscriptionSuggestionsCard.tsx
- claude: apiAs helper
- misc: download_backup()
- schemas: GroupCreate
- web: web/.oxlintrc.json
- map: PlacesMap.tsx
- server: server/cards.ts
- routes: api.attachments.ts
- misc: API layers: models -> schemas -> services 
- misc: API_URL
- tests: test_currency.py
- lib: Sparkline.tsx
- lib: NotificationBell.tsx
- misc: list_groups()
- tests: MarketRateUnavailableError
- tests: test_kind_filter.py
- tests: test_settings.py
- misc: condition
- misc: package.json
- misc: Page
- misc: exchange_rate and base_amount rule
- misc: depends_on
- src: router.tsx
- app: allocation.py
- app: create_challenge_token()
- tests: fixture
- e2e: budget-dates.spec.ts
- web: .oxfmtrc.json
- public: sw.js
- misc: Generated API types (just api-types, opena
- misc: .oxlintrc.json
- routers: end_session()
- tests: test_server_info.py
- e2e: cards.spec.ts
- e2e: salary-split.spec.ts
- public: Offline fallback page (offline.html)
- services: _as_date()
- services: Exception
- services: _aware()
- e2e: budget-stretches.spec.ts
- web: playwright.config.ts
- tests: look_every_time()
- misc: Categories found-or-created by name; merge
- misc: pnpm-workspace.yaml
- misc: Transfer: account/amount out, to_account/t
- misc: maalu
- api: maalu-api

## God Nodes (most connected - your core abstractions)
1. `@mui/material` - 230 edges
2. `react` - 172 edges
3. `apiRequest()` - 158 edges
4. `useAction()` - 109 edges
5. `useNotify()` - 103 edges
6. `formatMoney()` - 101 edges
7. `Money()` - 97 edges
8. `TransactionService` - 91 edges
9. `FormTextField()` - 90 edges
10. `zod` - 89 edges

## Surprising Connections (you probably didn't know these)
- `Cadence` --uses--> `IntervalUnit`  [INFERRED]
  apps/api/app/subscription_detect.py → apps/api/app/enums.py
- `json()` --indirect_call--> `rows()`  [INFERRED]
  apps/api/tests/test_currencies.py → apps/api/tests/test_export.py
- `Maalu README` --semantically_similar_to--> `API layers: models -> schemas -> services -> routers`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `Maalu README` --semantically_similar_to--> `Money as Numeric(19,4)/Decimal, strings in JSON`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `Web auth via encrypted httpOnly cookie` --semantically_similar_to--> `Browser never talks to API (server functions, apiRequest)`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md

## Import Cycles
- 3-file cycle: `apps/api/app/services/__init__.py -> apps/api/app/services/available.py -> apps/api/app/services/stats.py -> apps/api/app/services/__init__.py`
- 3-file cycle: `apps/api/app/services/__init__.py -> apps/api/app/services/imports.py -> apps/api/app/services/transaction.py -> apps/api/app/services/__init__.py`
- 3-file cycle: `apps/api/app/services/__init__.py -> apps/api/app/services/transfer_link.py -> apps/api/app/services/transaction.py -> apps/api/app/services/__init__.py`
- 4-file cycle: `apps/api/app/services/__init__.py -> apps/api/app/services/notification.py -> apps/api/app/services/available.py -> apps/api/app/services/stats.py -> apps/api/app/services/__init__.py`

## Hyperedges (group relationships)
- **API request lifecycle rules** — claude_api_layered_architecture, claude_user_scoped_queries, claude_domain_exceptions, claude_get_db_commit_before_response, claude_list_pagination [EXTRACTED 1.00]
- **Web data flow: server functions to loaders and mutations** — claude_browser_never_talks_to_api, claude_apiresult, claude_useaction_invalidate, claude_url_search_state, claude_apirequest_get_retry [EXTRACTED 1.00]
- **Money domain rules** — claude_money_decimal_strings, claude_exchange_rate_base_amount, claude_transfer_model, claude_categories_find_or_create, claude_split_items_allocation, claude_planned_counted_reported [EXTRACTED 1.00]
- **Spending sums governed by reported()** — docs_claude_api_accounts_transaction_reported, docs_claude_api_accounts_exclude_from_stats, docs_claude_api_accounts_balance_adjustment, docs_claude_api_categories_tags_vendors_rule_50_30_20, docs_claude_api_categories_tags_vendors_needs_wants [EXTRACTED 1.00]
- **Inputs to Available to spend** — docs_claude_api_planning_salary_available_to_spend, docs_claude_api_accounts_card_statement, docs_claude_api_planning_salary_spendable_override, docs_claude_api_planning_salary_planned_transfers, docs_claude_api_budget_goals_goals [EXTRACTED 1.00]
- **Credential and sign-in protection flow** — docs_claude_api_auth_security_sessions, docs_claude_api_auth_security_api_keys, docs_claude_api_auth_security_key_proxy, docs_claude_api_auth_security_rate_limit, docs_claude_api_auth_security_two_factor [INFERRED 0.85]
- **Reports built from the shared category totals and reported()** — docs_claude_api_reports_trends, docs_claude_api_reports_compare, docs_claude_api_reports_money_flow, docs_claude_api_reports_transactions_categories_endpoint, docs_claude_api_reports_category_buckets [EXTRACTED 1.00]
- **Daily/periodic procrastinate worker jobs** — docs_claude_api_platform_snapshot_balances_job, docs_claude_api_platform_generate_notifications_job, docs_claude_api_platform_email_notifications_job, docs_claude_api_platform_plan_subscriptions_job, docs_claude_api_platform_purge_orphan_attachments_job [EXTRACTED 1.00]
- **Suggest-only scans that create nothing until the user confirms** — docs_claude_api_subscriptions_suggested_subscriptions, docs_claude_api_transactions_link_transfer, docs_claude_api_transactions_refund_candidates, docs_claude_api_transactions_transfer_candidates [INFERRED 0.75]
- **Offsite backup and restore rehearsal** — docs_claude_deployment_backup_sh, docs_claude_deployment_age_encryption, docs_claude_deployment_rclone_upload, docs_claude_deployment_restore_drill [EXTRACTED 1.00]
- **In-app guides pipeline (web to Android)** — docs_claude_web_docs_doc_type, docs_claude_web_docs_docblocks, docs_claude_web_docs_export_docs, docs_claude_web_docs_android_docslogic [EXTRACTED 1.00]
- **Web sign-in security UI** — docs_claude_web_features_sessions_web, docs_claude_web_features_two_factor_web, docs_claude_web_features_password_card, docs_claude_web_features_second_factor_field [INFERRED 0.85]

## Communities (235 total, 37 thin omitted)

### Community 0 - "Alembic Migrations"
Cohesion: 0.02
Nodes (61): upgrade(), downgrade(), _normalize(), upgrade(), upgrade(), upgrade(), upgrade(), downgrade() (+53 more)

### Community 1 - "Web Charts & Account Summary"
Cohesion: 0.03
Nodes (137): AccountSummary(), CategoryDot(), ChartCard(), ChartTable, BarRow, HorizontalBars(), PairedBars(), PairedRow (+129 more)

### Community 2 - "Protected Pages & Filters"
Cohesion: 0.05
Nodes (128): AccountTransactionList(), ArchivedAccounts(), ChipFilter(), ConfirmDelete(), EmptyState(), fade, rise, GuideLinks() (+120 more)

### Community 3 - "Transaction Form Fields"
Cohesion: 0.03
Nodes (122): AccountCards, AccountFilters, FormLists, LocationField(), AccountChoice, AccountPicker(), messageAfterSave(), warningAfterExpense() (+114 more)

### Community 4 - "Web Server Functions & Dialogs"
Cohesion: 0.03
Nodes (143): submit(), submit(), MergeVendorDialog(), submit(), NotificationBell(), choose(), open(), readAll() (+135 more)

### Community 5 - "API Enums & Models"
Cohesion: 0.06
Nodes (43): is_spendable(), PaymentMethod, SplitTaskStatus, TransactionType, Account, ApiKey, BalanceSnapshot, SnapshotDirty (+35 more)

### Community 6 - "Web Dialogs (Accept, Adjust, Archive)"
Cohesion: 0.06
Nodes (100): AcceptSuggestionDialog(), submit(), schema, ArchiveButton(), KIND, schema, RotateDialog(), schema (+92 more)

### Community 7 - "Account Page Transactions"
Cohesion: 0.04
Nodes (99): AccountPlanned(), TransactionDialogs(), AccountTransactions, Actions(), Amount(), canEdit(), Details(), ActiveFilter (+91 more)

### Community 8 - "API Schemas (Cards, Kinds)"
Cohesion: 0.04
Nodes (46): CardKind, CategoryKind, server_info(), AccountRef, AttachmentResponse, BackupRestored, CardCreate, CardRef (+38 more)

### Community 9 - "Admin CLI Commands"
Cohesion: 0.03
Nodes (42): ask_for_password(), create_bucket(), is_local_database(), main(), reset_data(), reset_password(), test_email(), Settings (+34 more)

### Community 10 - "Subscriptions API"
Cohesion: 0.04
Nodes (49): IntervalUnit, SubscriptionStatus, accept_candidate(), _candidate_response(), create_subscription(), delete_subscription(), dismiss_candidate(), get_subscription() (+41 more)

### Community 11 - "Transaction Splits & Rules"
Cohesion: 0.05
Nodes (4): SplitInput, TransactionRuleError, data_changed(), TransactionService

### Community 12 - "API App & Health Tests"
Cohesion: 0.05
Nodes (54): create_app(), rate_limited(), schema_json(), BackupFormatError, BackupService, _checksum(), _decode(), _encode() (+46 more)

### Community 13 - "Accounts Router"
Cohesion: 0.05
Nodes (37): AccountGroup, set_total(), account_summary(), account_trends(), adjust_account(), archive_account(), _bad_statement(), balance_history() (+29 more)

### Community 14 - "Dashboard Category Cards"
Cohesion: 0.05
Nodes (64): CategoryBreakdown(), Section(), KIND, LatestTransactionsCard, title(), Figure(), Bar(), GoalCard (+56 more)

### Community 15 - "In-app Docs Renderer"
Cohesion: 0.06
Nodes (56): Callout(), Demo(), DocBlocks, Example(), Inline(), Shot(), Steps(), TONES (+48 more)

### Community 16 - "Salary Split API"
Cohesion: 0.06
Nodes (16): apply_salary_split(), count_salary_split_tasks(), create_rule(), delete_rule(), dismiss_salary_split_task(), list_rules(), list_salary_split_tasks(), salary_split_plan() (+8 more)

### Community 17 - "Dependency Injection & DB Session"
Cohesion: 0.04
Nodes (34): get_db(), get_account_service(), get_api_key_service(), get_attachment_service(), get_available_service(), get_backup_service(), get_budget_service(), get_card_service() (+26 more)

### Community 18 - "Goals API"
Cohesion: 0.06
Nodes (25): GoalAccountRef, GoalCreate, GoalEntryCreate, GoalEntryResponse, GoalResponse, GoalUpdate, TemplateCreate, TransactionCreate (+17 more)

### Community 19 - "Notifications Service"
Cohesion: 0.07
Nodes (30): generate_notifications(), _money(), NotificationService, _when(), budget_line(), listed(), look_every_time(), spend() (+22 more)

### Community 20 - "Salary Split Web"
Cohesion: 0.08
Nodes (56): PendingSplitCard, SalaryRulesCard(), LineRow(), MadeList(), ProposedLines(), SalarySplitDialog(), submit(), undo() (+48 more)

### Community 21 - "Budget Cards & Alerts"
Cohesion: 0.07
Nodes (53): BudgetAlert(), Bar(), BudgetLineCard, BudgetSummary(), KindSplit(), BudgetGoalsCard, Meter(), BudgetExample() (+45 more)

### Community 22 - "API Key Scopes"
Cohesion: 0.06
Nodes (45): action_for(), allowed(), area_of(), required_scope(), role_for(), strip_prefix(), valid_scopes(), get_principal() (+37 more)

### Community 23 - "Transactions Router & Bulk"
Cohesion: 0.09
Nodes (26): bulk_purge_transactions(), bulk_restore_transactions(), bulk_trash_transactions(), bulk_update_transactions(), category_months(), category_totals(), _check_dates(), _check_range() (+18 more)

### Community 24 - "Refund Linking Tests"
Cohesion: 0.11
Nodes (59): candidates(), deposit(), line(), link(), test_a_different_category_is_refused(), test_a_linked_refund_is_spending_taken_back_not_income(), test_a_purchase_with_items_is_refunded_item_by_item(), test_a_refund_cannot_be_moved_but_can_be_unlinked() (+51 more)

### Community 25 - "Attachments & Storage Cleanup"
Cohesion: 0.06
Nodes (17): purge_orphan_attachments(), TransactionAttachment, AttachmentNotFoundError, AttachmentRuleError, AttachmentService, AttachmentTooLargeError, clean_filename(), LinkService (+9 more)

### Community 26 - "Spending & Budget Rules"
Cohesion: 0.07
Nodes (8): BudgetLineRuleError, BudgetService, _check_range(), _overlap(), _percent(), _runs_in(), _span_of(), _status()

### Community 27 - "App Shell & Auth Layout"
Cohesion: 0.07
Nodes (46): AppShell(), AuthLayout(), DARK, Wash(), BottomNav(), MoreSheet(), Brand(), ColorModeToggle() (+38 more)

### Community 28 - "Chart Primitives"
Cohesion: 0.07
Nodes (46): AreaChart(), ChartTooltip(), TooltipRow, ColumnGroup, ColumnPairs(), ColumnSeries, NetBars(), NetGroup (+38 more)

### Community 29 - "Import Review UI"
Cohesion: 0.09
Nodes (48): ImportReview(), submit(), ResultDialog(), Row, ReviewSummary(), Amount(), dim(), Flag() (+40 more)

### Community 30 - "Platform Docs (Jobs, Backup, Email)"
Cohesion: 0.05
Nodes (59): Platform (API and its web side) doc, Background jobs (procrastinate worker), Backup and restore, Backup EXCLUDED tables list, Balance snapshots, Email digest (SMTP mailer), email_notifications job (every 10 min), formatMoney (+51 more)

### Community 31 - "Accounts & Cards Docs"
Cohesion: 0.05
Nodes (41): Account detail page (/accounts/$id), AccountService, Account trends sparklines, BackupService, Balance history (GET /accounts/{id}/balance-history), Cards (/cards, debit and credit), Accounts and cards doc, AccountService._movements (+33 more)

### Community 32 - "Balance Chart & Range Fields"
Cohesion: 0.06
Nodes (44): AccountBalanceChart, AmountRangeField(), check(), Range, AreaPoint, DateRangeField(), iso(), pad() (+36 more)

### Community 33 - "Sparklines & Card Statements"
Cohesion: 0.07
Nodes (43): AccountSpark, TREND_DAYS, CardStatementPanel, Figure(), TONE_ACCENT, AccountCard(), AdjustButton(), GROUP_TILE (+35 more)

### Community 34 - "Snapshots & Net Worth Tests"
Cohesion: 0.12
Nodes (43): snapshot_balances(), days_ago(), drivers(), test_a_balance_adjustment_is_its_own_driver(), test_a_debt_counts_below_zero(), test_a_period_wholly_in_the_past_agrees_with_the_balance_trend(), test_a_refund_takes_away_from_spending(), test_a_transfer_between_two_accounts_that_count_changes_nothing() (+35 more)

### Community 35 - "Settings Cards (Backup, Password)"
Cohesion: 0.07
Nodes (41): BackupCard(), restore(), ChangePasswordDialog(), submit(), password, passwordSchema(), KINDS, NotificationSettings() (+33 more)

### Community 36 - "Bulk Edit Dialog"
Cohesion: 0.06
Nodes (47): blank, BulkEditDialog(), submit(), schema, tagList, CategoryField(), filter, NameOption() (+39 more)

### Community 37 - "Legends, Swatches & Kind Tables"
Cohesion: 0.08
Nodes (43): Legend(), KindMonthsTable, nameOf(), sticky, TrendsTable, cat(), ACCENT_NAMES, categoryAccent() (+35 more)

### Community 38 - "Budget Router"
Cohesion: 0.08
Nodes (25): create_line(), create_move(), delete_line(), get_budget(), line_history(), undo_move(), update_budget(), update_line() (+17 more)

### Community 39 - "Attachments Field & Links"
Cohesion: 0.08
Nodes (46): AttachmentsField(), Row(), Thumb(), Tile(), LinkAdder(), add(), onEnter(), schema (+38 more)

### Community 40 - "Filter Tests"
Cohesion: 0.10
Nodes (42): names(), seed_subs(), seed_vendors(), sub(), test_filters_only_see_your_own_rows(), test_subscription_filters_combine_with_paging_and_total(), test_subscription_search_covers_name_category_and_vendor(), test_subscription_status_and_period_filters() (+34 more)

### Community 41 - "File Storage & MIME Detection"
Cohesion: 0.08
Nodes (27): detect_mime_type(), LocalStorage, walk(), write(), S3Storage, walk(), set_storage(), StoredObject (+19 more)

### Community 42 - "Available to Spend Card"
Cohesion: 0.08
Nodes (35): AvailableCard, Row(), Section(), Working(), PlanExample(), PlanAgenda, Row, Block() (+27 more)

### Community 43 - "Background Job Tests"
Cohesion: 0.11
Nodes (31): email_notifications_job(), generate_notifications_job(), plan_subscriptions(), plan_subscriptions_job(), purge_expired_sessions_job(), purge_orphan_attachments_job(), refresh_exchange_rates_job(), snapshot_balances_job() (+23 more)

### Community 44 - "Subscription Form Schema"
Cohesion: 0.08
Nodes (37): submit(), Schema, subscriptionDefaults(), SubscriptionFormInput, SubscriptionFormOutput, subscriptionSchema(), today(), accountChange() (+29 more)

### Community 45 - "API Keys Router"
Cohesion: 0.11
Nodes (17): create_key(), delete_key(), list_keys(), _present(), rotate_key(), scope_catalog(), update_key(), whoami() (+9 more)

### Community 46 - "Budget Date Tests"
Cohesion: 0.19
Nodes (33): add(), cid(), spend(), test_a_limit_can_gain_and_lose_its_dates(), test_a_limit_with_dates_and_a_per_period_one_can_share_a_category(), test_a_limit_with_dates_cannot_roll_over(), test_a_limit_with_dates_counts_the_whole_range_once(), test_a_parent_category_covers_its_children_in_a_limit_with_dates() (+25 more)

### Community 47 - "Account Form Sections"
Cohesion: 0.11
Nodes (32): AccountActions(), CardFields(), ForeignRateFields(), accountDefaults(), AccountFormControl, AccountFormInput, AccountFormOutput, accountRequest() (+24 more)

### Community 48 - "Tags Service"
Cohesion: 0.11
Nodes (3): normalize_name(), TagService, TemplateService

### Community 49 - "Transfer Link Tests"
Cohesion: 0.20
Nodes (36): account(), entry(), link(), pair(), suggestions(), summary(), test_a_day_or_two_apart_is_still_a_pair_but_not_a_week(), test_a_dismissed_pair_is_not_suggested_again() (+28 more)

### Community 50 - "Categories Service"
Cohesion: 0.11
Nodes (4): _categories(), CategoryParentError, CategoryProtectedError, CategoryService

### Community 51 - "Currency Pickers & Select All"
Cohesion: 0.09
Nodes (32): CurrencyChips(), CurrencyField(), filterOptions, SelectAllMatching(), selectAll(), TwoFactorStep(), submit(), currencyName() (+24 more)

### Community 53 - "API Keys Settings UI"
Cohesion: 0.12
Nodes (31): ApiKeysCard(), KeyRow, KeyFormDialog(), submit(), toggle(), schema, submit(), SecretDialog() (+23 more)

### Community 54 - "Auth Router & Sessions"
Cohesion: 0.11
Nodes (14): change_password(), client_ip(), _confirm_error(), end_other_sessions(), list_sessions(), login(), login_two_factor(), logout() (+6 more)

### Community 55 - "Link Refund Dialog"
Cohesion: 0.14
Nodes (30): describeTransaction(), LinkRefundDialog(), choose(), submit(), linkSchema(), refundDefaults(), refundFields(), RefundFormInput (+22 more)

### Community 56 - "Rate Limiting"
Cohesion: 0.11
Nodes (17): _account(), check_api_key(), check_login(), check_place_search(), check_register(), check_two_factor(), login_failed(), login_succeeded() (+9 more)

### Community 57 - "Statement Import Service"
Cohesion: 0.12
Nodes (4): ImportRowIn, ImportService, _safe(), _signed()

### Community 58 - "Account Polish Tests"
Cohesion: 0.16
Nodes (33): account(), adjust(), balance(), month_expense(), month_income(), spend(), test_a_card_can_have_a_credit_limit(), test_a_foreign_account_is_adjusted_in_its_own_currency() (+25 more)

### Community 59 - "Category Tree Tests"
Cohesion: 0.19
Nodes (32): activity(), all_categories(), family(), line(), make(), spend(), test_a_budget_line_on_a_parent_counts_its_children(), test_a_category_can_move_under_a_parent_and_back() (+24 more)

### Community 60 - "Location Tests"
Cohesion: 0.16
Nodes (32): places(), spend(), test_a_bad_location_is_refused(), test_a_blank_place_name_clears_the_name(), test_a_location_can_be_added_changed_and_removed(), test_a_refund_takes_its_amount_off_the_spot(), test_a_spot_takes_the_name_most_of_them_gave(), test_a_spot_that_straddles_a_grid_edge_is_still_one_spot() (+24 more)

### Community 62 - "Two-Factor Secrets"
Cohesion: 0.10
Nodes (18): decrypt_secret(), encrypt_secret(), _fernet(), hash_recovery_code(), looks_like_recovery_code(), matching_step(), new_recovery_codes(), new_secret() (+10 more)

### Community 63 - "Session Tests"
Cohesion: 0.12
Nodes (23): Clock, clock(), code_clock(), ids(), sign_in(), test_a_failed_two_factor_change_signs_nobody_out(), test_a_long_browser_name_is_cut_to_fit(), test_a_session_ends_after_thirty_days_unused() (+15 more)

### Community 64 - "Two-Factor Tests"
Cohesion: 0.13
Nodes (26): Clock, clock(), login(), secured(), sign_in(), test_a_challenge_for_someone_without_two_factor_is_refused(), test_a_challenge_is_not_an_access_token(), test_a_code_cannot_be_used_twice() (+18 more)

### Community 65 - "Passwords & Admin 2FA"
Cohesion: 0.12
Nodes (5): disable_two_factor(), hash_password(), verify_password(), UserService, test_the_service_only_checks_the_current_password_when_asked_to_change_it()

### Community 66 - "Budget Periods"
Cohesion: 0.18
Nodes (22): next_period_start(), period_bounds(), period_start(), previous_period_start(), move(), test_a_history_is_private(), test_a_limit_gives_at_most_what_it_has_left(), test_a_limits_history_lists_every_move_undone_ones_too() (+14 more)

### Community 67 - "Rate Refresh"
Cohesion: 0.16
Nodes (26): refresh_exchange_rates(), history(), make_account(), stored_rate(), test_a_pair_the_source_does_not_know_is_skipped(), test_a_short_stretch_is_served_from_what_a_longer_one_kept(), test_a_source_that_is_down_changes_nothing_and_the_job_does_not_fail(), test_an_account_in_the_base_currency_has_nothing_to_follow() (+18 more)

### Community 68 - "Mailer"
Cohesion: 0.09
Nodes (21): MailError, set_sender(), digest(), due_payment(), outbox(), test_a_failed_send_is_tried_again(), refuse(), test_a_test_email_goes_to_your_own_address() (+13 more)

### Community 70 - "API Keys Service"
Cohesion: 0.12
Nodes (8): ApiKeyNotFoundError, ApiKeyRuleError, ApiKeyService, _aware(), grace_until(), new_secret(), _now(), status_of()

### Community 71 - "Installment Tests"
Cohesion: 0.18
Nodes (26): due_notes(), get(), look_every_time(), make(), notes(), pay_next(), test_a_completed_plan_is_not_counted_in_the_monthly_cost(), test_a_payment_made_by_hand_counts() (+18 more)

### Community 72 - "Places Router"
Cohesion: 0.10
Nodes (10): search_for_places(), PlaceSearchHit, PlaceSearchResponse, GeocoderDisabledError, GeocoderUnavailableError, _get(), _hit(), _pace() (+2 more)

### Community 73 - "Salary Category Tests"
Cohesion: 0.16
Nodes (24): salary(), test_a_backup_restores_into_a_fresh_account_that_already_has_salary(), test_a_subscription_and_an_expense_template_cannot_use_salary(), test_an_expense_cannot_be_moved_into_salary(), test_bulk_edit_skips_salary_on_spending(), test_every_account_has_a_salary_category(), test_income_changed_to_salary_cannot_then_be_linked(), test_only_income_goes_in_salary() (+16 more)

### Community 74 - "Web Package Dependencies"
Cohesion: 0.09
Nodes (29): devDependencies, oxfmt@^0.72.0, oxlint@^1.87.0, @playwright/test@^1.64.1, react-doctor@^0.9.17, react-scan@^0.5.7, @types/leaflet@^1.9.22, @types/node@^24.19.1 (+21 more)

### Community 75 - "Salary Rule Schemas"
Cohesion: 0.13
Nodes (16): SalaryRuleMode, _check_value(), SalaryRuleCreate, SalaryRuleUpdate, SalarySplitApply, SalarySplitItem, SalarySplitLine, SalarySplitMade (+8 more)

### Community 76 - "Attachments Router"
Cohesion: 0.13
Nodes (10): add_link(), delete_attachment(), delete_link(), download_attachment(), list_attachments(), list_links(), _not_found(), upload_attachment() (+2 more)

### Community 77 - "Tags Router"
Cohesion: 0.13
Nodes (10): create_tag(), delete_tag(), _get_or_404(), get_tag(), list_tags(), merge_tag(), rename_tag(), TagCreate (+2 more)

### Community 78 - "Salary Task Tests"
Cohesion: 0.33
Nodes (26): account(), balance(), count(), pay(), rule(), split_url(), tasks(), test_a_made_line_cannot_be_made_twice() (+18 more)

### Community 79 - "Group Dialog"
Cohesion: 0.11
Nodes (22): reload(), take(), GroupDialog(), submit(), schema, submit(), problems(), groupedMessage() (+14 more)

### Community 80 - "services: Filter for vendors by whether they are"
Cohesion: 0.13
Nodes (4): VendorLocality, scale_money(), normalize_name(), VendorService

### Community 81 - "tests: test_card_statement.py"
Cohesion: 0.28
Nodes (25): ago(), kinds(), make(), repay(), spend(), statement(), test_a_card_close_to_its_limit_is_told_once_a_month(), test_a_card_well_under_its_limit_is_quiet() (+17 more)

### Community 82 - "tests: test_groups.py"
Cohesion: 0.20
Nodes (26): get_group(), make_group(), pair(), test_a_group_holds_at_most_fifty(), test_a_group_needs_two_to_fifty_transactions(), test_a_group_small_enough_to_dissolve_is_cleaned_by_the_service(), test_a_transaction_is_in_one_group_only(), test_adding_one_from_another_group_is_refused() (+18 more)

### Community 83 - "tests: test_place_search.py"
Cohesion: 0.15
Nodes (20): fresh_cache(), search(), source(), test_a_different_area_is_a_different_search(), test_a_failure_is_not_remembered(), test_an_unreachable_geocoder_is_a_503(), test_it_can_be_turned_off(), test_it_finds_places_by_name() (+12 more)

### Community 84 - "tests: test_tags.py"
Cohesion: 0.20
Nodes (26): add(), expense(), _ids(), names(), test_bad_match_value_is_refused(), test_create_rename_and_clashes(), test_delete_only_unlinks(), test_deleting_a_transaction_for_good_keeps_the_tag() (+18 more)

### Community 85 - "tests: test_available_to_spend.py"
Cohesion: 0.27
Nodes (23): account(), dec(), get(), planned(), test_a_bill_from_an_account_kept_apart_is_not_counted(), test_a_bill_from_another_kind_of_account_is_not_counted(), test_a_goal_still_keeps_its_account_apart(), test_a_new_account_has_nothing_available() (+15 more)

### Community 86 - "routers: routers/group.py"
Cohesion: 0.19
Nodes (13): add_to_group(), create_group(), delete_group(), get_group(), _get_or_404(), _present_one(), remove_from_group(), _rule() (+5 more)

### Community 87 - "tests: test_salary_split.py"
Cohesion: 0.30
Nodes (22): account(), balance(), goal(), plan_url(), rule(), salary(), test_a_goal_in_another_currency_than_the_salary_is_refused(), test_a_goal_that_follows_an_account_gets_a_transfer() (+14 more)

### Community 88 - "e2e: api-keys.spec.ts"
Cohesion: 0.12
Nodes (3): open(), PAGES, @playwright/test

### Community 89 - "e2e: backup.spec.ts"
Cohesion: 0.14
Nodes (13): Account, backedUp(), newPerson(), Summary, apiAs(), signUp(), setUp(), inMonth() (+5 more)

### Community 90 - "schemas: auth.py"
Cohesion: 0.16
Nodes (16): read_me(), registration_status(), update_me(), EndedSessions, PasswordChange, RecoveryCodes, RegistrationStatus, SessionResponse (+8 more)

### Community 91 - "schemas: BulkResult"
Cohesion: 0.11
Nodes (7): BulkResult, BulkSkipped, CategoryTotals, PostPlanned, RefundOfRef, TransactionTotals, _not_applicable()

### Community 92 - "misc: create_category()"
Cohesion: 0.14
Nodes (8): create_category(), delete_category(), get_category(), _get_or_404(), list_categories(), merge_category(), set_category_kinds(), update_category()

### Community 93 - "tests: test_planned.py"
Cohesion: 0.24
Nodes (21): account(), add(), planned(), test_a_budget_ignores_planned_until_posted(), test_a_goal_ignores_planned_transfers(), test_a_planned_transaction_is_flagged_and_defaults_to_posted(), test_an_account_balance_ignores_planned_until_posted(), test_bulk_actions_reach_planned_ones() (+13 more)

### Community 94 - "budget-line-form: CategoriesPicker.tsx"
Cohesion: 0.18
Nodes (21): CategoriesPicker(), isDated(), isWindowed(), LimitControl, limitDefaults(), limitFields(), limitSchema, LimitValues (+13 more)

### Community 95 - "misc: routers/transfer_link.py"
Cohesion: 0.14
Nodes (7): dismiss_suggestion(), link_transfer(), transfer_candidates(), transfer_suggestions(), TransferPair, TransferSuggestion, TransferLinkNotFoundError

### Community 96 - "services: cache_latest()"
Cohesion: 0.14
Nodes (11): cache_latest(), _get(), _keep(), market_rate(), MarketRate, rate_history(), RatePoint, refresh_rates() (+3 more)

### Community 97 - "tests: test_password.py"
Cohesion: 0.19
Nodes (17): body(), Clock, secured(), sign_in(), test_a_recovery_code_will_do(), test_a_wrong_current_password_changes_nothing(), test_a_wrong_password_is_refused_before_the_code_is_looked_at(), test_changing_the_password_leaves_two_factor_on() (+9 more)

### Community 98 - "tests: test_rate_limit.py"
Cohesion: 0.21
Nodes (16): clock(), creds(), fail_logins(), FakeClock, test_a_few_typos_then_the_right_password_start_from_zero(), test_an_unknown_email_is_limited_the_same_way(), test_it_does_nothing_when_switched_off(), test_it_unlocks_when_the_window_has_passed() (+8 more)

### Community 99 - "misc: docker-compose.yml"
Cohesion: 0.08
Nodes (23): environment, healthcheck, image, ports, volumes, FLOCI_STORAGE_MODE, POSTGRES_DB, POSTGRES_PASSWORD (+15 more)

### Community 100 - "misc: create_vendor()"
Cohesion: 0.15
Nodes (7): create_vendor(), delete_vendor(), _get_or_404(), get_vendor(), list_vendors(), merge_vendor(), update_vendor()

### Community 101 - "tests: test_budget.py"
Cohesion: 0.31
Nodes (19): add_line(), category_id(), line_of(), spend(), test_a_category_can_only_be_in_one_line(), test_budgets_are_per_user(), test_categories_in_a_line_cannot_be_deleted_but_can_be_merged(), test_delete_line_and_not_found() (+11 more)

### Community 102 - "services: What counts toward money: not in the t"
Cohesion: 0.17
Nodes (4): _as_date(), _created_day(), SnapshotService, _today()

### Community 103 - "services: BalancePoint"
Cohesion: 0.22
Nodes (5): BalancePoint, _month_start(), _point(), _round(), StatsService

### Community 104 - "tests: test_statements.py"
Cohesion: 0.17
Nodes (16): detect(), _headers(), parse_statement(), load(), test_a_bad_date_names_the_line(), test_a_newest_first_file_is_read_oldest_first(), test_bml_balances(), test_bml_counterparty_by_kind() (+8 more)

### Community 105 - "tests: test_bulk.py"
Cohesion: 0.26
Nodes (19): add(), get(), names(), test_a_split_still_takes_the_other_fields(), test_bulk_add_and_remove_tags(), test_bulk_restore_and_purge_only_touch_the_trash(), test_bulk_set_category_vendor_and_method(), test_bulk_trash_moves_them_all() (+11 more)

### Community 106 - "tests: test_transfers.py"
Cohesion: 0.30
Nodes (18): account(), balance(), ordinary(), test_cannot_transfer_with_other_users_accounts(), test_changing_the_type_of_a_transaction(), test_cross_currency_transfer_needs_the_received_amount(), test_deleting_the_destination_account_keeps_the_transfer(), test_editing_and_deleting_a_transfer_keeps_balances_right() (+10 more)

### Community 107 - "misc: environment"
Cohesion: 0.15
Nodes (22): environment, APP_URL, ATTACHMENTS_S3_ACCESS_KEY_ID, ATTACHMENTS_S3_BUCKET, ATTACHMENTS_S3_ENDPOINT, ATTACHMENTS_S3_REGION, ATTACHMENTS_S3_SECRET_ACCESS_KEY, DATABASE_URL (+14 more)

### Community 108 - "app: export.py"
Cohesion: 0.15
Nodes (7): build_workbook(), _categories(), _num(), _signed_base(), _type_label(), _write_rows(), test_workbook_builder_handles_no_rows()

### Community 110 - "routers: add_entry()"
Cohesion: 0.22
Nodes (9): add_entry(), create_goal(), delete_entry(), delete_goal(), get_goal(), _get_or_404(), list_goals(), _one() (+1 more)

### Community 111 - "misc: import_report()"
Cohesion: 0.13
Nodes (5): import_report(), import_rows(), list_imports(), preview_import(), undo_import()

### Community 112 - "app: schedule.py"
Cohesion: 0.18
Nodes (11): monthly_cost(), monthly_factor(), nearest_occurrence_index(), next_due_date(), occurrence(), test_monthly_anchor_clamps_then_recovers(), test_monthly_cost_conversion(), test_nearest_index_ties_go_to_earlier_cycle() (+3 more)

### Community 113 - "tests: security.py"
Cohesion: 0.16
Nodes (11): _decode(), hash_session_token(), new_session_token(), jwt_for(), test_duplicate_email_conflicts(), test_garbage_and_foreign_tokens_are_refused(), test_login_wrong_password_and_unknown_user(), test_me() (+3 more)

### Community 114 - "tests: test_accounts.py"
Cohesion: 0.27
Nodes (17): make_account(), test_account_currency_locked_once_it_has_transactions(), test_balance_follows_linked_transactions(), test_cannot_link_to_an_account_in_another_currency(), test_create_defaults(), test_delete_keeps_transactions(), test_filter_accounts_by_bank(), test_filter_transactions_by_account() (+9 more)

### Community 115 - "tests: test_seed.py"
Cohesion: 0.24
Nodes (15): count(), db(), run(), test_accounts_goals_and_budget_are_in_place(), test_debit_cards_are_tied_to_their_bank_accounts(), test_every_bill_was_paid_once_and_the_next_is_planned(), test_refuses_to_run_against_a_remote_database(), test_rerunning_replaces_the_demo_user_instead_of_piling_up() (+7 more)

### Community 116 - "app: statements.py"
Cohesion: 0.19
Nodes (10): _bml(), _clean(), _method(), _mib(), _money(), _order(), Statement, StatementError (+2 more)

### Community 117 - "tests: test_category_months.py"
Cohesion: 0.34
Nodes (17): add(), months(), row(), test_a_refund_takes_away_from_the_month_it_arrives_in(), test_a_split_transaction_counts_under_each_items_category(), test_at_most_three_years_and_the_dates_must_be_in_order(), test_dates_outside_the_range_are_left_out(), test_every_month_is_listed_and_amounts_line_up() (+9 more)

### Community 118 - "tests: test_goals.py"
Cohesion: 0.33
Nodes (17): account(), entry(), goal(), test_account_goal_counts_transfers_into_the_account_as_contributions(), test_account_rules(), test_deleting_the_account_falls_back_to_the_log(), test_goal_following_an_account_uses_its_balance(), test_goal_is_reached() (+9 more)

### Community 119 - "tests: test_templates.py"
Cohesion: 0.28
Nodes (17): account(), body(), make(), test_account_sets_the_currency(), test_amount_and_most_fields_are_optional(), test_archived_account_is_refused(), test_category_and_vendor_are_found_or_created(), test_create_returns_what_the_form_needs() (+9 more)

### Community 120 - "web: dependencies"
Cohesion: 0.10
Nodes (20): dependencies, @emotion/cache@^11.14.0, @emotion/react@^11.14.0, @emotion/styled@^11.14.1, @fontsource-variable/inter@^5.3.0, @hookform/resolvers@^7.0.6, @mui/icons-material@^9.4.0, @mui/material@^9.4.0 (+12 more)

### Community 121 - "lib: lib/places.ts"
Cohesion: 0.17
Nodes (18): LocationDialog(), drop(), here(), pick(), save(), typed(), schema, DEFAULT_CENTER (+10 more)

### Community 122 - "services: What counts as income and spending in "
Cohesion: 0.11
Nodes (4): CategoryMonths, _month_end(), _months_between(), _shift_months()

### Community 123 - "misc: CurrencyList"
Cohesion: 0.13
Nodes (4): CurrencyList, get_currencies(), get_market_rate(), get_rate_history()

### Community 124 - "misc: delete_notification()"
Cohesion: 0.15
Nodes (5): delete_notification(), list_notifications(), read_all(), read_notification(), unread_count()

### Community 125 - "tests: test_login_alert.py"
Cohesion: 0.18
Nodes (12): describe_device(), render(), send(), sign_in(), test_a_failing_mail_server_never_fails_the_sign_in(), test_a_wrong_password_sends_no_alert(), test_devices_are_named_like_the_web_does(), test_it_can_be_turned_off_and_is_on_by_default() (+4 more)

### Community 126 - "web: tsconfig.json"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+10 more)

### Community 127 - "claude: AccountPicker autocomplete with balances"
Cohesion: 0.15
Nodes (19): AccountPicker autocomplete with balances, apiRequest, AuthLayout wash and Logo, Budget warning after save / BudgetAlert, Category colours (categoryAccent, CategoryDot), Hand-drawn dashboard charts, Navigation (NAV_ITEMS, SideNav, MoreSheet), PasswordCard / ChangePasswordDialog (+11 more)

### Community 129 - "routers: routers/card.py"
Cohesion: 0.23
Nodes (6): create_card(), delete_card(), get_card(), _get_or_404(), list_cards(), update_card()

### Community 130 - "misc: available_to_spend()"
Cohesion: 0.19
Nodes (4): available_to_spend(), balance_trend(), monthly(), net_worth_drivers()

### Community 131 - "misc: create_template()"
Cohesion: 0.18
Nodes (6): create_template(), delete_template(), _get_or_404(), get_template(), list_templates(), rename_template()

### Community 132 - "services: CardNotFoundError"
Cohesion: 0.19
Nodes (3): CardNotFoundError, CardRuleError, CardService

### Community 133 - "tests: test_subscription_detect.py"
Cohesion: 0.26
Nodes (13): Charge, detect(), charges(), test_a_bill_that_changes_each_month_is_found_as_one_that_varies(), test_a_subscription_that_stopped_is_not_suggested(), test_a_wild_amount_is_not_a_subscription(), test_buying_often_at_irregular_times_is_not_a_pattern(), test_every_three_months_and_every_year() (+5 more)

### Community 134 - "tests: test_currencies.py"
Cohesion: 0.15
Nodes (8): fake_fetch(), _reset_cache(), test_cached_between_calls(), test_falls_back_when_source_down(), test_fetch_keeps_base_and_quotes_but_drops_rates(), json(), test_public_and_lists_codes(), test_serves_stale_cache_when_refresh_fails()

### Community 135 - "tests: test_splits.py"
Cohesion: 0.20
Nodes (15): _by_key(), test_category_or_splits_required(), test_category_totals_agree_with_the_overall_totals(), test_category_totals_are_per_user(), test_category_totals_follow_the_list_filters(), test_category_totals_spread_a_split_over_its_categories(), test_changing_total_of_split_transaction_needs_new_lines(), test_create_split_transaction() (+7 more)

### Community 136 - "claude: docker-compose.prod.yml"
Cohesion: 0.14
Nodes (16): name, services, volumes, attachments, pgdata, age encryption with AGE_RECIPIENT, scripts/backup.sh nightly offsite backup, Docker images, deployment, backups and restore drill (+8 more)

### Community 137 - "tests: test_cards.py"
Cohesion: 0.41
Nodes (14): account(), balance(), card(), expense(), test_a_credit_card_is_its_own_account_repaid_from_a_bank_account(), test_a_debit_card_spends_from_its_account(), test_a_transfer_is_not_paid_with_a_card(), test_an_explicit_payment_method_wins_and_a_mismatched_account_is_refused() (+6 more)

### Community 138 - "tests: test_export.py"
Cohesion: 0.38
Nodes (14): body(), download(), rows(), test_cells_are_real_numbers_and_dates_not_text(), test_downloads_an_xlsx_with_sensible_headers(), test_exports_follow_the_same_filters_as_the_list(), test_income_signs_and_foreign_currency_use_the_base_amount(), test_oldest_first() (+6 more)

### Community 139 - "tests: test_subscription_candidates.py"
Cohesion: 0.36
Nodes (14): found(), monthly(), pay(), test_a_bill_that_changes_each_month_is_suggested_as_varying(), test_a_charge_already_linked_to_a_subscription_is_not_counted_again(), test_a_clear_pattern_is_announced_once_in_the_bell(), test_a_repeating_charge_is_suggested(), test_a_vendor_that_already_has_a_subscription_is_not_suggested() (+6 more)

### Community 140 - "e2e: auth.spec.ts"
Cohesion: 0.17
Nodes (9): hydrated(), newEmail(), PASSWORD, signIn(), signOut(), totp(), turnOn(), Tx (+1 more)

### Community 141 - "lib: SessionsCard.tsx"
Cohesion: 0.21
Nodes (13): ROW_FILL, SessionRow, SessionsCard(), endOthers(), browserOf(), describeDevice(), systemOf(), UA (+5 more)

### Community 142 - "tests: test_account_numbers.py"
Cohesion: 0.23
Nodes (14): make(), test_an_account_can_keep_its_own_number_when_edited(), test_another_user_may_have_the_same_number(), test_backup_keeps_the_bank_and_number(), test_bad_numbers_are_a_422(), test_bank_and_number_are_saved_and_returned(), test_both_are_optional(), test_changing_to_a_taken_number_is_a_409() (+6 more)

### Community 143 - "tests: test_categories.py"
Cohesion: 0.32
Nodes (13): expense(), names(), test_categories_are_per_user(), test_category_filter_counts_only_the_matching_part_of_a_split(), test_delete_only_when_unused(), test_filter_transactions_by_category_including_split_items(), test_merge_moves_everything_then_removes_the_source(), test_rename_updates_everything_and_rejects_a_taken_name() (+5 more)

### Community 144 - "tests: test_picker_filters.py"
Cohesion: 0.28
Nodes (13): account(), amounts(), names(), seed_amounts(), test_account_search_balances_still_present_and_isolated(), test_account_search_is_literal_and_paged_with_total(), test_account_search_matches_name_and_description(), test_amount_range_applies_to_total_count_and_summary() (+5 more)

### Community 145 - "tests: test_varying_bills.py"
Cohesion: 0.42
Nodes (14): account(), planned(), subscription(), test_a_bill_in_the_base_currency_has_no_rate_to_set(), test_a_bill_that_does_not_vary_is_planned_at_its_amount_again(), test_a_subscription_does_not_vary_unless_marked(), test_a_varying_bill_is_an_estimate_on_the_plan(), test_a_varying_dollar_bill_is_estimated_at_the_last_amount_and_rate() (+6 more)

### Community 146 - "tests: test_vendor_defaults.py"
Cohesion: 0.35
Nodes (13): make(), tag_names(), test_defaults_are_found_or_created_by_name(), test_defaults_show_wherever_the_vendor_is_embedded(), test_deleting_a_tag_unlinks_it_from_vendors(), test_deleting_the_category_just_clears_the_default(), test_limits(), test_merging_a_category_moves_vendor_and_template_defaults() (+5 more)

### Community 147 - "web: scripts"
Cohesion: 0.12
Nodes (16): scripts, build, dev, e2e, fmt, fmt:check, gen:api, gen:docs (+8 more)

### Community 148 - "lib: loading-shapes.ts"
Cohesion: 0.17
Nodes (13): Corner, custom(), frameAt(), norm(), PROFILES, Pt, rad(), radialProfile() (+5 more)

### Community 149 - "api: Operator recovery commands (reset-password,"
Cohesion: 0.21
Nodes (8): Operator recovery commands (reset-password, disable-2fa), api_scopes.ROUTES, Sign-in and security doc, get_principal, Native app sign-in via session token, SessionService, UserService, X-Forwarded-For / FORWARDED_ALLOW_IPS

### Community 150 - "app: card_cycle.py"
Cohesion: 0.24
Nodes (8): day_in(), due_date(), last_close(), next_close(), _shift(), test_a_day_past_the_end_of_a_short_month_lands_on_its_last_day(), test_the_last_close_is_today_or_before(), test_the_payment_is_due_on_the_first_due_day_after_the_close()

### Community 151 - "tests: test_market_rate.py"
Cohesion: 0.31
Nodes (12): rate(), test_a_day_without_data_falls_back_to_the_nearest_earlier_one(), test_a_future_day_gets_the_latest_rate_marked_inexact(), test_a_past_day_is_fetched_once(), test_an_unknown_pair_is_not_found(), test_an_unreachable_source_is_a_503(), test_lowercase_codes_are_accepted(), test_requires_auth() (+4 more)

### Community 152 - "tests: test_transaction_search.py"
Cohesion: 0.40
Nodes (12): body(), cats(), find(), test_search_combines_with_filters_paging_and_total(), test_search_finds_transfers_by_either_account(), test_search_is_case_insensitive_and_trims(), test_search_matches_category_and_description(), test_search_matches_vendor_subscription_and_account_names() (+4 more)

### Community 153 - "utils: api.v1.$.ts"
Cohesion: 0.23
Nodes (12): handle(), Route, Credential, credentialFromAuthorization(), forwardKeyRequest(), isOpenRoute(), json(), keyFromAuthorization() (+4 more)

### Community 154 - "misc: Git rule: stage the work, never commit"
Cohesion: 0.13
Nodes (13): Parity: Accounts and cards, Still to build on Android, Parity: Bills and subscriptions, Parity: Budget, goals and planning, Parity: Categories, tags and vendors, Parity: Dashboard and reports, Feature parity table (PARITY.md), parity/features.json (+5 more)

### Community 155 - "tests: test_category_kind.py"
Cohesion: 0.34
Nodes (11): expense(), kinds(), make(), test_a_category_starts_unsorted_and_can_be_set_and_cleared(), test_a_kind_must_be_need_or_want(), test_a_sub_category_takes_its_parents_kind_unless_it_has_its_own(), test_category_totals_carry_the_effective_kind(), test_leaving_kind_out_of_an_update_keeps_it() (+3 more)

### Community 156 - "tests: test_default_account.py"
Cohesion: 0.35
Nodes (11): account(), test_an_archived_account_is_refused(), test_an_empty_update_changes_nothing(), test_archiving_the_default_account_clears_it(), test_deleting_the_default_account_clears_it(), test_each_user_has_their_own_default(), test_must_be_your_own_account(), test_no_default_account_at_first() (+3 more)

### Community 157 - "tests: test_trash.py"
Cohesion: 0.35
Nodes (11): add(), expense(), test_account_can_be_deleted_with_only_trashed_transactions(), test_category_in_trash_still_blocks_its_deletion(), test_delete_moves_to_trash_and_hides_everywhere(), test_permanent_delete_only_from_the_trash(), test_restore_brings_it_back_everywhere(), test_restore_needs_a_trashed_transaction() (+3 more)

### Community 158 - "tests: test_vendors.py"
Cohesion: 0.25
Nodes (11): test_both_vendor_refs_rejected(), test_create_with_vendor_name_reuses_vendor(), test_deleting_vendor_keeps_transactions(), test_duplicate_vendor_name_conflicts(), test_filter_transactions_by_vendor(), test_link_vendor_later_and_unlink(), test_unknown_vendor_id_rejected(), test_vendor_details_optional_and_updatable() (+3 more)

### Community 159 - "lib: docs-shots.spec.ts"
Cohesion: 0.15
Nodes (6): shoot(), toWebp(), parsed, publicDir, isRecord(), isWebManifest()

### Community 160 - "components: Providers.tsx"
Cohesion: 0.23
Nodes (7): NotifyProvider(), SlideUp(), Providers(), PwaRegister(), ReactScan(), startPwa(), Route

### Community 161 - "lib: InstallCard.tsx"
Cohesion: 0.23
Nodes (12): InstallCard(), install(), InstallPromptEvent, InstallState, isInstallPromptEvent(), isIos(), isStandalone(), listeners (+4 more)

### Community 162 - "misc: API keys Settings card (Change, Rotate, De"
Cohesion: 0.16
Nodes (9): API keys Settings card (Change, Rotate, Delete), API tests on in-memory SQLite, CLAUDE.md project guide, Per-feature notes in docs/claude/, Forms: react-hook-form + zod, FormDialog, FormTextField, Maalu monorepo (api, web, android, ios), ResponsiveTable rows as rounded bars, List state in URL search params (validateSearch) (+1 more)

### Community 163 - "misc: subscription_detect.py"
Cohesion: 0.18
Nodes (4): Candidate, Cadence, Series, _spread()

### Community 164 - "tests: conftest.py"
Cohesion: 0.21
Nodes (4): auth(), client(), signup(), names()

### Community 165 - "tests: test_account_archive.py"
Cohesion: 0.38
Nodes (10): expense(), make(), test_a_goal_cannot_follow_an_archived_account(), test_archive_hides_it_from_the_list_and_totals(), test_archive_is_private(), test_archived_account_leaves_the_balance_trend(), test_archiving_twice_keeps_the_first_time(), test_history_stays_but_new_transactions_are_refused() (+2 more)

### Community 166 - "tests: test_plan_transfers.py"
Cohesion: 0.55
Nodes (11): make(), plan(), planned_transfer(), test_a_card_repayment_with_no_statement_in_the_plan_counts(), test_a_description_names_the_transfer(), test_a_move_between_everyday_accounts_changes_nothing(), test_a_planned_transfer_to_savings_is_money_you_cannot_spend(), test_a_transfer_after_the_period_is_not_counted_yet() (+3 more)

### Community 167 - "tests: test_transaction_time.py"
Cohesion: 0.37
Nodes (10): add(), test_a_day_lists_latest_time_first_and_untimed_last(), test_bad_time_is_rejected(), test_export_has_a_time_column(), test_leaving_the_time_out_keeps_it(), test_posting_a_planned_one_can_set_the_time(), test_posting_can_clear_the_planned_time(), test_time_is_optional_and_comes_back() (+2 more)

### Community 168 - "misc: environment (2)"
Cohesion: 0.15
Nodes (13): environment, healthcheck, image, restart, volumes, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER (+5 more)

### Community 169 - "claude: Android DocsLogic.kt / DocsScreen.kt"
Cohesion: 0.24
Nodes (13): Android DocsLogic.kt / DocsScreen.kt, Live demo blocks (DEMO_IDS, Demos.tsx), Doc data type (lib/docs), DocBlocks renderer, Docs in-app guides (/docs), just docs-shots screenshot generator, exportDocs (docs.json for Android), GuideLinks / GUIDES_FOR_PAGE (+5 more)

### Community 170 - "schemas: routers/stats.py"
Cohesion: 0.29
Nodes (6): BalanceTrendResponse, MonthlyPoint, MonthlyResponse, NetWorthAccountChange, NetWorthDriver, NetWorthDrivers

### Community 171 - "tests: test_account_history.py"
Cohesion: 0.55
Nodes (10): account(), day(), test_a_transfer_moves_both_accounts_and_planned_ones_do_not_count(), test_history_is_private_and_the_days_are_bounded(), test_history_is_the_balance_at_the_end_of_each_day(), test_the_balance_after_each_transaction_ends_at_the_balance(), test_trends_are_per_person_and_validate_the_range(), test_trends_give_every_active_account_a_short_balance_curve() (+2 more)

### Community 172 - "tests: test_date_filter.py"
Cohesion: 0.39
Nodes (9): days(), seed(), test_export_follows_the_date_range_and_records_it(), test_invalid_dates_are_rejected(), test_open_ended_ranges(), test_range_drives_the_pager_total_and_combines_with_other_filters(), test_range_is_inclusive_at_both_ends(), test_totals_follow_the_date_range() (+1 more)

### Community 173 - "tests: test_links.py"
Cohesion: 0.42
Nodes (11): add(), make_transaction(), test_a_blank_title_is_none(), test_a_trashed_transaction_keeps_its_links_but_takes_no_new_ones(), test_add_list_delete(), test_at_most_ten_links(), test_bad_addresses_are_a_422(), test_links_are_in_the_backup_and_come_back_on_restore() (+3 more)

### Community 174 - "tests: test_select_all.py"
Cohesion: 0.41
Nodes (9): add(), test_bad_filters_are_still_rejected(), test_ids_are_only_yours(), test_ids_cover_every_match_not_one_page(), test_ids_follow_the_list_filters(), test_ids_leave_out_trashed_and_planned_unless_asked(), test_ids_refuse_to_hand_back_a_part(), test_ids_work_with_the_bulk_actions() (+1 more)

### Community 175 - "services: _mark()"
Cohesion: 0.18
Nodes (3): _mark(), mark_stale_snapshots(), _old()

### Community 176 - "tests: test_pagination.py"
Cohesion: 0.35
Nodes (8): expense(), sub(), test_no_limit_returns_everything_for_dropdowns(), test_subscriptions_pages_and_status_filtered_total(), test_totals_only_count_your_own_rows(), test_transactions_default_page_size_and_bounds(), test_transactions_total_follows_filters_and_ignores_the_page(), test_vendors_pages_and_total()

### Community 177 - "tests: test_registration.py"
Cohesion: 0.44
Nodes (8): creds(), mode(), _set(), test_a_refused_sign_up_creates_nothing(), test_auto_lets_only_the_first_account_register(), test_closed_lets_no_one_register_not_even_the_first(), test_existing_accounts_can_still_sign_in_when_closed(), test_open_lets_anyone_register()

### Community 178 - "tests: test_transactions.py"
Cohesion: 0.31
Nodes (8): test_create_and_list(), test_payment_method_required_and_validated(), test_payment_method_update_and_filter(), test_rejects_excess_precision(), test_required_fields_cannot_be_nulled(), test_requires_auth(), test_update_and_delete(), test_users_are_isolated()

### Community 179 - "lib: SubscriptionSuggestionsCard.tsx"
Cohesion: 0.42
Nodes (8): SubscriptionSuggestionsCard, amountPrefix(), candidateKey(), confidenceText(), everyText(), UNIT_WORD, IntervalUnit, SubscriptionCandidate

### Community 180 - "claude: apiAs helper"
Cohesion: 0.22
Nodes (10): apiAs helper, cards spec, End-to-end tests, open() / hydrated() helpers, pages spec, Playwright e2e suite (maalu_e2e database, ports 8101/3101), signUp helper (per-test user), totp(secret, steps) helper (+2 more)

### Community 183 - "web: web/.oxlintrc.json"
Cohesion: 0.20
Nodes (9): categories, correctness, suspicious, ignorePatterns, plugins, rules, eslint/array-callback-return, react/react-in-jsx-scope (+1 more)

### Community 184 - "map: PlacesMap.tsx"
Cohesion: 0.33
Nodes (7): leaflet@^1.9.4, PlacesMap(), popup(), Leaflet, useLeafletMap(), useMapConfig(), leaflet

### Community 185 - "server: server/cards.ts"
Cohesion: 0.27
Nodes (9): CardDialog(), submit(), canRepayFrom(), cardFormSchema, createCardFn, deleteCardFn, digits, fields (+1 more)

### Community 186 - "routes: api.attachments.ts"
Cohesion: 0.38
Nodes (5): Route, Route, Route, Route, proxyToApi()

### Community 187 - "misc: API layers: models -> schemas -> services "
Cohesion: 0.20
Nodes (5): API layers: models -> schemas -> services -> routers, ApiResult<T> return values, Services raise domain exceptions; routers map to HTTP, List endpoints: arrays + X-Total-Count, _conditions(), useAction and router.invalidate (no per-query caches)

### Community 188 - "misc: API_URL"
Cohesion: 0.20
Nodes (10): API_URL, MAP_ATTRIBUTION, MAP_TILE_URL, SESSION_SECRET, web, depends_on, environment, image (+2 more)

### Community 189 - "tests: test_currency.py"
Cohesion: 0.39
Nodes (7): test_defaults_to_base_currency(), test_filter_by_currency(), test_foreign_currency_converts(), test_invalid_rate_and_currency(), test_rate_ignored_for_base_currency(), test_rate_required_for_foreign_currency(), test_update_recomputes_base_amount()

### Community 190 - "lib: Sparkline.tsx"
Cohesion: 0.33
Nodes (6): COLOR, Sparkline, fmt(), Spark, SparkDirection, sparkline()

### Community 191 - "lib: NotificationBell.tsx"
Cohesion: 0.42
Nodes (5): NotificationItem, badgeText(), KIND_META, AppNotification, NotificationKind

### Community 194 - "tests: test_kind_filter.py"
Cohesion: 0.64
Nodes (6): ids(), setup(), test_a_kind_with_no_categories_matches_nothing(), test_a_sub_category_takes_its_parents_kind(), test_the_list_can_be_filtered_by_need_want_or_not_sorted(), test_the_totals_and_category_breakdown_follow_the_kind()

### Community 195 - "tests: test_settings.py"
Cohesion: 0.39
Nodes (5): test_each_user_has_their_own(), test_it_is_a_yes_or_no(), test_other_updates_leave_it_alone(), test_starting_from_a_template_is_on_by_default(), test_turn_it_off_and_on_again()

### Community 196 - "misc: condition"
Cohesion: 0.25
Nodes (8): condition, api, worker, command, depends_on, image, restart, volumes

### Community 197 - "misc: package.json"
Cohesion: 0.29
Nodes (7): devDependencies, oxlint-tsgolint@^7.0.2006, license, name, packageManager, private, oxlint-tsgolint

### Community 199 - "misc: exchange_rate and base_amount rule"
Cohesion: 0.33
Nodes (6): exchange_rate and base_amount rule, Apache License 2.0, Auth: argon2id, sessions, two-factor, rate limiting, just seed demo month, Maalu README, Web auth via encrypted httpOnly cookie

### Community 200 - "misc: depends_on"
Cohesion: 0.29
Nodes (7): depends_on, image, restart, volumes, condition, db, api

### Community 205 - "e2e: budget-dates.spec.ts"
Cohesion: 0.50
Nodes (3): inDays(), Setup, withTrip()

### Community 206 - "web: .oxfmtrc.json"
Cohesion: 0.40
Nodes (4): ignorePatterns, $schema, singleQuote, useTabs

### Community 207 - "public: sw.js"
Cohesion: 0.50
Nodes (3): PRECACHE, remember(), trim()

### Community 208 - "misc: Generated API types (just api-types, opena"
Cohesion: 0.40
Nodes (3): justfile commands, Shared fixture factories (test/fixtures.ts, withDefaults), Getting started (uv, just, Docker)

### Community 209 - "misc: .oxlintrc.json"
Cohesion: 0.40
Nodes (4): options, typeAware, typeCheck, $schema

### Community 212 - "e2e: cards.spec.ts"
Cohesion: 0.50
Nodes (3): Account, Card, Tx

### Community 214 - "public: Offline fallback page (offline.html)"
Cohesion: 0.50
Nodes (4): Offline fallback page (offline.html), Try again button (location.reload), Offline page and cached app files feature, Parity: Settings and the rest

## Ambiguous Edges - Review These
- `Web auth via encrypted httpOnly cookie` → `Auth: argon2id, sessions, two-factor, rate limiting`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to
- `Moving money between limits (BudgetMove)` → `Import CSV report`  [AMBIGUOUS]
  docs/claude/api/imports.md · relation: conceptually_related_to

## Knowledge Gaps
- **68 isolated node(s):** `maalu-api`, `RFC-6238`, `maalu`, `Maalu monorepo (api, web, android, ios)`, `Per-feature notes in docs/claude/` (+63 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1686 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@mui/material` connect `Transaction Form Fields` to `Web Charts & Account Summary`, `Protected Pages & Filters`, `Web Dialogs (Accept, Adjust, Archive)`, `Account Page Transactions`, `lib: SessionsCard.tsx`, `Dashboard Category Cards`, `In-app Docs Renderer`, `Salary Split Web`, `Budget Cards & Alerts`, `App Shell & Auth Layout`, `Chart Primitives`, `Import Review UI`, `Balance Chart & Range Fields`, `Sparklines & Card Statements`, `components: Providers.tsx`, `Settings Cards (Backup, Password)`, `Bulk Edit Dialog`, `Legends, Swatches & Kind Tables`, `lib: InstallCard.tsx`, `Attachments Field & Links`, `Available to Spend Card`, `Subscription Form Schema`, `Account Form Sections`, `Currency Pickers & Select All`, `lib: SubscriptionSuggestionsCard.tsx`, `API Keys Settings UI`, `Link Refund Dialog`, `map: PlacesMap.tsx`, `lib: Sparkline.tsx`, `lib: NotificationBell.tsx`, `src: router.tsx`, `Web Package Dependencies`, `Group Dialog`, `budget-line-form: CategoriesPicker.tsx`, `web: dependencies`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `maalu-api`, `RFC-6238`, `maalu` to the rest of the system?**
  _68 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Alembic Migrations` be split into smaller, more focused modules?**
  _Cohesion score 0.01770016631028748 - nodes in this community are weakly interconnected._
- **Why does `TransactionService` connect `Transaction Splits & Rules` to `API Enums & Models`, `Groups Service`, `API Schemas (Cards, Kinds)`, `Subscriptions API`, `Salary Rule Schemas`, `API App & Health Tests`, `Accounts Router`, `services: In the default Salary category: pay, w`, `Salary Split API`, `Dependency Injection & DB Session`, `Goals API`, `Categories Service`, `Tags Service`, `services: Filter for vendors by whether they are`, `Statement Import Service`, `services: What counts as income and spending in `, `schemas: BulkResult`, `Accounts Service`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `Web Charts & Account Summary` be split into smaller, more focused modules?**
  _Cohesion score 0.03302106172347352 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Web auth via encrypted httpOnly cookie` and `Auth: argon2id, sessions, two-factor, rate limiting`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Moving money between limits (BudgetMove)` and `Import CSV report`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._