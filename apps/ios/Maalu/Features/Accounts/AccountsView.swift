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
                ForEach(model.groups) { section in
                    Section(String(localized: section.group.title)) {
                        ForEach(section.accounts) { account in
                            NavigationLink(value: account.id) {
                                AccountRow(account: account)
                            }
                        }
                    }
                }
            }
            .overlay { AccountsPlaceholder(model: model) }
            .navigationTitle(model.showsArchived ? "Archived Accounts" : "Accounts")
            .toolbar {
                ToolbarItemGroup(placement: .primaryAction) {
                    Toggle("Archived", systemImage: "archivebox", isOn: $model.showsArchived)
                    Button("Add Account", systemImage: "plus") { isAdding = true }
                }
            }
            .navigationDestination(for: String.self) { id in
                AccountDetailView(listModel: model, id: id)
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
