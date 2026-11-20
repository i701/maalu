import SwiftUI

struct TransactionsView: View {
    @Environment(Session.self) private var session
    @State private var model = TransactionsModel()
    @State private var isAdding = false
    @State private var isFiltering = false
    @State private var opened: Transaction?
    @State private var options = FilterOptionsModel()
    @State private var notice: String?

    var body: some View {
        NavigationStack {
            List {
                if !chips.isEmpty {
                    TransactionFilterChips(chips: chips, onRemove: remove)
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                }
                if !model.transferSuggestions.isEmpty {
                    TransferSuggestionsSection(suggestions: model.transferSuggestions, onChanged: changed, onFailed: { notice = $0 })
                }
                if let totals = model.totals, !model.isEmpty {
                    TransactionTotalsSection(totals: totals)
                }
                ForEach(model.days) { day in
                    TransactionDaySection(day: day, onOpen: open)
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
            .sheet(item: $opened) { transaction in
                NavigationStack {
                    TransactionDetailView(model: model, id: transaction.id)
                }
                .presentationDetents([.large])
            }
            .sheet(isPresented: $isFiltering) {
                TransactionFiltersView(filter: model.filter) { model.filter = $0 }
            }
            .sheet(isPresented: $isAdding) {
                TransactionFormView(onSaved: reloadNow)
            }
            .alert("Transactions", isPresented: Binding(get: { notice != nil }, set: { if !$0 { notice = nil } })) {
            } message: {
                Text(notice ?? "")
            }
            .refreshable { await reload() }
            .task(id: model.filter) { await reload(debounced: !model.filter.text.isEmpty) }
            .task(id: isFiltering) { await loadOptions() }
        }
    }

    private var chips: [TransactionFilterChip] {
        model.filter.chips(accounts: options.accounts, categories: options.categories, cards: options.cards, tags: options.tags)
    }

    private func remove(_ chip: TransactionFilterChip) {
        model.filter = model.filter.removing(chip.kind)
    }

    private func loadOptions() async {
        guard let api = session.api else { return }
        await options.load(using: api)
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

    private func changed(_ message: String) {
        notice = message
        reloadNow()
    }

    private func open(_ transaction: Transaction) {
        opened = transaction
    }

    private func clearFilters() {
        model.filter = TransactionFilter()
    }

    private func retryMore() {
        Task { await loadMore() }
    }
}
