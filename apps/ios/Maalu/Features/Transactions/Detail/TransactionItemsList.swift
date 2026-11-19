import SwiftUI

/// A purchase's items, each with its quantity, category and line total.
struct TransactionItemsList: View {
    let items: [TransactionSplit]
    let currency: String

    var body: some View {
        Section("Items") {
            ForEach(items) { item in
                AmountRow {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(title(of: item))
                        Text(details(of: item))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                } amount: {
                    MoneyText(item.amount, currency: currency)
                }
            }
        }
    }

    /// "Rice × 2", or just the name for one.
    private func title(of item: TransactionSplit) -> String {
        let quantity = Money.decimal(item.quantity) ?? 1
        return quantity == 1 ? item.name : "\(item.name) × \(quantity.formatted())"
    }

    /// "Groceries · GST MVR 2.40".
    private func details(of item: TransactionSplit) -> String {
        guard let tax = item.taxAmount.flatMap(Money.decimal), tax > 0 else { return item.category }
        return String(localized: "\(item.category) · GST \(MoneyFormat.string(tax, currency: currency))")
    }
}
