import SwiftUI

struct TransactionFiltersView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var filter: TransactionFilter
    @State private var options = FilterOptionsModel()
    private let onApply: (TransactionFilter) -> Void

    init(filter: TransactionFilter, onApply: @escaping (TransactionFilter) -> Void) {
        _filter = State(initialValue: filter)
        self.onApply = onApply
    }

    var body: some View {
        NavigationStack {
            Form {
                FilterDateSection(filter: $filter)
                Section {
                    Picker("Account", selection: $filter.accountID) {
                        Text("Any").tag(String?.none)
                        ForEach(options.accounts) { account in
                            Text("\(account.name) · \(account.currency)").tag(Optional(account.id))
                        }
                    }
                    Picker("Category", selection: $filter.categoryID) {
                        Text("Any").tag(String?.none)
                        ForEach(options.categories, id: \.id) { category in
                            Text(category.name).tag(Optional(category.id))
                        }
                    }
                    NavigationLink(value: FilterRoute.tags) {
                        LabeledContent("Tags", value: filter.tagIDs.isEmpty ? String(localized: "Any") : "\(filter.tagIDs.count)")
                    }
                }
                FilterAmountSection(filter: $filter)
                Section {
                    Button("Clear filters", role: .destructive) { filter = filter.clearingDetails() }
                        .disabled(filter.detailCount == 0)
                }
            }
            .navigationTitle("Filters")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .cancel) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Apply", action: apply)
                }
            }
            .navigationDestination(for: FilterRoute.self) { _ in
                FilterTagsView(tags: options.tags, filter: $filter)
            }
            .task { await load() }
        }
    }

    private func load() async {
        guard let api = session.api else { return }
        await options.load(using: api)
    }

    private func apply() {
        onApply(filter)
        dismiss()
    }
}
