import SwiftUI

/// A first signed-in screen: the accounts, to prove sign-in and the API end to end. The tabs come next.
struct HomeView: View {
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
            .toolbar {
                Button("Sign out") { Task { await session.signOut() } }
            }
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
