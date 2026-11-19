import SwiftUI

struct GroupRow: View {
    let group: TransactionGroup

    var body: some View {
        AmountRow {
            VStack(alignment: .leading, spacing: 2) {
                Text(group.name)
                Text(details)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        } amount: {
            SignedMoneyText(value: Money.decimal(group.net) ?? 0, currency: group.currency)
        }
    }

    /// "4 transactions · 3 Nov – 19 Nov 2026".
    private var details: AttributedString {
        var text = AttributedString(localized: "^[\(group.transactionCount) transaction](inflect: true)")
        if let dates = GroupText.dates(from: group.dateFrom, to: group.dateTo) {
            text += AttributedString(" · \(dates)")
        }
        return text
    }
}
