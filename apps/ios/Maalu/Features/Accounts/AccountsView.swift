import SwiftUI

struct AccountsView: View {
    @Environment(Session.self) private var session
    @State private var model = AccountsModel()

    var body: some View {
        NavigationStack {
            List {
                if let message = model.errorMessage {
                    Text(message).foregroundStyle(.red)
                }
                ForEach(model.accounts) { account in
                    AccountRow(account: account)
                }
            }
            .overlay {
                if model.isLoading { ProgressView() }
            }
            .navigationTitle("Accounts")
            .refreshable { await load() }
            .task { await load() }
        }
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
    }
}
