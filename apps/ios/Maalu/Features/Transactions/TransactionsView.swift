import SwiftUI

struct TransactionsView: View {
    @Environment(Session.self) private var session
    @State private var model = TransactionsModel()
    @State private var isAdding = false
    @State private var isFiltering = false
    @State private var opened: Transaction?
    @State private var options = FilterOptionsModel()
    @State private var notice: String?
    @State private var selection = TransactionSelection()
    @State private var isBulkEditing = false
    @State private var isConfirmingDelete = false

    var body: some View {
        NavigationStack {
            List {
                TransactionSearchCard(
                    text: $model.filter.text,
                    chips: chips,
                    totals: model.isEmpty ? nil : model.totals,
                    filterCount: model.filter.detailCount,
                    onFilters: { isFiltering = true },
                    onRemove: remove
                )
                .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 12, trailing: 16))
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
                if !model.transferSuggestions.isEmpty {
                    TransferSuggestionsSection(suggestions: model.transferSuggestions, onChanged: changed, onFailed: { notice = $0 })
                }
                ForEach(model.days) { day in
                    TransactionDaySection(day: day, selection: selection, onTap: tap, onHold: hold)
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
            .listStyle(.plain)
            .overlay { TransactionsPlaceholder(model: model, retry: reloadNow, clearFilters: clearFilters) }
            .navigationTitle("Transactions")
            .navigationSubtitle(selection.isSelecting ? Text(selection.isWide ? "All \(selection.count) matching are selected" : "\(selection.count) selected") : Text(""))
            .sensoryFeedback(.selection, trigger: selection.count)
            .toolbar {
                if selection.isSelecting {
                    ToolbarItemGroup(placement: .primaryAction) {
                        TransactionSelectionMenu(selection: selection, onEdit: { isBulkEditing = true }, onDelete: { isConfirmingDelete = true }, onSelectAll: selectAll)
                        Button("Done", action: selection.finish)
                    }
                } else {
                    ToolbarItemGroup {
                        TransactionTypeMenu(selection: $model.filter.type, planned: $model.filter.planned)
                        Button("Select", systemImage: "checkmark.circle", action: selection.start)
                    }
                    ToolbarItem(placement: .primaryAction) {
                        Button("Add Transaction", systemImage: "plus") { isAdding = true }
                    }
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
            .sheet(isPresented: $isBulkEditing) {
                BulkEditView(selection: selection, onDone: bulkDone)
            }
            .confirmationDialog("Delete \(TransactionSelection.transactionCount(selection.count))?", isPresented: $isConfirmingDelete, titleVisibility: .visible) {
                Button("Delete", role: .destructive, action: trash)
            } message: {
                Text("They move to the trash.")
            }
            .onChange(of: model.filter) { selection.clearPicks() }
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

    /// A tap opens a transaction, or ticks it while rows are being picked.
    private func tap(_ transaction: Transaction) {
        if selection.isSelecting {
            selection.toggle(transaction.id)
        } else {
            opened = transaction
        }
    }

    /// Press and hold starts picking with this row ticked; while picking it ticks or unticks like a tap.
    private func hold(_ transaction: Transaction) {
        if !selection.isSelecting { selection.start() }
        selection.toggle(transaction.id)
    }

    private func selectAll() {
        Task {
            guard let api = session.api else { return }
            if let message = await selection.selectAll(loaded: model.loadedIDs, matching: model.matchCount, filter: model.filter, using: api) {
                notice = message
            }
        }
    }

    private func trash() {
        Task {
            guard let api = session.api else { return }
            bulkDone(await selection.trash(using: api))
        }
    }

    /// The rows changed, so they are picked no more and the list is read again.
    private func bulkDone(_ message: String) {
        selection.finish()
        changed(message)
    }

    private func clearFilters() {
        model.filter = TransactionFilter()
    }

    private func retryMore() {
        Task { await loadMore() }
    }
}
