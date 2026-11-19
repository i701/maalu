import SwiftUI

struct PurchaseItemSection: View {
    @Binding var item: PurchaseItemDraft
    let number: Int
    let mode: TaxMode
    let rate: Decimal?
    let currency: String
    let onRemove: () -> Void

    var body: some View {
        Section {
            TextField("Name", text: $item.name)
            DecimalField("Quantity", value: $item.quantity)
            DecimalField("Price each in \(currency)", value: $item.price)
            NavigationLink(value: NameField.itemCategory(item.id)) {
                LabeledContent("Category", value: item.category.isEmpty ? String(localized: "Choose") : item.category)
            }
            if let line = item.line(mode: mode, rate: rate) {
                AmountRow {
                    Text("Line total")
                } amount: {
                    MoneyText(line.amount, currency: currency)
                }
                if let tax = line.tax {
                    AmountRow { Text("GST in it") } amount: { MoneyText(tax, currency: currency) }
                        .foregroundStyle(.secondary)
                }
            }
            Button("Remove Item", systemImage: "minus.circle", role: .destructive, action: onRemove)
        } header: {
            Text("Item \(number)")
        }
    }
}
