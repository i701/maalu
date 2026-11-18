import SwiftUI

struct TransactionDetailsSection: View {
    @Bindable var model: TransactionFormModel

    var body: some View {
        Section {
            NavigationLink(value: NameField.category) {
                LabeledContent("Category", value: model.draft.category.isEmpty ? String(localized: "Choose") : model.draft.category)
            }
            NavigationLink(value: NameField.vendor) {
                LabeledContent("Vendor", value: model.draft.vendor.isEmpty ? String(localized: "None") : model.draft.vendor)
            }
            Picker("Paid with", selection: $model.draft.method) {
                ForEach(PaymentMethod.allCases) { method in
                    Text(method.title).tag(method)
                }
            }
            if model.draft.type == .expense, !model.accountCards.isEmpty {
                Picker("Card", selection: $model.draft.cardID) {
                    Text("None").tag(String?.none)
                    ForEach(model.accountCards) { card in
                        Text(card.label).tag(Optional(card.id))
                    }
                }
            }
        }
    }
}
