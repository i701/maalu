import SwiftUI

struct TransactionsView: View {
    @Environment(Session.self) private var session
    @State private var model = TransactionsModel()
    @State private var isAdding = false
    @State private var isFiltering = false

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
            .overlay { TransactionsPlaceholder(model: model, retry: reloadNow, clearFilters: clearFilters) }
            .navigationTitle("Transactions")
            .searchable(text: $model.filter.text, prompt: "Search transactions")
            .toolbar {
                ToolbarItemGroup {
                    TransactionTypeMenu(selection: $model.filter.type, planned: $model.filter.planned)
                    Button("Filters", systemImage: "slider.horizontal.3") { isFiltering = true }
                        .foregroundStyle(model.filter.detailCount == 0 ? Color.primary : Color.accentColor)
                }
                ToolbarItem(placement: .primaryAction) {
                    Button("Add Transaction", systemImage: "plus") { isAdding = true }
                }
            }
            .navigationDestination(for: Transaction.self) { transaction in
                TransactionDetailView(model: model, id: transaction.id)
            }
            .sheet(isPresented: $isFiltering) {
                TransactionFiltersView(filter: model.filter) { model.filter = $0 }
            }
            .sheet(isPresented: $isAdding) {
                TransactionFormView(onSaved: reloadNow)
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

    private func clearFilters() {
        model.filter = TransactionFilter()
    }

    private func retryMore() {
        Task { await loadMore() }
    }
}
