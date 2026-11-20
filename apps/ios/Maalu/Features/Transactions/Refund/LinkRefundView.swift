import SwiftUI

/// Turns income you already recorded into a refund of a purchase: choose the purchase it was for, and for one with items, the items.
struct LinkRefundView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: LinkRefundModel
    let onSaved: () -> Void

    init(income: Transaction, onSaved: @escaping () -> Void) {
        _model = State(initialValue: LinkRefundModel(income: income))
        self.onSaved = onSaved
    }

    var body: some View {
        @Bindable var model = model
        NavigationStack {
            List {
                Section {
                    Text("\(model.income.title) · \(MoneyFormat.string(model.income.amount, currency: model.income.currency)). Choose the purchase this money was for. It then counts as spending given back, not as income.")
                        .foregroundStyle(.secondary)
                }
                Section("Purchases") {
                    if let candidates = model.candidates {
                        ForEach(candidates) { purchase in
                            LinkRefundCandidateRow(purchase: purchase, isChosen: model.chosen?.id == purchase.id) { model.choose(purchase) }
                        }
                    } else {
                        ProgressView()
                    }
                }
                if model.candidates?.isEmpty == true {
                    Text("No purchase fits: it has to be in \(model.income.currency), on or before this date, with at least this much left to refund.")
                        .foregroundStyle(.secondary)
                }
                if !model.items.isEmpty, let chosen = model.chosen {
                    Section {
                        RefundItemRows(items: $model.items, currency: chosen.currency)
                    } header: {
                        Text("This purchase has items: tick the ones this money was for.")
                    } footer: {
                        Text("The items add up to \(MoneyFormat.string(RefundItem.total(model.items), currency: chosen.currency)); the money that came back is \(MoneyFormat.string(model.income.amount, currency: model.income.currency)).")
                            .foregroundStyle(model.itemsAddUp ? Color.secondary : Color.red)
                    }
                }
                if let message = model.errorMessage {
                    Text(message).foregroundStyle(.red)
                }
            }
            .searchable(text: $model.query, prompt: "Search purchases")
            .saving(model.isSaving)
            .navigationTitle("Link to a purchase")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .cancel) { dismiss() }.disabled(model.isSaving)
                }
                ToolbarItem(placement: .confirmationAction) {
                    SaveButton("Link", isSaving: model.isSaving, isEnabled: model.canLink, action: link)
                }
            }
            .task(id: model.query) {
                guard let api = session.api else { return }
                await model.search(using: api)
            }
        }
    }

    private func link() {
        Task {
            guard let api = session.api else { return }
            if await model.link(using: api) {
                onSaved()
                dismiss()
            }
        }
    }
}
