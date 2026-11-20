import SwiftUI

struct AccountDetailView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    let listModel: AccountsModel
    let id: String
    @State private var model = AccountDetailModel()
    @State private var sheet: AccountSheet?
    @State private var isConfirmingDelete = false
    @State private var deletingCard: Card?
    @State private var isConfirmingCardDelete = false
    @State private var errorMessage: String?

    var body: some View {
        if let account = listModel.account(id: id) {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(balanceTitle(for: account))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        MoneyText(account.balance, currency: account.currency)
                            .font(.largeTitle)
                    }
                }
                if let month = model.month {
                    AccountMonthSection(month: month)
                }
                if let statement = model.statement {
                    AccountStatementSection(statement: statement, onRepay: model.repayingCard.map { card in { sheet = .repay(card, amount: Money.decimal(statement.remaining)) } })
                }
                AccountFactsSection(account: account, baseCurrency: model.baseCurrency, onShowRateHistory: { sheet = .rateHistory(account) })
                if let kind = CardKind.forAccount(in: account.group), !account.isArchived {
                    AccountCardsSection(
                        cards: model.cards,
                        kind: kind,
                        onAdd: { sheet = .addCard(account, kind) },
                        onEdit: { sheet = .editCard(account, $0) },
                        onDelete: confirmDeleteCard,
                        onRepay: { sheet = .repay($0, amount: nil) }
                    )
                }
                AccountBalanceSection(model: model, account: account)
                AccountTransactionsSection(model: model, account: account, loadMore: loadMore)
            }
            .searchable(text: $model.query, prompt: "Search this account")
            .navigationTitle(account.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { toolbar(for: account) }
            .confirmationDialog("Delete this account?", isPresented: $isConfirmingDelete, titleVisibility: .visible) {
                Button("Delete", role: .destructive) { delete(account) }
            } message: {
                Text("Its transactions stay but lose their account. Archiving keeps everything.")
            }
            .confirmationDialog("Delete this card?", isPresented: $isConfirmingCardDelete, titleVisibility: .visible) {
                Button("Delete", role: .destructive, action: deleteCard)
            } message: {
                Text("Its purchases stay on this account, with no card.")
            }
            .sheet(item: $sheet) { sheet in
                switch sheet {
                case .edit(let account): AccountFormView(editing: account, onSaved: reload)
                case .adjust(let account): AdjustBalanceView(account: account, onSaved: reload)
                case .addCard(let account, let kind):
                    CardFormView(account: account, kind: kind, accounts: listModel.accounts, onSaved: reload)
                case .editCard(let account, let card):
                    CardFormView(account: account, kind: card.kind, editing: card, accounts: listModel.accounts, onSaved: reload)
                case .repay(let card, let amount): TransactionFormView(seed: TransactionDraft(repaying: card, amount: amount), onSaved: reload)
                case .rateHistory(let account): RateHistoryView(account: account, baseCurrency: model.baseCurrency)
                }
            }
            .alert("Something went wrong", item: $errorMessage) { _ in
            } message: { message in
                Text(message)
            }
            .task(id: model.range) { await loadDetail() }
            .task(id: model.query) { await loadTransactions(debounced: !model.query.isEmpty) }
        } else {
            ContentUnavailableView("Account not found", systemImage: "questionmark.circle")
        }
    }

    @ToolbarContentBuilder
    private func toolbar(for account: Account) -> some ToolbarContent {
        ToolbarItem(placement: .primaryAction) {
            Menu("Actions", systemImage: "ellipsis.circle") {
                Button("Edit", systemImage: "pencil") { sheet = .edit(account) }
                if !account.isArchived {
                    Button("Adjust Balance", systemImage: "slider.horizontal.3") { sheet = .adjust(account) }
                }
                Button(account.isArchived ? "Unarchive" : "Archive", systemImage: "archivebox") { archive(account) }
                Button("Delete", systemImage: "trash", role: .destructive) { isConfirmingDelete = true }
            }
        }
    }

    private func balanceTitle(for account: Account) -> LocalizedStringKey {
        if account.isArchived { return "Archived · balance" }
        return account.group.isLiability ? "Owed" : "Balance"
    }

    private func loadDetail() async {
        guard let api = session.api else { return }
        let account = listModel.account(id: id)
        await model.load(accountID: id, hasStatement: account?.group == .card && account?.statementDay != nil, using: api)
    }

    private func loadTransactions(debounced: Bool = false) async {
        guard let api = session.api else { return }
        await model.loadTransactions(accountID: id, using: api, debounced: debounced)
    }

    private func loadMore() {
        Task {
            guard let api = session.api else { return }
            await model.loadMore(accountID: id, using: api)
        }
    }

    private func reload() {
        Task {
            guard let api = session.api else { return }
            await listModel.load(using: api)
            let account = listModel.account(id: id)
        await model.load(accountID: id, hasStatement: account?.group == .card && account?.statementDay != nil, using: api)
            await model.loadTransactions(accountID: id, using: api)
        }
    }

    private func confirmDeleteCard(_ card: Card) {
        deletingCard = card
        isConfirmingCardDelete = true
    }

    private func deleteCard() {
        guard let card = deletingCard else { return }
        Task {
            guard let api = session.api else { return }
            errorMessage = await model.deleteCard(card, using: api)
        }
    }

    private func archive(_ account: Account) {
        Task {
            guard let api = session.api else { return }
            if let message = await model.archive(account, using: api) {
                errorMessage = message
            } else {
                await listModel.load(using: api)
                dismiss()
            }
        }
    }

    private func delete(_ account: Account) {
        Task {
            guard let api = session.api else { return }
            if let message = await model.delete(account, using: api) {
                errorMessage = message
            } else {
                await listModel.load(using: api)
                dismiss()
            }
        }
    }
}
