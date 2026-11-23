import SwiftUI

struct AccountsView: View {
    @Environment(Session.self) private var session
    @State private var model = AccountsModel()
    @State private var isAdding = false

    var body: some View {
        NavigationStack {
            CardPage {
                if let message = model.errorMessage {
                    Text(message).foregroundStyle(.red)
                }
                if let summary = model.summary, !model.showsArchived, !model.accounts.isEmpty {
                    AccountsSummarySection(summary: summary, accounts: model.accounts)
                }
                ForEach(model.sections) { section in
                    CardSection {
                        ForEach(section.accounts) { account in
                            CardLink(value: AccountRoute(id: account.id)) {
                                AccountRow(account: account, trend: model.trends[account.id], statement: model.statements[account.id])
                            }
                        }
                    } header: {
                        SectionTitle(verbatim: section.title)
                    }
                }
            }
            .overlay { AccountsPlaceholder(model: model) }
            .gradientHeader(.accentGreen)
            .environment(\.revealScreen, "accounts")
            .navigationTitle(model.showsArchived ? "Archived Accounts" : "Accounts")
            .toolbar {
                ToolbarItemGroup(placement: .primaryAction) {
                    AccountsViewMenu(model: model)
                        .accentTint(.accentGreen)
                    Toggle("Archived", systemImage: "archivebox", isOn: $model.showsArchived)
                        .accentTint(.accentGreen)
                    Button("Add Account", systemImage: "plus") { isAdding = true }
                        .accentTint(.accentGreen)
                }
            }
            .navigationDestination(for: AccountRoute.self) { route in
                AccountDetailView(listModel: model, id: route.id)
            }
            .sheet(isPresented: $isAdding) {
                Group {
                    AccountFormView(onSaved: reloadNow)
                }
                .accentTint(.accentGreen)
            }
            .refreshable { await load() }
            .task(id: model.showsArchived) { await load() }
        }
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
    }

    private func reloadNow() {
        Task { await load() }
    }
}
