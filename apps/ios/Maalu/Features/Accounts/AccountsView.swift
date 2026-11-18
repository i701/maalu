import SwiftUI

struct AccountsView: View {
    @Environment(Session.self) private var session
    @State private var model = AccountsModel()
    @State private var isAdding = false

    var body: some View {
        NavigationStack {
            List {
                if let message = model.errorMessage {
                    Text(message).foregroundStyle(.red)
                }
                if let summary = model.summary, !model.showsArchived, !model.accounts.isEmpty {
                    AccountsSummarySection(summary: summary)
                }
                ForEach(model.sections) { section in
                    Section(section.title) {
                        ForEach(section.accounts) { account in
                            NavigationLink(value: AccountRoute(id: account.id)) {
                                AccountRow(account: account, trend: model.trends[account.id])
                            }
                        }
                    }
                }
            }
            .overlay { AccountsPlaceholder(model: model) }
            .navigationTitle(model.showsArchived ? "Archived Accounts" : "Accounts")
            .toolbar {
                ToolbarItemGroup(placement: .primaryAction) {
                    AccountsViewMenu(model: model)
                    Toggle("Archived", systemImage: "archivebox", isOn: $model.showsArchived)
                    Button("Add Account", systemImage: "plus") { isAdding = true }
                }
            }
            .navigationDestination(for: AccountRoute.self) { route in
                AccountDetailView(listModel: model, id: route.id)
            }
            .sheet(isPresented: $isAdding) {
                AccountFormView(onSaved: reloadNow)
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
