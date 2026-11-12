import SwiftUI

/// The Accounts tab: every account with its balance.
struct AccountsView: View {
    @Environment(Session.self) private var session
    @State private var accounts: [Account] = []
    @State private var error: String?
    @State private var loading = true

    var body: some View {
        NavigationStack {
            List {
                if let error { Text(error).foregroundStyle(.red) }
                ForEach(accounts) { a in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(a.name)
                            Text([a.bank, a.group.capitalized].compactMap { $0 }.joined(separator: " · ")).font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text("\(a.currency) \(a.balance)").monospacedDigit()
                    }
                }
            }
            .overlay { if loading { ProgressView() } }
            .navigationTitle("Accounts")
            .refreshable { await load() }
            .task { await load() }
        }
    }

    private func load() async {
        guard let api = session.api else { return }
        let result: ApiResult<[Account]> = await api.get("accounts")
        loading = false
        switch result {
        case .ok(let list, _): accounts = list; error = nil
        case .failed(_, let message): error = message
        }
    }
}
