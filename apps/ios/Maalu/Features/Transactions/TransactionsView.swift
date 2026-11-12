import SwiftUI

struct TransactionsView: View {
    @Environment(Session.self) private var session
    @State private var model = TransactionsModel()

    var body: some View {
        NavigationStack {
            List {
                ForEach(model.days) { day in
                    TransactionDaySection(day: day)
                }
                if model.hasMore {
                    if model.errorMessage == nil {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .task { await loadMore() }
                    } else {
                        Button("Try again", action: retryMore)
                    }
                }
            }
            .overlay { TransactionsPlaceholder(model: model, retry: reloadNow) }
            .navigationTitle("Transactions")
            .searchable(text: $model.filter.text, prompt: "Search transactions")
            .toolbar {
                ToolbarItem { TransactionTypeMenu(selection: $model.filter.type) }
            }
            .refreshable { await reload() }
            .task(id: model.filter) { await reload(debounced: !model.filter.text.isEmpty) }
        }
    }

    private func reload(debounced: Bool = false) async {
        guard let api = session.api else { return }
        await model.reload(using: api, debounced: debounced)
    }

    private func loadMore() async {
        guard let api = session.api else { return }
        await model.loadMore(using: api)
    }

    private func reloadNow() {
        Task { await reload() }
    }

    private func retryMore() {
        Task { await loadMore() }
    }
}
