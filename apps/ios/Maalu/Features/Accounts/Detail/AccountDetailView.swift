import SwiftUI

struct AccountDetailView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    let listModel: AccountsModel
    let id: String
    @State private var model = AccountDetailModel()
    @State private var sheet: AccountSheet?
    @State private var isConfirmingDelete = false
    @State private var errorMessage: String?

    var body: some View {
        if let account = listModel.account(id: id) {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(account.isArchived ? "Archived" : (account.group.isLiability ? "Owed" : "Balance"))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        MoneyText(account.balance, currency: account.currency)
                            .font(.largeTitle)
                            .bold()
                    }
                }
                AccountFactsSection(account: account, baseCurrency: model.baseCurrency)
                AccountBalanceSection(model: model, account: account)
                AccountTransactionsSection(transactions: model.transactions, balances: model.balances, account: account)
            }
            .navigationTitle(account.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { toolbar(for: account) }
            .confirmationDialog("Delete this account?", isPresented: $isConfirmingDelete, titleVisibility: .visible) {
                Button("Delete", role: .destructive) { delete(account) }
            } message: {
                Text("Its transactions stay but lose their account. Archiving keeps everything.")
            }
            .sheet(item: $sheet) { sheet in
                switch sheet {
                case .edit(let account): AccountFormView(editing: account, onSaved: reload)
                case .adjust(let account): AdjustBalanceView(account: account, onSaved: reload)
                }
            }
            .alert("Something went wrong", item: $errorMessage) { _ in
            } message: { message in
                Text(message)
            }
            .task(id: model.range) { await loadDetail() }
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

    private func loadDetail() async {
        guard let api = session.api else { return }
        await model.load(accountID: id, using: api)
    }

    private func reload() {
        Task {
            guard let api = session.api else { return }
            await listModel.load(using: api)
            await model.load(accountID: id, using: api)
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
