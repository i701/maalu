import SwiftUI

/// Split a purchase into items: each with a quantity, a price and its own category, with GST included, excluded or none.
struct TransactionItemsSection: View {
    @Bindable var model: TransactionFormModel

    var body: some View {
        Section {
            Toggle("Split into items", isOn: $model.draft.isSplit)
                .onChange(of: model.draft.isSplit) { addFirstItem() }
            if model.draft.isSplit {
                Picker("GST", selection: $model.draft.taxMode) {
                    ForEach(TaxMode.allCases) { mode in
                        Text(mode.title).tag(mode)
                    }
                }
                if model.draft.taxMode != .none {
                    DecimalField("GST rate in %", value: $model.draft.taxRate)
                }
            }
        } footer: {
            if model.draft.isSplit {
                Text("The amount is the items' total, and the category the biggest item's.")
            }
        }
        if model.draft.isSplit {
            ForEach($model.draft.items) { $item in
                PurchaseItemSection(item: $item, number: number(of: item), mode: model.draft.taxMode, rate: model.draft.taxRate,
                                    currency: model.currency, onRemove: { remove(item) })
            }
            Section {
                Button("Add Item", systemImage: "plus", action: addItem)
                AmountRow { Text("Total").bold() } amount: { MoneyText(model.draft.itemsTotal, currency: model.currency).bold() }
            }
        }
    }

    private func number(of item: PurchaseItemDraft) -> Int {
        (model.draft.items.firstIndex { $0.id == item.id } ?? 0) + 1
    }

    private func addFirstItem() {
        if model.draft.isSplit && model.draft.items.isEmpty { addItem() }
    }

    /// A new item starts in the category typed so far, as most receipts are one kind of thing.
    private func addItem() {
        var item = PurchaseItemDraft()
        item.category = model.draft.items.last?.category ?? model.draft.category
        model.draft.items.append(item)
    }

    private func remove(_ item: PurchaseItemDraft) {
        model.draft.items.removeAll { $0.id == item.id }
    }
}
